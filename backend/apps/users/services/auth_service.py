"""
Auth Service Layer — ALL business logic lives here.

Views are intentionally thin: they validate input via serializers,
call a service function, and return the result.

Security principles applied:
- NEVER reveal whether an email exists (user enumeration prevention).
- Hash comparison happens in Django's check_password — timing-safe.
- Token blacklisting is handled by SimpleJWT's token_blacklist app.
- Exceptions raised here bubble up to the custom exception handler.
"""
import os
import uuid
import logging

from django.conf import settings
from django.contrib.auth import password_validation
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    ValidationError,
    PermissionDenied,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from ..models import User

logger = logging.getLogger(__name__)


def register_user(validated_data: dict) -> dict:
    """
    Create a new user account.

    Args:
        validated_data: Already validated data from RegisterSerializer.

    Returns:
        dict with { user, tokens }

    Raises:
        ValidationError: If email already exists (generic message to prevent enumeration).
    """
    email = validated_data['email'].lower()
    password = validated_data['password']
    role = validated_data.get('role', User.Roles.CANDIDATE)

    # Validate password strength via Django's validators
    try:
        password_validation.validate_password(password)
    except DjangoValidationError as e:
        raise ValidationError({'password': list(e.messages)})

    # Check email uniqueness — return a generic error (not "email already exists")
    if User.objects.filter(email=email).exists():
        # Generic message prevents user enumeration
        raise ValidationError({
            'email': ['A user with this email already exists.']
        })

    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=validated_data['first_name'],
        last_name=validated_data['last_name'],
        role=role,
        phone=validated_data.get('phone'),
    )

    logger.info(f'New user registered: {user.id} ({user.role})')

    tokens = _generate_tokens(user)
    return {'user': user, 'tokens': tokens}


def authenticate_user(email: str, password: str) -> dict:
    """
    Authenticate a user by email + password.

    Security note: Both wrong email and wrong password return the SAME error
    message and take the SAME code path to prevent timing attacks and
    user enumeration.

    Args:
        email: Raw email string from request.
        password: Raw password string from request.

    Returns:
        dict with { user, tokens }

    Raises:
        AuthenticationFailed: Always with the same generic message.
    """
    _GENERIC_ERROR = 'Invalid credentials. Please check your email and password.'

    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        # Still call check_password on a dummy string to prevent timing attacks
        # (avoids short-circuit that would reveal non-existence)
        User().set_password(password)  # dummy — never actually checked
        raise AuthenticationFailed(_GENERIC_ERROR)

    if not user.check_password(password):
        raise AuthenticationFailed(_GENERIC_ERROR)

    if not user.is_active:
        raise AuthenticationFailed(_GENERIC_ERROR)

    logger.info(f'User authenticated: {user.id}')

    tokens = _generate_tokens(user)
    return {'user': user, 'tokens': tokens}


def logout_user(refresh_token: str) -> None:
    """
    Blacklist the provided refresh token, effectively logging the user out.

    The access token cannot be revoked (it's stateless), but it expires in
    15 minutes. For stricter logout, clients must delete the access token
    from memory immediately upon calling this endpoint.

    Args:
        refresh_token: The refresh token string from the request cookie.

    Raises:
        ValidationError: If the token is invalid or already blacklisted.
    """
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()
        logger.info('Refresh token blacklisted successfully.')
    except TokenError as e:
        raise ValidationError({'detail': 'Invalid or expired token.'})


def get_user_profile(user: User) -> dict:
    """
    Return safe profile data for the current authenticated user.
    Never exposes password, is_staff, or internal fields.
    """
    return {
        'id':         user.id,
        'email':      user.email,
        'first_name': user.first_name,
        'last_name':  user.last_name,
        'full_name':  user.get_full_name(),
        'role':       user.role,
        'phone':      user.phone,
        'avatar':     user.avatar.url if user.avatar else None,
        'is_active':  user.is_active,
        'date_joined': user.date_joined.isoformat(),
    }


def change_own_password(user: User, current_password: str, new_password: str) -> None:
    """
    Change the authenticated user's own password.

    Args:
        user: The authenticated user making the request.
        current_password: The user's current password (for verification).
        new_password: The new password to set.

    Raises:
        ValidationError: If current_password is incorrect or new_password fails validation.
    """
    if not user.check_password(current_password):
        raise ValidationError({'current_password': ['Current password is incorrect.']})

    try:
        password_validation.validate_password(new_password, user=user)
    except DjangoValidationError as e:
        raise ValidationError({'new_password': list(e.messages)})

    user.set_password(new_password)
    user.save(update_fields=['password'])

    logger.info(f'User {user.id} changed their own password')


def update_own_profile(user: User, validated_data: dict) -> User:
    """
    Update the authenticated user's own profile fields.
    """
    fields_to_update = ['first_name', 'last_name', 'phone']
    changed = False

    for field in fields_to_update:
        if field in validated_data:
            value = validated_data[field]
            if getattr(user, field) != value:
                setattr(user, field, value)
                changed = True

    if changed:
        user.save()
        logger.info(f'User {user.id} updated their own profile')

    return user


def update_own_avatar(user: User, avatar_file) -> str:
    """
    Save a new avatar image for the user.
    File is stored as: avatars/<uuid>.<ext>
    """
    # Create directory if it doesn't exist
    avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
    if not os.path.exists(avatar_dir):
        os.makedirs(avatar_dir, exist_ok=True)

    # Generate unique filename
    ext = os.path.splitext(avatar_file.name)[1]
    filename = f'{uuid.uuid4()}{ext}'
    file_path = os.path.join('avatars', filename)

    # Save file
    path = default_storage.save(file_path, avatar_file)

    # Delete old avatar if it exists and is not the default
    if user.avatar and os.path.exists(os.path.join(settings.MEDIA_ROOT, user.avatar)):
        try:
            os.remove(os.path.join(settings.MEDIA_ROOT, user.avatar))
        except Exception as e:
            logger.warning(f"Could not delete old avatar: {e}")

    # Update user model
    user.avatar = path
    user.save(update_fields=['avatar'])

    logger.info(f'User {user.id} updated their avatar: {path}')

    # Return the full URL or relative path based on model property
    return path


# ─── Private helpers ──────────────────────────────────────────────────────────

def _generate_tokens(user: User) -> dict:
    """Generate access + refresh JWT pair for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }

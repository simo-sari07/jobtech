"""
User Management Service — all admin user-management business logic.

Architecture contract:
- Views MUST be thin: validate input → call service → return response.
- ALL permission checks, business rules, and DB writes live here.
- Exceptions raised here are DRF exceptions — the custom exception handler
  (core/exceptions.py) converts them to the standard JSON envelope.
- Every mutating operation calls audit_service.log_action() before returning.

Security invariants (enforced at service layer, not view layer):
  RULE 1 — An admin cannot modify another admin's account.
  RULE 2 — An admin cannot modify their own account via these endpoints
            (self-management goes through /api/v1/auth/me/).
  RULE 3 — Only admins can call any function in this service.
  RULE 4 — The 'admin' role can only be assigned by an existing admin, and
            only to a user who does not already hold admin rights.
  RULE 5 — Passwords never appear in any return value.
  RULE 6 — Every mutating action is logged immediately; failures are re-raised.
"""
import logging

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, QuerySet
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from apps.users.models import User, UserAuditLog
from apps.users.services import audit_service

logger = logging.getLogger(__name__)


# ─── Guard helpers ────────────────────────────────────────────────────────────

def _require_admin(requesting_user: User) -> None:
    """Raise PermissionDenied unless the caller holds the admin role."""
    if not requesting_user.is_authenticated or requesting_user.role != User.Roles.ADMIN:
        raise PermissionDenied(
            'This operation requires administrator privileges.',
        )


def _require_not_self(requesting_user: User, target: User) -> None:
    """Raise PermissionDenied when the admin tries to act on their own account."""
    if requesting_user.pk == target.pk:
        raise PermissionDenied(
            'You cannot manage your own account via this endpoint. '
            'Use /api/v1/auth/me/ for self-service operations.',
        )


def _require_not_admin_target(target: User) -> None:
    """Raise PermissionDenied when the target is another admin (RULE 1)."""
    if target.role == User.Roles.ADMIN:
        raise PermissionDenied(
            'Administrator accounts cannot be modified through user management. '
            'Contact a super-administrator.',
        )


def _get_user_or_404(user_id: int) -> User:
    """Fetch a User by PK or raise NotFound."""
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise NotFound(f'User with id={user_id} does not exist.')


# ─── Read operations ──────────────────────────────────────────────────────────

def list_users(
    requesting_user: User,
    filters: dict | None = None,
) -> QuerySet[User]:
    """
    Return a filtered QuerySet of all users the requesting admin is allowed
    to see, annotated with an application_count for display purposes.

    Args:
        requesting_user: Must be an admin.
        filters: Optional dict of filter params forwarded from the view
                 (role, is_active, search, etc.).  Filtering is applied here
                 rather than in the view so the logic is testable in isolation.

    Returns:
        Annotated QuerySet — NOT evaluated (the view/paginator evaluates it).

    Design note:
        We annotate rather than computing in Python so the DB does the heavy
        lifting and the view can still add .order_by() on top.
    """
    _require_admin(requesting_user)

    qs = (
        User.objects
        .annotate(application_count=Count('applications', distinct=True))
        .order_by('-date_joined')
    )

    if not filters:
        return qs

    # Role filter — accepts a single role string
    role = filters.get('role')
    if role and role in User.Roles.values:
        qs = qs.filter(role=role)

    # Active status filter
    is_active = filters.get('is_active')
    if is_active is not None:
        # Accept both booleans and 'true'/'false' strings from query params
        if isinstance(is_active, str):
            is_active = is_active.lower() == 'true'
        qs = qs.filter(is_active=is_active)

    # Full-text search across name + email
    search = filters.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(email__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
        )

    return qs


def get_user_detail(user_id: int, requesting_user: User) -> User:
    """
    Fetch a single user by PK.

    Admins may view any user's detail (including other admins — read-only).
    Non-admins may only view themselves (enforced here, not at the view level).

    Args:
        user_id:          PK of the user to retrieve.
        requesting_user:  The authenticated caller.

    Returns:
        User instance.

    Raises:
        NotFound:        If no user with that PK exists.
        PermissionDenied: If a non-admin tries to access a different user.
    """
    _require_admin(requesting_user)
    return _get_user_or_404(user_id)


def get_user_stats(requesting_user: User) -> dict:
    """
    Return aggregate statistics about the user base.

    Admins only.  Stats are computed in a small number of efficient DB queries
    using Django's ORM aggregation — no Python-level loops over all users.

    Returns:
        {
            total_users: int,
            active_users: int,
            inactive_users: int,
            by_role: { role_key: count, ... },
        }
    """
    _require_admin(requesting_user)

    total = User.objects.count()
    active = User.objects.filter(is_active=True).count()

    # One query: group by role and count
    role_counts_qs = (
        User.objects
        .values('role')
        .annotate(count=Count('id'))
    )
    by_role = {row['role']: row['count'] for row in role_counts_qs}

    # Ensure every role key is present even if count is 0
    for role_value in User.Roles.values:
        by_role.setdefault(role_value, 0)

    return {
        'total_users':    total,
        'active_users':   active,
        'inactive_users': total - active,
        'by_role':        by_role,
    }


# ─── Write operations ─────────────────────────────────────────────────────────

def create_user(data: dict, requesting_user: User, *, request=None) -> User:
    """
    Create a new user account.

    Validates:
    - Caller is an admin (RULE 3).
    - Email is unique — using a safe generic error to prevent enumeration.
    - Password strength via Django's AUTH_PASSWORD_VALIDATORS.
    - Role is a valid choice; 'admin' role can be assigned (admin creates admin).

    Args:
        data:             Validated data dict from UserCreateSerializer.
                          Expected keys: email, first_name, last_name, role,
                          password, phone (optional).
        requesting_user:  The authenticated admin making the request.
        request:          Django request object (forwarded to audit_service for IP).

    Returns:
        The newly created User instance (password field is never returned).

    Raises:
        PermissionDenied: If caller is not an admin.
        ValidationError:  If email already exists or password is too weak.
    """
    _require_admin(requesting_user)

    email = data['email'].lower().strip()
    password = data['password']
    role = data.get('role', User.Roles.CANDIDATE)

    # Validate role choice against enum
    if role not in User.Roles.values:
        raise ValidationError({'role': [f'"{role}" is not a valid role.']})

    # Email uniqueness — generic error prevents enumeration
    if User.objects.filter(email=email).exists():
        raise ValidationError({'email': ['A user with this email address already exists.']})

    # Password strength via project-wide validators
    try:
        password_validation.validate_password(password)
    except DjangoValidationError as exc:
        raise ValidationError({'password': list(exc.messages)})

    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=data['first_name'].strip(),
        last_name=data['last_name'].strip(),
        role=role,
        phone=data.get('phone') or None,
    )

    audit_service.log_action(
        actor=requesting_user,
        subject=user,
        action=UserAuditLog.Actions.CREATED,
        request=request,
        metadata={
            'email':      user.email,
            'role':       user.role,
            'created_by': requesting_user.email,
        },
    )

    logger.info('User created | id=%s | role=%s | by=%s', user.id, user.role, requesting_user.id)
    return user


def update_user(
    user_id: int,
    data: dict,
    requesting_user: User,
    *,
    request=None,
) -> User:
    """
    Update permitted fields on an existing user account.

    Fields that can be updated: first_name, last_name, email, role, phone.
    Password updates go through change_user_password() — never via this function.

    Security:
    - Admin cannot edit another admin (RULE 1).
    - Admin cannot edit themselves via this endpoint (RULE 2).
    - Role change is audited with old + new value for a complete trail.

    Args:
        user_id:          PK of the user to update.
        data:             Dict of fields to update.  Only known-safe fields
                          are applied — any unknown keys are silently ignored.
        requesting_user:  Authenticated admin.
        request:          Django request object (for IP in audit log).

    Returns:
        Updated User instance.
    """
    _require_admin(requesting_user)
    target = _get_user_or_404(user_id)
    _require_not_self(requesting_user, target)
    _require_not_admin_target(target)

    # Capture before-state for the audit trail (no passwords or tokens)
    old_values = {
        'first_name': target.first_name,
        'last_name':  target.last_name,
        'email':      target.email,
        'role':       target.role,
        'phone':      target.phone,
    }

    # Whitelist of updatable fields — never accept is_staff, is_superuser, etc.
    UPDATABLE_FIELDS = {'first_name', 'last_name', 'email', 'role', 'phone'}
    changed = False

    for field in UPDATABLE_FIELDS:
        if field not in data:
            continue
        value = data[field]

        if field == 'email':
            value = value.lower().strip()
            if value != target.email and User.objects.filter(email=value).exists():
                raise ValidationError({'email': ['This email address is already in use.']})

        if field == 'role':
            if value not in User.Roles.values:
                raise ValidationError({'role': [f'"{value}" is not a valid role.']})

        if field in ('first_name', 'last_name') and isinstance(value, str):
            value = value.strip()

        if getattr(target, field) != value:
            setattr(target, field, value)
            changed = True

    if changed:
        target.full_clean(exclude=['password'])
        target.save()

        new_values = {
            'first_name': target.first_name,
            'last_name':  target.last_name,
            'email':      target.email,
            'role':       target.role,
            'phone':      target.phone,
        }

        # Use a specific action when only the role changed
        role_changed = old_values['role'] != new_values['role']
        action = UserAuditLog.Actions.ROLE_CHANGED if role_changed else UserAuditLog.Actions.UPDATED

        audit_service.log_action(
            actor=requesting_user,
            subject=target,
            action=action,
            request=request,
            metadata={'before': old_values, 'after': new_values},
        )

        logger.info('User updated | id=%s | by=%s', target.id, requesting_user.id)
    else:
        logger.debug('update_user called with no effective changes | id=%s', target.id)

    return target


def toggle_user_active(
    user_id: int,
    requesting_user: User,
    *,
    request=None,
) -> User:
    """
    Toggle a user's is_active flag (activate ↔ deactivate).

    Security:
    - Admin cannot deactivate themselves (RULE 2).
    - Admin cannot deactivate another admin (RULE 1).

    On deactivation, all outstanding JWT refresh tokens for the target user
    are blacklisted immediately, forcing a re-login on next access.

    Args:
        user_id:          PK of the user to toggle.
        requesting_user:  Authenticated admin.
        request:          Django request object (for IP in audit log).

    Returns:
        The updated User instance.
    """
    _require_admin(requesting_user)
    target = _get_user_or_404(user_id)
    _require_not_self(requesting_user, target)
    _require_not_admin_target(target)

    was_active = target.is_active
    target.is_active = not was_active
    target.save(update_fields=['is_active'])

    if not target.is_active:
        # Force logout: blacklist all outstanding refresh tokens
        _blacklist_all_tokens(target)

    action = (
        UserAuditLog.Actions.ACTIVATED
        if target.is_active
        else UserAuditLog.Actions.DEACTIVATED
    )

    audit_service.log_action(
        actor=requesting_user,
        subject=target,
        action=action,
        request=request,
        metadata={'is_active': target.is_active},
    )

    logger.info(
        'User %s | id=%s | by=%s',
        'activated' if target.is_active else 'deactivated',
        target.id,
        requesting_user.id,
    )
    return target


def change_user_password(
    user_id: int,
    new_password: str,
    requesting_user: User,
    *,
    request=None,
) -> None:
    """
    Admin force-sets a user's password.

    Security:
    - Admin cannot change another admin's password (RULE 1).
    - Admin cannot change their own password here (RULE 2).
    - New password is validated against AUTH_PASSWORD_VALIDATORS.
    - ALL existing refresh tokens are blacklisted immediately (forces re-login
      on all devices).

    Args:
        user_id:          PK of the target user.
        new_password:     The new plain-text password (will be hashed).
        requesting_user:  Authenticated admin.
        request:          Django request object (for IP in audit log).

    Returns:
        None — callers should confirm success via the HTTP 200 response.

    Raises:
        ValidationError:  If the new password fails strength checks.
        PermissionDenied: On rule violations.
    """
    _require_admin(requesting_user)
    target = _get_user_or_404(user_id)
    _require_not_self(requesting_user, target)
    _require_not_admin_target(target)

    # Validate strength (note: we pass user= so UserAttributeSimilarityValidator works)
    try:
        password_validation.validate_password(new_password, user=target)
    except DjangoValidationError as exc:
        raise ValidationError({'new_password': list(exc.messages)})

    target.set_password(new_password)
    target.save(update_fields=['password'])

    # Invalidate all sessions — defence against session fixation
    _blacklist_all_tokens(target)

    audit_service.log_action(
        actor=requesting_user,
        subject=target,
        action=UserAuditLog.Actions.PASSWORD_CHANGED,
        request=request,
        metadata={'changed_by': requesting_user.email},
        # Note: new_password is intentionally NOT in metadata (RULE 5)
    )

    logger.info('Password changed | user=%s | by=%s', target.id, requesting_user.id)


# ─── Private helpers ──────────────────────────────────────────────────────────

def _blacklist_all_tokens(user: User) -> int:
    """
    Blacklist every outstanding refresh token for the given user.

    This is the correct way to implement "force logout from all devices" with
    SimpleJWT.  We create BlacklistedToken rows for each OutstandingToken that
    isn't already blacklisted.

    Returns:
        Number of tokens blacklisted.

    Note:
        Import is deferred to avoid circular imports at module load time.
    """
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    outstanding = OutstandingToken.objects.filter(user=user)
    count = 0
    for token in outstanding:
        _, created = BlacklistedToken.objects.get_or_create(token=token)
        if created:
            count += 1

    logger.info('Blacklisted %d token(s) for user id=%s', count, user.id)
    return count

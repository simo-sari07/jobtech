"""
Serializers for the users app.

Responsibilities:
- Input validation ONLY (no business logic).
- Field-level and object-level validation.
- Serialization of safe output data.
"""
from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.Serializer):
    """Validates registration input before handing off to auth_service."""

    email      = serializers.EmailField(max_length=255)
    password   = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
        style={'input_type': 'password'},
    )
    first_name = serializers.CharField(max_length=100)
    last_name  = serializers.CharField(max_length=100)
    role       = serializers.ChoiceField(
        choices=User.Roles.choices,
        default=User.Roles.CANDIDATE,
    )
    phone      = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate_email(self, value: str) -> str:
        return value.lower().strip()

    def validate_first_name(self, value: str) -> str:
        return value.strip()

    def validate_last_name(self, value: str) -> str:
        return value.strip()


class LoginSerializer(serializers.Serializer):
    """Validates login credentials — no DB lookups here."""

    email    = serializers.EmailField(max_length=255)
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate_email(self, value: str) -> str:
        return value.lower().strip()


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for safe user profile output.
    Explicitly excludes: password, is_staff, is_superuser, groups, user_permissions.
    """
    full_name  = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'phone',
            'avatar_url',
            'is_active',
            'date_joined',
        ]
        read_only_fields = fields

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name()

    def get_avatar_url(self, obj: User) -> str | None:
        return obj.avatar


class TokenResponseSerializer(serializers.Serializer):
    """Structure of the token pair returned on login/register."""
    access  = serializers.CharField(read_only=True)
    # Refresh token is set as httpOnly cookie — NOT returned in body


# ─────────────────────────────────────────────────────────────────────────────
# User Management Serializers (admin-only endpoints)
#
# Contract with the service layer:
#   - These serializers validate and normalise input.
#   - They do NOT create/update DB records.
#   - They do NOT enforce role-based permissions.
#   - They do NOT call any service function.
#   - validated_data is passed directly to the appropriate service function.
# ─────────────────────────────────────────────────────────────────────────────

class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for the paginated admin user list.

    Computed fields (is_online, online_status) are derived from last_activity
    via model properties — no extra DB queries.  The QuerySet is annotated
    with application_count by the service layer before reaching here.

    Sensitive fields omitted: password, is_staff, is_superuser,
                              groups, user_permissions.
    """
    full_name      = serializers.SerializerMethodField()
    is_online      = serializers.SerializerMethodField()
    online_status  = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'is_active',
            'is_online',
            'online_status',
            'last_activity',
            'date_joined',
        ]
        read_only_fields = fields

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name()

    def get_is_online(self, obj: User) -> bool:
        """Delegates to the model property — no extra query."""
        return obj.is_online

    def get_online_status(self, obj: User) -> str:
        """Returns 'online' | 'away' | 'offline' from the model property."""
        return obj.online_status


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Full user detail for the admin user-detail endpoint.

    Includes every safe field; excludes password, is_staff, is_superuser,
    groups, and user_permissions.  All fields are read-only because mutations
    go through UserUpdateSerializer and other purpose-built serializers.
    """
    full_name     = serializers.SerializerMethodField()
    is_online     = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'phone',
            'avatar',
            'is_active',
            'is_online',
            'online_status',
            'last_activity',
            'date_joined',
        ]
        read_only_fields = fields

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name()

    def get_is_online(self, obj: User) -> bool:
        return obj.is_online

    def get_online_status(self, obj: User) -> str:
        return obj.online_status


class UserCreateSerializer(serializers.Serializer):
    """
    Validates admin-initiated user creation.

    Validation strategy:
    - email: normalised to lowercase + stripped; uniqueness checked here so
             the error is surfaced as a 400 field error before reaching the
             service.  The service re-checks for race-condition safety.
    - password: Django's AUTH_PASSWORD_VALIDATORS are invoked via
                validate_password().  A temporary User object is constructed
                (never saved) so UserAttributeSimilarityValidator can compare
                against the submitted email.
    - role: validated against User.Roles enum; defaults to 'candidate'.
    - phone: optional; empty strings are normalised to None.

    Fields NOT included: is_active, is_staff, is_superuser.
    Admins cannot set is_active on creation — new accounts are always active.
    """
    email      = serializers.EmailField(max_length=255)
    password   = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128,
        style={'input_type': 'password'},
    )
    first_name = serializers.CharField(max_length=100, trim_whitespace=True)
    last_name  = serializers.CharField(max_length=100, trim_whitespace=True)
    role       = serializers.ChoiceField(
        choices=User.Roles.choices,
        default=User.Roles.CANDIDATE,
    )
    phone      = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
        default=None,
    )

    def validate_email(self, value: str) -> str:
        normalised = value.lower().strip()
        if User.objects.filter(email=normalised).exists():
            # Generic phrasing — does not confirm whether the account belongs
            # to an active user (prevents admin-side enumeration via error text).
            raise serializers.ValidationError(
                'A user with this email address already exists.'
            )
        return normalised

    def validate_password(self, value: str) -> str:
        from django.contrib.auth import password_validation
        from django.core.exceptions import ValidationError as DjangoValidationError

        # Build a transient User so similarity checks work against the email.
        # This object is NEVER saved.
        email = self.initial_data.get('email', '')
        dummy = User(email=email.lower().strip())
        try:
            password_validation.validate_password(value, user=dummy)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_phone(self, value) -> str | None:
        """Normalise blank strings to None."""
        if not value:
            return None
        return value.strip()


class UserUpdateSerializer(serializers.Serializer):
    """
    Validates partial updates to a user's profile.

    Design:
    - All fields are optional (PATCH semantics).
    - Only the fields listed here can be changed via this endpoint.
      Unknown fields in the request body are silently ignored by DRF's
      Serializer (not ModelSerializer), making the whitelist explicit.
    - Password changes go through PasswordChangeSerializer — never here.
    - is_active changes go through the toggle-active endpoint — not here.
      (Separating these creates a clearer audit trail.)
    """
    first_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
        required=False,
    )
    last_name  = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
        required=False,
    )
    email      = serializers.EmailField(
        max_length=255,
        required=False,
    )
    role       = serializers.ChoiceField(
        choices=User.Roles.choices,
        required=False,
    )
    phone      = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate_email(self, value: str) -> str:
        """
        Normalise and check uniqueness, but only if the email differs
        from the current user's email (the view passes the target user
        via context so we can make this comparison).
        """
        normalised = value.lower().strip()
        target = self.context.get('target_user')
        if target and normalised == target.email:
            return normalised  # No change — skip uniqueness query
        if User.objects.filter(email=normalised).exists():
            raise serializers.ValidationError(
                'This email address is already in use by another account.'
            )
        return normalised

    def validate_role(self, value: str) -> str:
        if value not in User.Roles.values:
            raise serializers.ValidationError(
                f'"{value}" is not a valid role. '
                f'Choose from: {", ".join(User.Roles.values)}.'
            )
        return value

    def validate_phone(self, value) -> str | None:
        if not value:
            return None
        return value.strip()


class PasswordChangeSerializer(serializers.Serializer):
    """
    Validates an admin's request to force-set another user's password.

    The new password is validated against AUTH_PASSWORD_VALIDATORS with
    the target user passed to validate_password() so the similarity
    validator can compare against the target's email address — not the
    requesting admin's.

    The target user MUST be passed via serializer context:
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'target_user': target_user},
        )

    Fields:
        new_password — the new plain-text password (hashing done in service).

    Intentionally omits confirm_password: double-entry confirmation is a
    UX concern handled in the frontend schema (Zod).  The API accepts one
    field for simplicity and idempotency.
    """
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128,
        style={'input_type': 'password'},
    )

    def validate_new_password(self, value: str) -> str:
        from django.contrib.auth import password_validation
        from django.core.exceptions import ValidationError as DjangoValidationError

        target = self.context.get('target_user')
        try:
            password_validation.validate_password(value, user=target)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class SelfPasswordChangeSerializer(serializers.Serializer):
    """
    Validates a user's request to change their own password.

    Requires:
        current_password — must match the user's current password
        new_password — validated against AUTH_PASSWORD_VALIDATORS

    The requesting user is passed via serializer context:
        serializer = SelfPasswordChangeSerializer(
            data=request.data,
            context={'user': request.user},
        )
    """
    current_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        max_length=128,
        style={'input_type': 'password'},
    )

    def validate_current_password(self, value: str) -> str:
        user = self.context.get('user')
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate_new_password(self, value: str) -> str:
        from django.contrib.auth import password_validation
        from django.core.exceptions import ValidationError as DjangoValidationError

        user = self.context.get('user')
        try:
            password_validation.validate_password(value, user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value


class UserAuditLogSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for UserAuditLog entries.

    actor_display and subject_display are resolved to human-readable strings
    here (name + email) so the frontend doesn't need to make additional
    requests.  The raw FK ids are also exposed for programmatic use.

    user_agent is excluded from the list view (potentially large string);
    include it explicitly if you build a detail endpoint.
    """
    actor_display   = serializers.SerializerMethodField()
    subject_display = serializers.SerializerMethodField()

    class Meta:
        from .models import UserAuditLog
        model  = UserAuditLog
        fields = [
            'id',
            'action',
            'actor_display',
            'subject_display',
            'ip_address',
            'metadata',
            'created_at',
        ]
        read_only_fields = fields

    def get_actor_display(self, obj) -> str | None:
        if obj.actor is None:
            return None  # Actor account was deleted
        return f'{obj.actor.get_full_name()} <{obj.actor.email}>'

    def get_subject_display(self, obj) -> str | None:
        if obj.subject is None:
            return None  # Subject account was deleted
        return f'{obj.subject.get_full_name()} <{obj.subject.email}>'


class SelfProfileUpdateSerializer(serializers.Serializer):
    """
    Validates a user's request to update their own profile.

    Fields:
        first_name — optional
        last_name  — optional
        phone      — optional (normalised to None if empty)
    """
    first_name = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
        required=False,
    )
    last_name  = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
        required=False,
    )
    phone      = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate_phone(self, value) -> str | None:
        if not value:
            return None
        return value.strip()

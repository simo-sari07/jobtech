"""
Custom User model for JobTech Solutions.

Design decisions:
- Email is the login identifier (no username field) — cleaner UX for a B2B SaaS.
- Role stored directly on User (not a separate group/profile) for simplicity at Phase 1.
  If roles need granular permissions in Phase 3, migrate to django-guardian.
- AbstractBaseUser gives full control; PermissionsMixin adds is_superuser/groups.
- BigAutoField PK for future-proofing (MySQL default would be INT).
- UserAuditLog uses a UUID PK to prevent sequential ID enumeration and to allow
  distributed log writes without coordination.
"""
import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager: email-based create_user and create_superuser."""

    def _create_user(self, email: str, password: str, **extra_fields):
        if not email:
            raise ValueError('Email address is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str = None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('role', User.Roles.CANDIDATE)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Roles.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Enterprise User model.

    Fields:
        email       — unique login identifier
        role        — one of admin | hr_manager | recruiter | candidate
        first_name  — displayed in UI / emails
        last_name   — displayed in UI / emails
        phone       — optional contact number
        avatar      — optional profile picture path
        is_active   — soft-disable without deleting
        date_joined — auto-set at account creation
    """

    class Roles(models.TextChoices):
        ADMIN       = 'admin',       'Administrator'
        HR_MANAGER  = 'hr_manager',  'HR Manager'
        RECRUITER   = 'recruiter',   'Recruiter'
        CANDIDATE   = 'candidate',   'Candidate'

    email = models.EmailField(
        unique=True,
        max_length=255,
        verbose_name='Email address',
    )
    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.CANDIDATE,
        db_index=True,
    )
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    phone      = models.CharField(max_length=20, blank=True, null=True)
    avatar     = models.CharField(max_length=255, blank=True, null=True)

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)   # Needed for Django Admin

    date_joined    = models.DateTimeField(default=timezone.now)
    last_activity  = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Last activity',
        help_text='Timestamp of the user\'s most recent authenticated API request. '
                  'Updated by OnlinePresenceMiddleware — not set manually.',
    )

    objects = UserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.get_full_name()} <{self.email}>'

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def get_short_name(self):
        return self.first_name

    @property
    def is_admin(self):
        return self.role == self.Roles.ADMIN

    @property
    def is_hr_manager(self):
        return self.role == self.Roles.HR_MANAGER

    @property
    def is_recruiter(self):
        return self.role == self.Roles.RECRUITER

    @property
    def is_candidate(self):
        return self.role == self.Roles.CANDIDATE

    # ── Online presence ───────────────────────────────────────────────────────

    _ONLINE_THRESHOLD  = timedelta(seconds=60)   # < 60s  → "online"
    _AWAY_THRESHOLD    = timedelta(minutes=5)    # < 5min → "away"

    @property
    def is_online(self) -> bool:
        """
        True when the user has made an authenticated API request within the
        last 60 seconds (as tracked by OnlinePresenceMiddleware).

        Computed at read-time — never stored in the database.
        """
        if self.last_activity is None:
            return False
        return (timezone.now() - self.last_activity) < self._ONLINE_THRESHOLD

    @property
    def online_status(self) -> str:
        """
        Returns one of: 'online' | 'away' | 'offline'

        - online : last_activity < 60 seconds ago
        - away   : last_activity < 5 minutes ago
        - offline: last_activity >= 5 minutes ago, or None
        """
        if self.last_activity is None:
            return 'offline'
        elapsed = timezone.now() - self.last_activity
        if elapsed < self._ONLINE_THRESHOLD:
            return 'online'
        if elapsed < self._AWAY_THRESHOLD:
            return 'away'
        return 'offline'


# ─── Audit ────────────────────────────────────────────────────────────────────

class UserAuditLog(models.Model):
    """
    Immutable, append-only log of every admin action performed on a user account.

    Design decisions:
    - UUID primary key: prevents sequential ID enumeration of log entries and
      allows distributed/async writes without coordination.
    - actor  : the admin who performed the action (SET_NULL so logs survive
               if the admin account is later deleted).
    - subject: the user being acted upon (SET_NULL for the same reason).
    - metadata: flexible JSONField for before/after values — schema-free means
                 no migration required when new action types are added.
    - created_at is auto_now_add — the log is immutable after creation.
    - save() and delete() raise PermissionError to enforce immutability at the
      ORM layer (defence-in-depth on top of view/service-level restrictions).
    """

    class Actions(models.TextChoices):
        CREATED          = 'created',          'User Created'
        UPDATED          = 'updated',          'Profile Updated'
        PASSWORD_CHANGED = 'password_changed', 'Password Changed'
        ACTIVATED        = 'activated',        'Account Activated'
        DEACTIVATED      = 'deactivated',      'Account Deactivated'
        DELETED          = 'deleted',          'Account Deleted'
        ROLE_CHANGED     = 'role_changed',     'Role Changed'
        LOGIN            = 'login',            'User Logged In'
        LOGOUT           = 'logout',           'User Logged Out'
        FAILED_LOGIN     = 'failed_login',     'Failed Login Attempt'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    actor = models.ForeignKey(
        'users.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_actions_performed',
        verbose_name='Performed by',
        help_text='Admin who triggered this action. Null if the account was deleted.',
    )
    subject = models.ForeignKey(
        'users.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_log',
        verbose_name='Target user',
        help_text='User account this action was performed on.',
    )
    action = models.CharField(
        max_length=30,
        choices=Actions.choices,
        db_index=True,
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP address',
    )
    user_agent = models.TextField(blank=True, default='')
    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text='Arbitrary before/after values. MUST NEVER contain passwords or tokens.',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table  = 'users_audit_log'
        verbose_name = 'User Audit Log'
        verbose_name_plural = 'User Audit Logs'
        ordering  = ['-created_at']
        indexes   = [
            models.Index(fields=['actor',   'created_at']),
            models.Index(fields=['subject', 'created_at']),
            models.Index(fields=['action',  'created_at']),
        ]

    def __str__(self):
        actor_repr   = str(self.actor)   if self.actor   else '(deleted)'
        subject_repr = str(self.subject) if self.subject else '(deleted)'
        return f'[{self.action}] {actor_repr} → {subject_repr} @ {self.created_at}'

    # ── Immutability guards ───────────────────────────────────────────────────

    def save(self, *args, **kwargs):
        """Audit logs are written once and never modified."""
        if self.pk and UserAuditLog.objects.filter(pk=self.pk).exists():
            raise PermissionError(
                'UserAuditLog entries are immutable and cannot be updated.'
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # noqa: D102
        raise PermissionError(
            'UserAuditLog entries cannot be deleted. They are a permanent audit trail.'
        )

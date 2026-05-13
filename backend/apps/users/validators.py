"""
Custom password validators for JobTech Solutions.

These supplement Django's built-in validators (MinimumLength, CommonPassword,
NumericPassword) which are already registered in AUTH_PASSWORD_VALIDATORS.

All validators follow Django's validator interface:
  validate(password, user=None)   — raises ValidationError if invalid
  get_help_text()                 — returns a human-readable requirement string
"""
import re
from django.core.exceptions import ValidationError


class UppercaseValidator:
    """Password must contain at least one uppercase letter (A–Z)."""

    def validate(self, password: str, user=None) -> None:
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                'Password must contain at least one uppercase letter.',
                code='password_no_upper',
            )

    def get_help_text(self) -> str:
        return 'Your password must contain at least one uppercase letter.'


class LowercaseValidator:
    """Password must contain at least one lowercase letter (a–z)."""

    def validate(self, password: str, user=None) -> None:
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                'Password must contain at least one lowercase letter.',
                code='password_no_lower',
            )

    def get_help_text(self) -> str:
        return 'Your password must contain at least one lowercase letter.'


class SpecialCharacterValidator:
    """Password must contain at least one special character."""

    SPECIAL_CHARS = r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]'

    def validate(self, password: str, user=None) -> None:
        if not re.search(self.SPECIAL_CHARS, password):
            raise ValidationError(
                'Password must contain at least one special character (e.g. !@#$%^&*).',
                code='password_no_special',
            )

    def get_help_text(self) -> str:
        return 'Your password must contain at least one special character.'

"""
Custom password validators used in addition to Django's built-ins.
Registered in settings.AUTH_PASSWORD_VALIDATORS.
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class PasswordComplexityValidator:
    """
    Require at least one uppercase letter, one lowercase letter,
    and one digit. Encourages strong passwords without being overly
    restrictive (no special-char requirement to keep UX friendly).
    """

    def validate(self, password, user=None):
        errors = []

        if not re.search(r'[A-Z]', password):
            errors.append(
                ValidationError(
                    _('Password must contain at least one uppercase letter.'),
                    code='password_no_uppercase',
                )
            )
        if not re.search(r'[a-z]', password):
            errors.append(
                ValidationError(
                    _('Password must contain at least one lowercase letter.'),
                    code='password_no_lowercase',
                )
            )
        if not re.search(r'\d', password):
            errors.append(
                ValidationError(
                    _('Password must contain at least one digit.'),
                    code='password_no_digit',
                )
            )

        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            'Your password must contain at least one uppercase letter, '
            'one lowercase letter, and one digit.'
        )

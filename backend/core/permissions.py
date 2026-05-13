"""
Global DRF permission classes used across multiple apps.
App-specific permissions (e.g. IsSelf) live in apps/users/permissions.py.
"""
from rest_framework.permissions import BasePermission

from apps.users.models import User


class IsAdmin(BasePermission):
    """Allow access only to users with the 'admin' role."""
    message = 'This action requires administrator privileges.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Roles.ADMIN
        )


class IsHRManager(BasePermission):
    """Allow access only to HR managers (and admins)."""
    message = 'This action requires HR manager privileges.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Roles.ADMIN, User.Roles.HR_MANAGER)
        )


class IsRecruiter(BasePermission):
    """Allow access only to recruiters (and admins / HR managers)."""
    message = 'This action requires recruiter privileges.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (
                User.Roles.ADMIN,
                User.Roles.HR_MANAGER,
                User.Roles.RECRUITER,
            )
        )


class IsCandidate(BasePermission):
    """Allow access only to candidates."""
    message = 'This action is only available to candidates.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Roles.CANDIDATE
        )

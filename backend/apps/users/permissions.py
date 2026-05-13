"""
App-level permission classes for the users app.

Global role permissions (IsAdmin, IsHRManager, IsRecruiter, IsCandidate)
live in core/permissions.py since they're used across all apps.

This file contains object-level permissions specific to users.
"""
from rest_framework.permissions import BasePermission


class IsSelf(BasePermission):
    """
    Object-level permission — only the owner of a user object can modify it.
    Admins can also access any user object.
    """
    message = 'You can only modify your own profile.'

    def has_object_permission(self, request, view, obj):
        from apps.users.models import User

        # Admins bypass — they can access any user
        if request.user.role == User.Roles.ADMIN:
            return True

        # Owner check
        return obj == request.user

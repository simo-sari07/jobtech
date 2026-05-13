"""
User Management service.
Handles administrative business logic for users.
"""
from django.db.models import QuerySet
from apps.users.models import User

def list_users() -> QuerySet[User]:
    """Return a queryset of all users."""
    return User.objects.all()

def admin_create_user(validated_data: dict) -> User:
    """Create a user with explicit admin control."""
    password = validated_data.pop('password', None)
    user = User(**validated_data)
    if password:
        user.set_password(password)
    user.save()
    return user

def admin_update_user(user: User, validated_data: dict) -> User:
    """Update user fields."""
    password = validated_data.pop('password', None)
    for attr, value in validated_data.items():
        setattr(user, attr, value)
    if password:
        user.set_password(password)
    user.save()
    return user

def admin_delete_user(user: User) -> None:
    """Soft delete user."""
    user.is_active = False
    user.save()

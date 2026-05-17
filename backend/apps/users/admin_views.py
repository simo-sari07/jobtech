"""
Admin User Management Views — intentionally thin.

Architecture contract (mirrors auth/views.py):
  1. Parse & validate input with the appropriate serializer.
  2. Call one service function.
  3. Serialize the result with the appropriate output serializer.
  4. Return a standard { success, data } response.

No business logic lives here.  No permission logic lives here (that's
in core/permissions.py + the service layer).  No DB access lives here.

URL prefix: /api/v1/users/   (see apps/users/admin_urls.py)
"""
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import StandardResultsPagination
from core.permissions import IsAdmin
from .models import UserAuditLog
from .serializers import (
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    UserAuditLogSerializer,
)
from .services import user_management_service

logger = logging.getLogger(__name__)


# ─── Helper ───────────────────────────────────────────────────────────────────

def _ok(data, status_code=status.HTTP_200_OK) -> Response:
    """Wrap any serialized payload in the project-standard success envelope."""
    return Response({'success': True, 'data': data}, status=status_code)


# ─── User list + create ───────────────────────────────────────────────────────

class UserListCreateView(APIView):
    """
    GET  /api/v1/users/          → paginated user list (admin only)
    POST /api/v1/users/          → create a user (admin only)
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        """
        Returns a paginated list of all users.

        Query params forwarded to the service as filters:
          ?role=recruiter
          ?is_active=true|false
          ?search=<name or email>
          ?page=2
          ?page_size=20
        """
        filters = {
            'role':      request.query_params.get('role'),
            'is_active': request.query_params.get('is_active'),
            'search':    request.query_params.get('search', '').strip(),
        }

        qs = user_management_service.list_users(
            requesting_user=request.user,
            filters=filters,
        )

        # Apply ordering from query param; default to -date_joined
        ordering = request.query_params.get('ordering', '-date_joined')
        ALLOWED_ORDERINGS = {
            'date_joined', '-date_joined',
            'last_name', '-last_name',
            'email', '-email',
            'role', '-role',
            'last_activity', '-last_activity',
        }
        if ordering in ALLOWED_ORDERINGS:
            qs = qs.order_by(ordering)

        # Paginate
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UserListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        """
        Create a new user account.
        Body: { email, password, first_name, last_name, role, phone? }
        """
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = user_management_service.create_user(
            data=serializer.validated_data,
            requesting_user=request.user,
            request=request,
        )

        output = UserDetailSerializer(user)
        return _ok(output.data, status.HTTP_201_CREATED)


# ─── User stats ───────────────────────────────────────────────────────────────

class UserStatsView(APIView):
    """
    GET /api/v1/users/stats/

    Returns aggregate user statistics for the admin dashboard.
    No body params — admin only.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        stats = user_management_service.get_user_stats(
            requesting_user=request.user,
        )
        return _ok(stats)


# ─── Single user: retrieve + update ──────────────────────────────────────────

class UserDetailView(APIView):
    """
    GET   /api/v1/users/<id>/    → retrieve user detail (admin only)
    PATCH /api/v1/users/<id>/    → partial update (admin only)
    DELETE /api/v1/users/<id>/   → delete user completely (admin only)
    """
    permission_classes = [IsAdmin]

    def get(self, request, pk: int):
        user = user_management_service.get_user_detail(
            user_id=pk,
            requesting_user=request.user,
        )
        return _ok(UserDetailSerializer(user).data)

    def patch(self, request, pk: int):
        """
        Partial update: only fields present in the body are changed.
        Whitelisted fields: first_name, last_name, email, role, phone.
        Password and is_active have dedicated endpoints.
        """
        # Fetch the target first so we can pass it to the serializer's
        # uniqueness check (avoids false "email already in use" when the
        # email hasn't actually changed).
        target = user_management_service.get_user_detail(
            user_id=pk,
            requesting_user=request.user,
        )

        serializer = UserUpdateSerializer(
            data=request.data,
            context={'target_user': target},
        )
        serializer.is_valid(raise_exception=True)

        updated_user = user_management_service.update_user(
            user_id=pk,
            data=serializer.validated_data,
            requesting_user=request.user,
            request=request,
        )

        return _ok(UserDetailSerializer(updated_user).data)

    def delete(self, request, pk: int):
        """
        DELETE /api/v1/users/<id>/
        Deletes a user account completely (admin only).
        """
        user_management_service.delete_user(
            user_id=pk,
            requesting_user=request.user,
            request=request,
        )
        return Response(
            {
                'success': True,
                'message': 'User account deleted successfully.',
            },
            status=status.HTTP_200_OK,
        )


# ─── Password change ──────────────────────────────────────────────────────────

class UserPasswordView(APIView):
    """
    PATCH /api/v1/users/<id>/password/

    Admin force-sets a user's password.
    Body: { new_password }

    On success: all of the target user's refresh tokens are blacklisted
    (forcing re-login from all devices).
    """
    permission_classes = [IsAdmin]

    def patch(self, request, pk: int):
        # Fetch target for the similarity validator context
        target = user_management_service.get_user_detail(
            user_id=pk,
            requesting_user=request.user,
        )

        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'target_user': target},
        )
        serializer.is_valid(raise_exception=True)

        user_management_service.change_user_password(
            user_id=pk,
            new_password=serializer.validated_data['new_password'],
            requesting_user=request.user,
            request=request,
        )

        return Response(
            {
                'success': True,
                'message': 'Password changed. The user has been logged out of all devices.',
            },
            status=status.HTTP_200_OK,
        )


# ─── Toggle active status ─────────────────────────────────────────────────────

class UserToggleActiveView(APIView):
    """
    PATCH /api/v1/users/<id>/toggle-active/

    Activates or deactivates a user account.
    No request body required.

    On deactivation: all of the target user's refresh tokens are blacklisted.
    """
    permission_classes = [IsAdmin]

    def patch(self, request, pk: int):
        updated_user = user_management_service.toggle_user_active(
            user_id=pk,
            requesting_user=request.user,
            request=request,
        )

        action = 'activated' if updated_user.is_active else 'deactivated'

        return Response(
            {
                'success': True,
                'message': f'Account {action} successfully.',
                'data': UserDetailSerializer(updated_user).data,
            },
            status=status.HTTP_200_OK,
        )


# ─── Audit log ────────────────────────────────────────────────────────────────

class UserAuditLogView(APIView):
    """
    GET /api/v1/users/<id>/audit-log/

    Paginated, reverse-chronological list of audit events for a specific user.

    Query params:
      ?action=created|updated|password_changed|...  (filter by action type)
      ?page=2
      ?page_size=20
    """
    permission_classes = [IsAdmin]

    def get(self, request, pk: int):
        # Validate the target user exists and the caller is an admin
        user_management_service.get_user_detail(
            user_id=pk,
            requesting_user=request.user,
        )

        qs = (
            UserAuditLog.objects
            .filter(subject_id=pk)
            .select_related('actor', 'subject')
            .order_by('-created_at')
        )

        # Optional filter by action type
        action_filter = request.query_params.get('action')
        if action_filter and action_filter in UserAuditLog.Actions.values:
            qs = qs.filter(action=action_filter)

        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = UserAuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

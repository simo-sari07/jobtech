"""
URL patterns for admin user management.
All paths are under /api/v1/users/ (see config/urls.py).

Route ordering matters for Django's URL resolver:
  Static segments (/stats/, /online/) MUST appear before parametric
  segments (/<id>/) to prevent Django matching 'stats' as an integer pk.
"""
from django.urls import path

from apps.users.admin_views import (
    UserListCreateView,
    UserStatsView,
    UserDetailView,
    UserPasswordView,
    UserToggleActiveView,
    UserAuditLogView,
)

app_name = 'admin_users'

urlpatterns = [
    # ── Collection ───────────────────────────────────────────────────────────
    path('',         UserListCreateView.as_view(), name='user-list-create'),

    # ── Static sub-resources (MUST come before <int:pk>/ routes) ─────────────
    path('stats/',   UserStatsView.as_view(),      name='user-stats'),

    # ── Per-user ─────────────────────────────────────────────────────────────
    path('<int:pk>/',              UserDetailView.as_view(),       name='user-detail'),
    path('<int:pk>/password/',     UserPasswordView.as_view(),     name='user-password'),
    path('<int:pk>/toggle-active/', UserToggleActiveView.as_view(), name='user-toggle-active'),
    path('<int:pk>/audit-log/',    UserAuditLogView.as_view(),     name='user-audit-log'),
]

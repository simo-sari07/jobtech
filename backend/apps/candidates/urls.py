from django.urls import path
from apps.candidates.views import (
    CandidateProfileView,
    SavedJobListView,
    SavedJobToggleView,
    SavedJobStatusView,
    NotificationListView,
    NotificationMarkReadView,
    NotificationUnreadCountView,
    NotificationDeleteView,
    NotificationBulkDeleteView,
)

app_name = 'candidates'

urlpatterns = [
    # ── Profile ──────────────────────────────────────────────────────────────
    path('profile/',                   CandidateProfileView.as_view(),        name='profile'),

    # ── Saved Jobs ────────────────────────────────────────────────────────────
    path('saved-jobs/',                SavedJobListView.as_view(),            name='saved-jobs-list'),
    path('saved-jobs/<int:job_id>/toggle/', SavedJobToggleView.as_view(),     name='saved-jobs-toggle'),
    path('saved-jobs/<int:job_id>/status/', SavedJobStatusView.as_view(),     name='saved-jobs-status'),

    # ── Notifications ─────────────────────────────────────────────────────────
    path('notifications/',                      NotificationListView.as_view(),        name='notifications-list'),
    path('notifications/mark-read/',            NotificationMarkReadView.as_view(),    name='notifications-mark-read'),
    path('notifications/unread-count/',         NotificationUnreadCountView.as_view(), name='notifications-unread-count'),
    path('notifications/bulk-delete/',          NotificationBulkDeleteView.as_view(),  name='notifications-bulk-delete'),
    path('notifications/<int:pk>/delete/',      NotificationDeleteView.as_view(),      name='notifications-delete'),
]

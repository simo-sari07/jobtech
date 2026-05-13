"""
Public URL patterns for the candidate-facing job surface.
No authentication required on these routes.
Mounted at: /api/v1/public/
"""
from django.urls import path
from apps.jobs.public_views import PublicJobListView, PublicJobDetailView

urlpatterns = [
    path('jobs/', PublicJobListView.as_view(), name='public-job-list'),
    path('jobs/<slug:slug>/', PublicJobDetailView.as_view(), name='public-job-detail'),
]

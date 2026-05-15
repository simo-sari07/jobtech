"""
Public jobs views — no authentication required (AllowAny).
Candidate-facing. Only exposes open offers via PublicJobOfferSerializer.
"""
from datetime import date

from django.db.models import Q
from rest_framework import generics, filters
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from .models import Job
from .serializers import PublicJobOfferSerializer


class PublicJobListView(generics.ListAPIView):
    """
    GET /api/v1/public/jobs/
    No authentication required.
    Always filters: status=open, deadline >= today or null.
    Supports: search (title, description, location), contract_type, ordering.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicJobOfferSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['contract_type']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'deadline']
    ordering = ['-created_at']

    def get_queryset(self):
        return (
            Job.objects.filter(status='open')
            .filter(Q(deadline__isnull=True) | Q(deadline__gte=date.today()))
            .prefetch_related('skills')
            .select_related('created_by')
        )


class PublicJobDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/public/jobs/<slug>/
    No authentication required.
    Returns full offer detail via slug lookup.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicJobOfferSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        return (
            Job.objects.filter(status='open')
            .filter(Q(deadline__isnull=True) | Q(deadline__gte=date.today()))
            .prefetch_related('skills')
        )

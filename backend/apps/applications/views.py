"""
Applications views — thin layer delegating to application_service.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.applications.models import Application
from apps.applications.serializers import (
    ApplicationCreateSerializer,
    ApplicationListSerializer,
    ApplicationCandidateSerializer,
    ApplicationStatusSerializer,
)
from apps.applications.filters import ApplicationFilter
from apps.applications.services.application_service import (
    submit_application,
    update_application_status,
    get_applications_queryset,
)
from core.permissions import IsRecruiter, IsCandidate
from apps.users.models import User


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    Application CRUD — tightly role-scoped:
    - POST (create): Candidate only
    - GET list: Recruiter/HR/Admin
    - GET mine: Candidate only (custom action)
    - PATCH status: Recruiter/HR/Admin
    """
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ApplicationFilter
    ordering_fields = ['created_at', 'status', 'ai_score']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [IsCandidate()]
        if self.action == 'mine':
            return [IsCandidate()]
        return [IsRecruiter()]

    def get_queryset(self):
        return get_applications_queryset(self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ApplicationCreateSerializer
        if self.action == 'mine':
            return ApplicationCandidateSerializer
        if self.action == 'partial_update':
            return ApplicationStatusSerializer
        return ApplicationListSerializer

    def create(self, request, *args, **kwargs):
        serializer = ApplicationCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        application = submit_application(request.user, serializer.validated_data)
        return Response(
            ApplicationCandidateSerializer(application, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = ApplicationStatusSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status', instance.status)
        notes = serializer.validated_data.get('notes', instance.notes)

        application = update_application_status(instance, request.user, new_status, notes)
        return Response(
            ApplicationListSerializer(application, context={'request': request}).data
        )

    @action(detail=False, methods=['get'], url_path='mine', permission_classes=[IsCandidate])
    def mine(self, request):
        """GET /api/v1/applications/mine/ — candidate's own applications."""
        qs = Application.objects.filter(candidate=request.user).select_related('job')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ApplicationCandidateSerializer(
                page, many=True, context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        serializer = ApplicationCandidateSerializer(
            qs, many=True, context={'request': request}
        )
        return Response(serializer.data)

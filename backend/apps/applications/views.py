"""
Applications views — thin layer delegating to application_service.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from .models import Application, ApplicationAuditLog
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationListSerializer,
    ApplicationCandidateSerializer,
    ApplicationStatusSerializer,
    ApplicationAuditLogSerializer,
)
from .filters import ApplicationFilter
from .services.application_service import (
    submit_application,
    update_application_status,
    archive_application,
    unarchive_application,
    delete_application,
    withdraw_application,
    bulk_update_status,
    bulk_archive,
    bulk_delete,
    get_applications_queryset,
)
from core.permissions import IsRecruiter, IsCandidate, IsAdmin, IsHRManager
from ..users.models import User


class ApplicationViewSet(viewsets.ModelViewSet):
    """
    Application CRUD — tightly role-scoped:
    - POST (create): Candidate only
    - GET list: Recruiter/HR/Admin (excludes archived by default)
    - GET mine: Candidate only
    - PATCH status: Recruiter/HR/Admin
    - POST archive/unarchive: Admin/HR
    - DELETE: Admin only
    - POST withdraw: Candidate only
    - POST bulk-status / bulk-archive: Staff
    """
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ApplicationFilter
    ordering_fields = ['created_at', 'status', 'ai_score']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action == 'create':
            return [IsCandidate()]
        if self.action in ('mine', 'withdraw'):
            return [IsCandidate()]
        if self.action == 'destroy':
            return [IsAdmin()]
        if self.action in ('archive', 'unarchive', 'bulk_archive'):
            return [IsHRManager()]
        return [IsRecruiter()]

    def get_queryset(self):
        include_archived = self.request.query_params.get('archived') == 'true'
        return get_applications_queryset(self.request.user, include_archived=include_archived)

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

    def destroy(self, request, *args, **kwargs):
        """DELETE — admin permanent delete."""
        instance = self.get_object()
        delete_application(instance, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

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

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """POST /api/v1/applications/<id>/archive/"""
        application = archive_application(self.get_object(), request.user)
        return Response(ApplicationListSerializer(application, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='unarchive')
    def unarchive(self, request, pk=None):
        """POST /api/v1/applications/<id>/unarchive/"""
        application = unarchive_application(self.get_object(), request.user)
        return Response(ApplicationListSerializer(application, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='withdraw', permission_classes=[IsCandidate])
    def withdraw(self, request, pk=None):
        """POST /api/v1/applications/<id>/withdraw/"""
        application = withdraw_application(self.get_object(), request.user)
        return Response(ApplicationCandidateSerializer(application, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='audit-log')
    def audit_log(self, request, pk=None):
        """GET /api/v1/applications/<id>/audit-log/"""
        application = self.get_object()
        logs = ApplicationAuditLog.objects.filter(application=application).select_related('performed_by')
        return Response(ApplicationAuditLogSerializer(logs, many=True).data)

    @action(detail=False, methods=['post'], url_path='bulk-status')
    def bulk_status(self, request):
        """POST /api/v1/applications/bulk-status/ { ids: [...], status: "..." }"""
        ids = request.data.get('ids', [])
        new_status = request.data.get('status', '')
        if not ids or not new_status:
            return Response({'detail': 'ids and status are required.'}, status=status.HTTP_400_BAD_REQUEST)
        count = bulk_update_status(ids, new_status, request.user)
        return Response({'updated': count})

    @action(detail=False, methods=['post'], url_path='bulk-archive')
    def bulk_archive(self, request):
        """POST /api/v1/applications/bulk-archive/ { ids: [...] }"""
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'detail': 'ids are required.'}, status=status.HTTP_400_BAD_REQUEST)
        count = bulk_archive(ids, request.user)
        return Response({'archived': count})

    @action(detail=False, methods=['post'], url_path='bulk-delete', permission_classes=[IsAdmin])
    def bulk_delete(self, request):
        """POST /api/v1/applications/bulk-delete/ { ids: [...] }"""
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'detail': 'ids are required.'}, status=status.HTTP_400_BAD_REQUEST)
        count = bulk_delete(ids, request.user)
        return Response({'deleted': count})

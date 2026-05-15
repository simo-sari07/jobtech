"""
Jobs views — thin layer that delegates all logic to job_service.
"""
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Job, Skill
from .serializers import (
    SkillSerializer,
    JobListSerializer,
    JobDetailSerializer,
    JobCreateSerializer,
)
from .filters import JobFilter
from .services.job_service import (
    create_job,
    update_job,
    get_jobs_queryset,
    delete_job,
)
from core.permissions import IsRecruiter, IsAdmin
from ..users.models import User


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve skills — all authenticated users."""
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class JobViewSet(viewsets.ModelViewSet):
    """
    Job CRUD — role-based access:
    - GET (list/detail): all authenticated users (candidates see open only)
    - POST/PATCH: Recruiter / HR Manager / Admin
    - DELETE: Admin only
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = JobFilter
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'deadline', 'salary_min']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update'):
            return [IsRecruiter()]
        if self.action == 'destroy':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return get_jobs_queryset(self.request.user)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return JobCreateSerializer
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobListSerializer

    def perform_create(self, serializer):
        create_job(self.request.user, serializer.validated_data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = create_job(request.user, serializer.validated_data)
        return Response(
            JobDetailSerializer(job, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        job = update_job(instance, request.user, serializer.validated_data)
        return Response(JobDetailSerializer(job, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_job(instance, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

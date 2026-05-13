"""
Interviews views — thin layer that delegates all logic to interview_service.

Endpoints implemented:
  GET    /api/v1/interviews/                → list (recruiter/HR/admin + candidate own)
  POST   /api/v1/interviews/                → schedule (recruiter/HR/admin)
  GET    /api/v1/interviews/{id}/           → detail
  PATCH  /api/v1/interviews/{id}/           → update status/notes
  POST   /api/v1/interviews/{id}/evaluate/  → submit evaluation (recruiter/HR)
  GET    /api/v1/interviews/{id}/evaluation/→ get evaluation (recruiter/HR/admin)
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.interviews.models import Interview, Evaluation
from apps.interviews.serializers import (
    InterviewCreateSerializer,
    InterviewListSerializer,
    InterviewDetailSerializer,
    InterviewUpdateSerializer,
    EvaluationCreateSerializer,
    EvaluationReadSerializer,
)
from apps.interviews.filters import InterviewFilter
from apps.interviews.services.interview_service import (
    schedule_interview,
    update_interview,
    submit_evaluation,
    get_interviews_queryset,
)
from core.permissions import IsRecruiter, IsHRManager, IsCandidate


class InterviewViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet for Interview.
    Permissions:
      - list/retrieve: IsAuthenticated (scoped by role inside get_queryset)
      - create: IsRecruiter (includes HR + admin)
      - partial_update: IsRecruiter
      - evaluate action: IsRecruiter
      - evaluation (read) action: IsRecruiter
    """
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filter_backends   = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class   = InterviewFilter
    ordering_fields   = ['scheduled_at', 'status', 'created_at']
    ordering          = ['scheduled_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action == 'evaluate':
            return [IsRecruiter()]
        if self.action == 'evaluation':
            return [IsRecruiter()]
        return [IsRecruiter()]

    def get_queryset(self):
        return get_interviews_queryset(self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return InterviewCreateSerializer
        if self.action == 'partial_update':
            return InterviewUpdateSerializer
        if self.action == 'retrieve':
            return InterviewDetailSerializer
        return InterviewListSerializer

    # ── POST /api/v1/interviews/ ─────────────────────────────────────────────

    def create(self, request, *args, **kwargs):
        """Schedule a new interview."""
        serializer = InterviewCreateSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        interview = schedule_interview(request.user, serializer.validated_data)
        return Response(
            InterviewDetailSerializer(interview, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    # ── PATCH /api/v1/interviews/{id}/ ───────────────────────────────────────

    def partial_update(self, request, *args, **kwargs):
        """Update interview status and/or notes."""
        instance = self.get_object()
        serializer = InterviewUpdateSerializer(
            instance, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        interview = update_interview(instance, request.user, serializer.validated_data)
        return Response(
            InterviewDetailSerializer(interview, context={'request': request}).data
        )

    # ── POST /api/v1/interviews/{id}/evaluate/ ───────────────────────────────

    @action(detail=True, methods=['post'], url_path='evaluate', permission_classes=[IsRecruiter])
    def evaluate(self, request, pk=None):
        """Submit a structured evaluation for a completed interview."""
        interview = self.get_object()

        serializer = EvaluationCreateSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        evaluation = submit_evaluation(
            interview, request.user, serializer.validated_data
        )
        return Response(
            EvaluationReadSerializer(evaluation).data,
            status=status.HTTP_201_CREATED,
        )

    # ── GET /api/v1/interviews/{id}/evaluation/ ──────────────────────────────

    @action(detail=True, methods=['get'], url_path='evaluation', permission_classes=[IsRecruiter])
    def evaluation(self, request, pk=None):
        """Retrieve the evaluation for an interview."""
        interview = self.get_object()

        if not hasattr(interview, 'evaluation'):
            return Response(
                {'detail': 'This interview has not been evaluated yet.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(EvaluationReadSerializer(interview.evaluation).data)

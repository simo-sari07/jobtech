"""
Interviews serializers — validation only, zero business logic.

InterviewCreateSerializer   — POST /interviews/
InterviewListSerializer     — GET  /interviews/
InterviewDetailSerializer   — GET  /interviews/{id}/
InterviewUpdateSerializer   — PATCH /interviews/{id}/
EvaluationCreateSerializer  — POST /interviews/{id}/evaluate/
EvaluationReadSerializer    — GET  /interviews/{id}/evaluation/
"""
from django.utils import timezone
from rest_framework import serializers

from apps.interviews.models import Interview, Evaluation


# ─────────────────────────────────────────────────────────────────────────────
# Interview serializers
# ─────────────────────────────────────────────────────────────────────────────

class InterviewCreateSerializer(serializers.ModelSerializer):
    """Used by recruiter to schedule a new interview."""

    class Meta:
        model = Interview
        fields = [
            'application', 'interview_type', 'scheduled_at',
            'duration_minutes', 'location_or_link',
        ]

    def validate_scheduled_at(self, value):
        """Interviews cannot be scheduled in the past."""
        if value <= timezone.now():
            raise serializers.ValidationError(
                'Scheduled date must be in the future.'
            )
        return value

    def validate_application(self, application):
        """Only shortlisted or interview-stage applications can have an interview."""
        from apps.applications.models import Application
        allowed = (Application.Status.SHORTLISTED, Application.Status.INTERVIEW)
        if application.status not in allowed:
            raise serializers.ValidationError(
                'Interviews can only be scheduled for shortlisted or interview-stage applications.'
            )
        return application

    def validate_duration_minutes(self, value):
        if value < 15 or value > 480:
            raise serializers.ValidationError(
                'Duration must be between 15 and 480 minutes.'
            )
        return value


class InterviewListSerializer(serializers.ModelSerializer):
    """Compact list view — includes candidate name, job title, recruiter name."""
    candidate_name  = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    job_title       = serializers.SerializerMethodField()
    recruiter_name  = serializers.SerializerMethodField()
    has_evaluation  = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = [
            'id', 'application_id', 'interview_type', 'scheduled_at', 'duration_minutes',
            'location_or_link', 'status', 'notes',
            'candidate_name', 'candidate_email', 'job_title', 'recruiter_name',
            'has_evaluation', 'reminder_sent', 'created_at', 'updated_at',
        ]

    def get_candidate_name(self, obj) -> str:
        return obj.application.candidate.get_full_name()

    def get_candidate_email(self, obj) -> str:
        return obj.application.candidate.email

    def get_job_title(self, obj) -> str:
        return obj.application.job.title

    def get_recruiter_name(self, obj) -> str | None:
        if obj.recruiter:
            return obj.recruiter.get_full_name()
        return None

    def get_has_evaluation(self, obj) -> bool:
        return hasattr(obj, 'evaluation')


class InterviewDetailSerializer(serializers.ModelSerializer):
    """Full detail view — includes evaluation summary if present."""
    candidate_name  = serializers.SerializerMethodField()
    candidate_email = serializers.SerializerMethodField()
    job_title       = serializers.SerializerMethodField()
    application_id  = serializers.IntegerField(source='application.id', read_only=True)
    recruiter_name  = serializers.SerializerMethodField()
    evaluation      = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = [
            'id', 'application_id', 'interview_type', 'scheduled_at',
            'duration_minutes', 'location_or_link', 'status', 'notes',
            'reminder_sent', 'candidate_name', 'candidate_email', 'job_title',
            'recruiter_name', 'evaluation', 'created_at', 'updated_at',
        ]

    def get_candidate_name(self, obj) -> str:
        return obj.application.candidate.get_full_name()

    def get_candidate_email(self, obj) -> str:
        return obj.application.candidate.email

    def get_job_title(self, obj) -> str:
        return obj.application.job.title

    def get_recruiter_name(self, obj) -> str | None:
        if obj.recruiter:
            return obj.recruiter.get_full_name()
        return None

    def get_evaluation(self, obj):
        if hasattr(obj, 'evaluation'):
            return EvaluationReadSerializer(obj.evaluation).data
        return None


class InterviewUpdateSerializer(serializers.ModelSerializer):
    """PATCH — recruiter can update status and/or notes."""

    class Meta:
        model = Interview
        fields = ['status', 'notes', 'location_or_link']

    def validate_status(self, new_status):
        """Enforce valid status transitions."""
        instance = self.instance
        if instance is None:
            return new_status

        current = instance.status
        valid_transitions = {
            Interview.Status.SCHEDULED: [
                Interview.Status.COMPLETED,
                Interview.Status.CANCELLED,
                Interview.Status.NO_SHOW,
            ],
            Interview.Status.COMPLETED: [],   # terminal
            Interview.Status.CANCELLED: [],   # terminal
            Interview.Status.NO_SHOW:   [],   # terminal
        }
        allowed = valid_transitions.get(current, [])
        if new_status != current and new_status not in allowed:
            raise serializers.ValidationError(
                f"Cannot transition from '{current}' to '{new_status}'. "
                f"Allowed: {[s.value for s in allowed] or 'none (terminal state)'}."
            )
        return new_status


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation serializers
# ─────────────────────────────────────────────────────────────────────────────

class EvaluationCreateSerializer(serializers.ModelSerializer):
    """
    POST /interviews/{id}/evaluate/
    Scores must be integers 1–5.  overall_score is computed server-side.
    """

    class Meta:
        model = Evaluation
        fields = [
            'technical_score', 'communication_score',
            'motivation_score', 'problem_solving_score',
            'recommendation', 'comments',
        ]

    def _validate_score(self, value, field_name: str):
        if not (1 <= value <= 5):
            raise serializers.ValidationError(
                f'{field_name} must be an integer between 1 and 5.'
            )
        return value

    def validate_technical_score(self, v):
        return self._validate_score(v, 'Technical score')

    def validate_communication_score(self, v):
        return self._validate_score(v, 'Communication score')

    def validate_motivation_score(self, v):
        return self._validate_score(v, 'Motivation score')

    def validate_problem_solving_score(self, v):
        return self._validate_score(v, 'Problem-solving score')


class EvaluationReadSerializer(serializers.ModelSerializer):
    """GET /interviews/{id}/evaluation/ — full read view with computed score."""
    evaluator_name = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = [
            'id', 'technical_score', 'communication_score',
            'motivation_score', 'problem_solving_score',
            'overall_score', 'recommendation', 'comments',
            'evaluator_name', 'created_at', 'updated_at',
        ]

    def get_evaluator_name(self, obj) -> str | None:
        if obj.evaluator:
            return obj.evaluator.get_full_name()
        return None

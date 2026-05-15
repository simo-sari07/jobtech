"""
Applications serializers — validation only, zero business logic.
"""
from rest_framework import serializers
from .models import Application
from ..jobs.serializers import JobListSerializer, PublicJobOfferSerializer


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Candidate uses this to submit an application (multipart form with CV)."""

    class Meta:
        model = Application
        fields = ['job', 'cv_file', 'cover_letter']

    def validate_cv_file(self, value):
        """Extra validation on top of model-level validator."""
        from django.conf import settings
        max_mb = getattr(settings, 'CV_MAX_UPLOAD_MB', 5)
        if value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f'CV must be under {max_mb}MB.')
        name = value.name.lower()
        if not name.endswith('.pdf'):
            raise serializers.ValidationError('Only PDF files are accepted.')
        return value

    def validate_job(self, job):
        """Candidates can only apply to open jobs."""
        if not job.is_open:
            raise serializers.ValidationError('Applications are only accepted for open jobs.')
        return job


class ApplicationListSerializer(serializers.ModelSerializer):
    """Full list view for recruiters/HR — includes candidate info and job title."""
    candidate_name   = serializers.SerializerMethodField()
    candidate_email  = serializers.SerializerMethodField()
    candidate_id     = serializers.SerializerMethodField()
    job_title        = serializers.SerializerMethodField()
    job_id           = serializers.SerializerMethodField()
    job_location     = serializers.SerializerMethodField()
    cv_url           = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'status',
            'candidate_id', 'candidate_name', 'candidate_email',
            'job_id', 'job_title', 'job_location',
            'cv_url', 'ai_score', 'cover_letter',
            'notes', 'created_at', 'updated_at',
        ]

    def get_candidate_id(self, obj) -> int:
        return obj.candidate_id

    def get_candidate_name(self, obj) -> str:
        return obj.candidate.get_full_name()

    def get_candidate_email(self, obj) -> str:
        return obj.candidate.email

    def get_job_id(self, obj) -> int:
        return obj.job_id

    def get_job_title(self, obj) -> str:
        return obj.job.title

    def get_job_location(self, obj) -> str:
        return obj.job.location or ''

    def get_cv_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.cv_file and request:
            return request.build_absolute_uri(obj.cv_file.url)
        return None


class ApplicationCandidateSerializer(serializers.ModelSerializer):
    """Read-only view for candidates — limited fields, no internal notes."""
    job = PublicJobOfferSerializer(read_only=True)
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = ['id', 'job', 'status', 'cv_url', 'cover_letter', 'ai_score', 'created_at']

    def get_cv_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.cv_file and request:
            return request.build_absolute_uri(obj.cv_file.url)
        return None


class ApplicationStatusSerializer(serializers.ModelSerializer):
    """PATCH endpoint for recruiter/HR to advance status only."""

    class Meta:
        model = Application
        fields = ['status', 'notes']

    def validate_status(self, new_status):
        """Enforce valid status transitions."""
        instance = self.instance
        if instance and instance.is_terminal:
            raise serializers.ValidationError(
                f'Application is already in a terminal state ({instance.status}).'
            )
        return new_status

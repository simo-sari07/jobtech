"""
Candidates app serializers.
"""
from rest_framework import serializers
from .models import CandidateProfile, SavedJob, Notification
from ..jobs.serializers import JobListSerializer


class CandidateProfileSerializer(serializers.ModelSerializer):
    """Full profile read/write for the candidate themselves."""
    cv_url = serializers.SerializerMethodField()

    class Meta:
        model  = CandidateProfile
        fields = [
            'id', 'bio', 'location', 'linkedin_url', 'github_url',
            'skills', 'experience', 'education', 'cv_file', 'cv_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'cv_url']
        extra_kwargs = {'cv_file': {'write_only': True, 'required': False}}

    def get_cv_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.cv_file and request:
            return request.build_absolute_uri(obj.cv_file.url)
        return None

    def validate_cv_file(self, value):
        if value:
            max_mb = 5
            if value.size > max_mb * 1024 * 1024:
                raise serializers.ValidationError(f'CV must be under {max_mb}MB.')
            if not value.name.lower().endswith('.pdf'):
                raise serializers.ValidationError('Only PDF files are accepted.')
        return value

    def validate_skills(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Skills must be a list of strings.')
        if len(value) > 50:
            raise serializers.ValidationError('Maximum 50 skills allowed.')
        return [str(s).strip()[:60] for s in value if str(s).strip()]


class SavedJobSerializer(serializers.ModelSerializer):
    """Saved job with full job detail nested."""
    job = JobListSerializer(read_only=True)
    job_id = serializers.IntegerField(write_only=True)

    class Meta:
        model  = SavedJob
        fields = ['id', 'job', 'job_id', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_job_id(self, value):
        from apps.jobs.models import Job
        try:
            Job.objects.get(pk=value)
        except Job.DoesNotExist:
            raise serializers.ValidationError('Job not found.')
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ['id', 'type', 'message', 'is_read', 'related_url', 'created_at']
        read_only_fields = ['id', 'type', 'message', 'related_url', 'created_at']

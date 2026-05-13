"""
Jobs serializers — validation layer only, zero business logic.
"""
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from apps.jobs.models import Job, Skill


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'slug']
        read_only_fields = ['slug']


class PublicJobOfferSerializer(serializers.ModelSerializer):
    """
    Used for the public candidate-facing surface.
    Never exposes: created_by details, internal notes,
                   application counts, or job status.
    """
    skills = SkillSerializer(many=True, read_only=True)
    company_name = serializers.SerializerMethodField()

    def get_company_name(self, obj) -> str:
        return getattr(settings, 'COMPANY_NAME', 'JobTech Solutions')

    class Meta:
        model = Job
        fields = [
            'id', 'slug', 'title', 'description',
            'contract_type', 'location', 'experience_years',
            'salary_min', 'salary_max',
            'skills', 'deadline', 'company_name', 'created_at',
        ]


class JobListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    skills = SkillSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    application_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'slug', 'title', 'contract_type', 'location', 'status',
            'experience_years', 'salary_min', 'salary_max', 'deadline',
            'skills', 'created_by_name', 'application_count', 'created_at',
        ]

    def get_created_by_name(self, obj) -> str | None:
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class JobDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer including description."""
    skills = SkillSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    application_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'slug', 'title', 'description', 'contract_type', 'location',
            'experience_years', 'salary_min', 'salary_max', 'deadline',
            'status', 'skills', 'created_by_name', 'application_count',
            'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj) -> str | None:
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None

    def get_application_count(self, obj) -> int:
        return obj.applications.count()


class JobCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating / updating jobs."""
    skill_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Skill.objects.all(),
        source='skills',
        required=False,
    )

    class Meta:
        model = Job
        fields = [
            'title', 'description', 'contract_type', 'location',
            'experience_years', 'salary_min', 'salary_max', 'deadline',
            'status', 'skill_ids',
        ]

    def validate(self, data):
        # Salary range logical check
        salary_min = data.get('salary_min')
        salary_max = data.get('salary_max')
        if salary_min and salary_max and salary_min > salary_max:
            raise serializers.ValidationError(
                {'salary_min': 'salary_min must be less than or equal to salary_max.'}
            )

        # Deadline must be today or in the future
        deadline = data.get('deadline')
        if deadline and deadline < timezone.now().date():
            raise serializers.ValidationError(
                {'deadline': 'Deadline must be today or a future date.'}
            )

        return data

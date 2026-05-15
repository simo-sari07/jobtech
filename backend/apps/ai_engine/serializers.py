"""
AI Engine serializers — read-only output for CandidateScore and parsed CV data.
"""
from rest_framework import serializers
from .models import CandidateScore


class CandidateScoreSerializer(serializers.ModelSerializer):
    """
    Full AI score output for one application.
    All fields are read-only — scores are only written by Celery tasks.
    """
    score_label    = serializers.CharField(source='score_label',  read_only=True)
    score_color    = serializers.CharField(source='score_color',  read_only=True)
    candidate_name = serializers.SerializerMethodField()

    class Meta:
        model  = CandidateScore
        fields = [
            'id',
            'application',
            'match_score',
            'skills_match',
            'experience_match',
            'keyword_score',
            'extracted_skills',
            'extracted_experience',
            'strengths',
            'gaps',
            'reasoning',
            'model_version',
            'error',
            'processed_at',
            'score_label',
            'score_color',
            'candidate_name',
        ]
        read_only_fields = fields

    def get_candidate_name(self, obj) -> str:
        return obj.application.candidate.get_full_name()


class CVParsedDataSerializer(serializers.Serializer):
    """
    Validates and serialises the ai_parsed_data JSON stored on Application.
    Used for display only — all writes go through the Celery tasks.
    """
    full_name         = serializers.CharField(allow_null=True, required=False)
    email             = serializers.EmailField(allow_null=True, required=False)
    years_experience  = serializers.IntegerField(allow_null=True, required=False, min_value=0, max_value=50)
    skills            = serializers.ListField(child=serializers.CharField(), default=list)
    education         = serializers.ListField(child=serializers.DictField(), default=list)
    experience        = serializers.ListField(child=serializers.DictField(), default=list)
    certifications    = serializers.ListField(child=serializers.CharField(), default=list)
    languages         = serializers.ListField(child=serializers.CharField(), default=list)
    summary           = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    parse_error       = serializers.CharField(allow_null=True, required=False, allow_blank=True)

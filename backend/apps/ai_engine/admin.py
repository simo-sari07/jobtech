from django.contrib import admin
from .models import CandidateScore


@admin.register(CandidateScore)
class CandidateScoreAdmin(admin.ModelAdmin):
    list_display  = [
        'id', 'application', 'match_score', 'skills_match',
        'experience_match', 'keyword_score', 'model_version',
        'score_label', 'processed_at',
    ]
    list_filter   = ['model_version', 'processed_at']
    search_fields = ['application__candidate__email', 'application__job__title']
    readonly_fields = [
        'match_score', 'skills_match', 'experience_match', 'keyword_score',
        'extracted_skills', 'extracted_experience', 'strengths', 'gaps',
        'reasoning', 'error', 'model_version', 'processed_at',
    ]
    ordering = ['-match_score']

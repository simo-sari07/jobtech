"""
Django Admin registrations for the interviews app.
"""
from django.contrib import admin
from apps.interviews.models import Interview, Evaluation


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display  = (
        'id', 'get_candidate', 'get_job', 'interview_type',
        'scheduled_at', 'status', 'reminder_sent',
    )
    list_filter   = ('status', 'interview_type', 'reminder_sent')
    search_fields = (
        'application__candidate__email',
        'application__candidate__first_name',
        'application__candidate__last_name',
        'application__job__title',
    )
    ordering      = ['scheduled_at']
    readonly_fields = ('reminder_sent', 'created_at', 'updated_at')

    @admin.display(description='Candidate')
    def get_candidate(self, obj):
        return obj.application.candidate.get_full_name()

    @admin.display(description='Job')
    def get_job(self, obj):
        return obj.application.job.title


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'get_interview', 'recommendation',
        'overall_score', 'get_evaluator', 'created_at',
    )
    list_filter  = ('recommendation',)
    readonly_fields = ('overall_score', 'created_at', 'updated_at')

    @admin.display(description='Interview')
    def get_interview(self, obj):
        return str(obj.interview)

    @admin.display(description='Evaluator')
    def get_evaluator(self, obj):
        if obj.evaluator:
            return obj.evaluator.get_full_name()
        return '—'

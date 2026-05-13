from django.contrib import admin
from apps.applications.models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['candidate', 'job', 'status', 'ai_score', 'created_at']
    list_filter = ['status']
    search_fields = ['candidate__email', 'job__title']
    raw_id_fields = ['candidate', 'job']
    readonly_fields = ['created_at', 'updated_at', 'ai_score']

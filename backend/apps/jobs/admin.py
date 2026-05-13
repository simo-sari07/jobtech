from django.contrib import admin
from apps.jobs.models import Job, Skill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'contract_type', 'location', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'contract_type']
    search_fields = ['title', 'location']
    raw_id_fields = ['created_by']
    filter_horizontal = ['skills']
    readonly_fields = ['created_at', 'updated_at']

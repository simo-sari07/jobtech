"""
django-filter FilterSet for Interview list endpoint.
All filtering logic lives here — never raw query params in views.
"""
import django_filters
from django.db import models
from apps.interviews.models import Interview


class InterviewFilter(django_filters.FilterSet):
    """
    Supported query params:
      ?status=scheduled
      ?interview_type=video
      ?scheduled_after=2026-04-01T00:00:00Z
      ?scheduled_before=2026-04-30T23:59:59Z
      ?recruiter=<id>
      ?application=<id>
      ?search=<name or email>
    """
    scheduled_after  = django_filters.IsoDateTimeFilter(
        field_name='scheduled_at', lookup_expr='gte'
    )
    scheduled_before = django_filters.IsoDateTimeFilter(
        field_name='scheduled_at', lookup_expr='lte'
    )
    status           = django_filters.ChoiceFilter(choices=Interview.Status.choices)
    interview_type   = django_filters.ChoiceFilter(choices=Interview.InterviewType.choices)
    recruiter        = django_filters.NumberFilter(field_name='recruiter__id')
    application      = django_filters.NumberFilter(field_name='application__id')
    search           = django_filters.CharFilter(method='filter_search')

    class Meta:
        model  = Interview
        fields = [
            'status', 'interview_type', 'recruiter',
            'application', 'scheduled_after', 'scheduled_before',
        ]

    def filter_search(self, queryset, name, value):
        """Search by candidate name, email, or job title."""
        return queryset.filter(
            models.Q(application__candidate__first_name__icontains=value) |
            models.Q(application__candidate__last_name__icontains=value) |
            models.Q(application__candidate__email__icontains=value) |
            models.Q(application__job__title__icontains=value)
        )

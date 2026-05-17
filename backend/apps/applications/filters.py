"""
Application filters using django-filter.
"""
import django_filters
from django.db import models
from apps.applications.models import Application


class ApplicationFilter(django_filters.FilterSet):
    status      = django_filters.ChoiceFilter(choices=Application.Status.choices)
    job         = django_filters.NumberFilter(field_name='job__id')
    is_archived = django_filters.BooleanFilter(field_name='is_archived')
    search      = django_filters.CharFilter(method='filter_search')

    class Meta:
        model = Application
        fields = ['status', 'job', 'is_archived']

    def filter_search(self, queryset, name, value):
        """Search by candidate name or email."""
        return queryset.filter(
            models.Q(candidate__first_name__icontains=value) |
            models.Q(candidate__last_name__icontains=value) |
            models.Q(candidate__email__icontains=value)
        )


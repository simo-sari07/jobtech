"""
Application filters using django-filter.
"""
import django_filters
from apps.applications.models import Application


class ApplicationFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Application.Status.choices)
    job    = django_filters.NumberFilter(field_name='job__id')

    class Meta:
        model = Application
        fields = ['status', 'job']

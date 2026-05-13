"""
Job filters using django-filter.
"""
import django_filters
from apps.jobs.models import Job


class JobFilter(django_filters.FilterSet):
    status        = django_filters.ChoiceFilter(choices=Job.Status.choices)
    contract_type = django_filters.ChoiceFilter(choices=Job.ContractType.choices)
    location      = django_filters.CharFilter(lookup_expr='icontains')
    skills        = django_filters.BaseInFilter(field_name='skills__slug', lookup_expr='in')
    min_salary    = django_filters.NumberFilter(field_name='salary_min', lookup_expr='gte')
    max_salary    = django_filters.NumberFilter(field_name='salary_max', lookup_expr='lte')
    deadline_from = django_filters.DateFilter(field_name='deadline', lookup_expr='gte')
    deadline_to   = django_filters.DateFilter(field_name='deadline', lookup_expr='lte')

    class Meta:
        model = Job
        fields = ['status', 'contract_type', 'location', 'skills']

"""
factory_boy factories for the interviews app.
Used exclusively in tests — never in production code.
"""
import factory
from django.utils import timezone
from datetime import timedelta

from apps.interviews.models import Interview, Evaluation


class InterviewFactory(factory.django.DjangoModelFactory):
    """Creates a valid Interview.  Pass `application` and `recruiter` explicitly."""

    class Meta:
        model = Interview

    # Default: scheduled 2 days from now
    interview_type   = Interview.InterviewType.VIDEO
    scheduled_at     = factory.LazyFunction(lambda: timezone.now() + timedelta(days=2))
    duration_minutes = 60
    location_or_link = 'https://meet.example.com/test-room'
    status           = Interview.Status.SCHEDULED
    notes            = None
    reminder_sent    = False


class EvaluationFactory(factory.django.DjangoModelFactory):
    """Creates a valid Evaluation for a completed interview."""

    class Meta:
        model = Evaluation

    technical_score       = 4
    communication_score   = 3
    motivation_score      = 5
    problem_solving_score = 4
    recommendation        = Evaluation.Recommendation.HIRE
    comments              = 'Strong candidate, recommend immediate hire.'

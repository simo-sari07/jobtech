"""
Interview domain models.

Interview  — a scheduled meeting between recruiter and candidate for an application.
Evaluation — a structured scorecard filled by the recruiter after the interview.

Rules (from master document):
- interview.status: scheduled → completed | cancelled | no_show
- evaluation is 1-to-1 with interview (unique constraint on interview_id)
- overall_score is COMPUTED (weighted average of the four sub-scores)
- reminder_sent tracks whether the Celery beat task has already fired
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Interview(models.Model):
    """
    A scheduled interview session linked to a job application.
    """

    class InterviewType(models.TextChoices):
        PHONE     = 'phone',     'Phone'
        VIDEO     = 'video',     'Video'
        ONSITE    = 'onsite',    'On-site'
        TECHNICAL = 'technical', 'Technical'

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
        NO_SHOW   = 'no_show',   'No-show'

    # ── Relationships ─────────────────────────────────────────────────────────
    application = models.ForeignKey(
        'applications.Application',
        on_delete=models.CASCADE,
        related_name='interviews',
    )
    recruiter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='conducted_interviews',
    )

    # ── Scheduling ────────────────────────────────────────────────────────────
    interview_type    = models.CharField(max_length=20, choices=InterviewType.choices)
    scheduled_at      = models.DateTimeField()
    duration_minutes  = models.PositiveSmallIntegerField(default=60)
    location_or_link  = models.CharField(max_length=500, blank=True, null=True)

    # ── Status & notes ────────────────────────────────────────────────────────
    status        = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SCHEDULED
    )
    notes         = models.TextField(blank=True, null=True)

    # ── Celery reminder flag ──────────────────────────────────────────────────
    reminder_sent = models.BooleanField(default=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']
        indexes = [
            models.Index(fields=['scheduled_at']),
            models.Index(fields=['status']),
            models.Index(fields=['reminder_sent']),
        ]

    def __str__(self):
        return (
            f"Interview #{self.pk} | "
            f"{self.application.candidate.email} | "
            f"{self.get_interview_type_display()} | "
            f"{self.scheduled_at:%Y-%m-%d %H:%M} [{self.status}]"
        )

    @property
    def is_completed(self) -> bool:
        return self.status == self.Status.COMPLETED

    @property
    def can_be_evaluated(self) -> bool:
        """An interview can only be evaluated once it is completed."""
        return self.is_completed and not hasattr(self, '_evaluation_cache')


class Evaluation(models.Model):
    """
    A structured evaluation form filled by the recruiter after an interview.
    One evaluation per interview (enforced by OneToOneField).
    overall_score is the weighted average of the four sub-scores.
    """

    class Recommendation(models.TextChoices):
        HIRE       = 'hire',       'Hire'
        REJECT     = 'reject',     'Reject'
        HOLD       = 'hold',       'Hold'
        NEXT_ROUND = 'next_round', 'Next Round'

    # ── Relationship ──────────────────────────────────────────────────────────
    interview = models.OneToOneField(
        Interview,
        on_delete=models.CASCADE,
        related_name='evaluation',
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='evaluations_given',
    )

    # ── Score dimensions (1–5) ────────────────────────────────────────────────
    _score_validators = [MinValueValidator(1), MaxValueValidator(5)]

    technical_score      = models.PositiveSmallIntegerField(validators=_score_validators)
    communication_score  = models.PositiveSmallIntegerField(validators=_score_validators)
    motivation_score     = models.PositiveSmallIntegerField(validators=_score_validators)
    problem_solving_score = models.PositiveSmallIntegerField(validators=_score_validators)

    # ── Computed overall (stored for fast querying) ───────────────────────────
    overall_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)

    # ── Decision ──────────────────────────────────────────────────────────────
    recommendation = models.CharField(max_length=20, choices=Recommendation.choices)
    comments       = models.TextField(blank=True, null=True)

    # ── Timestamp ─────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Evaluation for Interview #{self.interview_id} — {self.recommendation}"

    def compute_overall_score(self) -> Decimal:
        """
        Weighted average:
          technical       40 %
          communication   25 %
          problem_solving 25 %
          motivation      10 %
        Returns a value in the 1.00–5.00 range as a Decimal.
        """
        from decimal import Decimal as D
        weights = {
            'technical':      D('0.40'),
            'communication':  D('0.25'),
            'problem_solving': D('0.25'),
            'motivation':     D('0.10'),
        }
        score = (
            D(str(self.technical_score))      * weights['technical'] +
            D(str(self.communication_score))  * weights['communication'] +
            D(str(self.problem_solving_score)) * weights['problem_solving'] +
            D(str(self.motivation_score))     * weights['motivation']
        )
        return score.quantize(D('0.01'))

    def save(self, *args, **kwargs):
        """Auto-compute overall_score before every save."""
        self.overall_score = self.compute_overall_score()
        super().save(*args, **kwargs)

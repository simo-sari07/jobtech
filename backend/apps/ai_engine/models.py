"""
AI Engine models.

CandidateScore: stores the result of the AI scoring pipeline for one application.
One-to-one with Application — created after the Celery task chain completes.
"""
from django.db import models


class CandidateScore(models.Model):
    """
    AI-generated score for a single job application.

    Lifecycle: parse_cv_task → score_candidate_task → this record is created.
    The model_version field allows audit and re-processing when the scoring
    logic changes (bump AI_MODEL_VERSION in settings).

    Properties:
        score_label  — human label (Excellent / Good / Average / Weak)
        score_color  — CSS colour name for UI badging
    """

    # ── Relationship ──────────────────────────────────────────────────────────
    application = models.OneToOneField(
        'applications.Application',
        on_delete=models.CASCADE,
        related_name='ai_score_detail',
    )

    # ── Score dimensions ──────────────────────────────────────────────────────
    match_score         = models.DecimalField(max_digits=5, decimal_places=2)
    skills_match        = models.DecimalField(max_digits=5, decimal_places=2)
    experience_match    = models.DecimalField(max_digits=5, decimal_places=2)
    keyword_score       = models.DecimalField(max_digits=5, decimal_places=2)

    # ── Extracted CV data (cached for fast display) ───────────────────────────
    extracted_skills      = models.JSONField(null=True, blank=True)
    extracted_experience  = models.SmallIntegerField(null=True, blank=True)

    # ── AI narrative ──────────────────────────────────────────────────────────
    strengths  = models.JSONField(null=True, blank=True)
    gaps       = models.JSONField(null=True, blank=True)
    reasoning  = models.TextField(blank=True)

    # ── Audit / error tracking ────────────────────────────────────────────────
    model_version = models.CharField(max_length=20)
    error         = models.TextField(blank=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = 'Candidate Score'
        verbose_name_plural = 'Candidate Scores'
        ordering            = ['-match_score']

    def __str__(self):
        return (
            f"Score #{self.pk} — "
            f"{self.application.candidate.email} → "
            f"{self.application.job.title} [{self.match_score}%]"
        )

    # ── Computed properties ───────────────────────────────────────────────────

    @property
    def score_label(self) -> str:
        score = float(self.match_score)
        if score >= 80:
            return 'Excellent'
        if score >= 60:
            return 'Good'
        if score >= 40:
            return 'Average'
        return 'Weak'

    @property
    def score_color(self) -> str:
        score = float(self.match_score)
        if score >= 80:
            return 'green'
        if score >= 60:
            return 'amber'
        return 'red'

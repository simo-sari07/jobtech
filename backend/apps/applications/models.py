"""
Application domain models.
Application: a candidate's submission for a specific job offer.
"""
import os
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


def cv_upload_path(instance, filename):
    """Store CVs under: media/cvs/<candidate_id>/<filename>"""
    ext = filename.rsplit('.', 1)[-1].lower()
    safe_name = f"cv_{instance.candidate_id}.{ext}"
    return os.path.join('cvs', str(instance.candidate_id), safe_name)


def validate_pdf(value):
    """Enforce PDF-only uploads with size limit."""
    max_size_mb = getattr(settings, 'CV_MAX_UPLOAD_MB', 5)
    if value.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f'File size must be under {max_size_mb}MB.')
    # Check content type
    if hasattr(value, 'content_type') and value.content_type != 'application/pdf':
        raise ValidationError('Only PDF files are accepted.')
    # Fallback: check extension
    name = value.name.lower()
    if not name.endswith('.pdf'):
        raise ValidationError('Only .pdf files are accepted.')


class Application(models.Model):
    """
    A candidate's job application.
    Status pipeline: pending → in_review → shortlisted → rejected | hired
    """

    class Status(models.TextChoices):
        PENDING     = 'pending',     'Pending'
        IN_REVIEW   = 'in_review',   'In Review'
        SHORTLISTED = 'shortlisted', 'Shortlisted'
        REJECTED    = 'rejected',    'Rejected'
        HIRED       = 'hired',       'Hired'

    # ── Relationships ────────────────────────────────────────────────────────
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='applications',
    )
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='applications',
    )

    # ── Application content ──────────────────────────────────────────────────
    status       = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    cv_file      = models.FileField(upload_to=cv_upload_path, validators=[validate_pdf])
    cover_letter = models.TextField(blank=True, null=True)

    # ── Internal recruiter fields ─────────────────────────────────────────────
    notes    = models.TextField(blank=True, null=True)
    ai_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['candidate', 'job'],
                name='unique_candidate_job_application',
            )
        ]

    def __str__(self):
        return f"{self.candidate.email} → {self.job.title} [{self.status}]"

    @property
    def is_terminal(self):
        """Hired and Rejected are terminal states — no further transitions."""
        return self.status in (self.Status.HIRED, self.Status.REJECTED)

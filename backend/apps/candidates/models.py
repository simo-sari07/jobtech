"""
Candidates app — CandidateProfile, SavedJob, Notification models.
"""
import os
from django.db import models
from django.conf import settings


def candidate_cv_upload_path(instance, filename):
    """Store default CVs under: media/candidate_profiles/<user_id>/cv.<ext>"""
    ext = filename.rsplit('.', 1)[-1].lower()
    return os.path.join('candidate_profiles', str(instance.user_id), f'cv.{ext}')


class CandidateProfile(models.Model):
    """
    Extended profile for candidate users.
    Created on-demand (first PATCH to /api/v1/candidates/profile/).
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='candidate_profile',
    )

    bio      = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=150, blank=True, null=True)
    linkedin_url = models.URLField(blank=True, null=True)
    github_url   = models.URLField(blank=True, null=True)

    # Stored as JSON arrays for flexibility — avoids complex child tables at this stage
    skills     = models.JSONField(default=list, blank=True)
    experience = models.JSONField(default=list, blank=True)  # [{title, company, start_date, end_date, description}]
    education  = models.JSONField(default=list, blank=True)  # [{degree, school, year}]

    # Default CV — used for "quick apply"
    cv_file = models.FileField(
        upload_to=candidate_cv_upload_path,
        blank=True,
        null=True,
        help_text='Default CV used for quick applications.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'candidate_profiles'
        verbose_name = 'Candidate Profile'

    def __str__(self):
        return f'Profile of {self.user.email}'


class SavedJob(models.Model):
    """A candidate's saved (bookmarked) job offer."""
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_jobs',
    )
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        related_name='saved_by',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'candidate_saved_jobs'
        unique_together = [('candidate', 'job')]
        ordering = ['-created_at']
        verbose_name = 'Saved Job'

    def __str__(self):
        return f'{self.candidate.email} saved {self.job.title}'


class Notification(models.Model):
    """In-app notification for candidates and staff."""

    class Types(models.TextChoices):
        APP_SUBMITTED    = 'app_submitted',    'Application Submitted'
        STATUS_CHANGED   = 'status_changed',   'Application Status Changed'
        JOB_POSTED       = 'job_posted',       'New Job Posted'
        INTERVIEW        = 'interview',        'Interview Scheduled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type        = models.CharField(max_length=30, choices=Types.choices, db_index=True)
    message     = models.TextField()
    is_read     = models.BooleanField(default=False, db_index=True)
    related_url = models.CharField(max_length=300, blank=True, null=True,
                                   help_text='Frontend route to navigate to on click.')
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'candidate_notifications'
        ordering = ['-created_at']
        verbose_name = 'Notification'
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
        ]

    def __str__(self):
        status = 'unread' if not self.is_read else 'read'
        return f'[{self.type}] → {self.user.email} ({status})'

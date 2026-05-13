"""
Job domain models.
- Skill: normalised skill tags (Python, React, etc.)
- Job: a job offer with full lifecycle management
"""
from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid


class Skill(models.Model):
    """A normalised skill tag that can be linked to many jobs."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Job(models.Model):
    """
    A job offer posted by a recruiter or HR manager.
    Status lifecycle: draft → open → in_progress → closed
    """

    class ContractType(models.TextChoices):
        CDI        = 'cdi',        'CDI (Permanent)'
        CDD        = 'cdd',        'CDD (Fixed-term)'
        INTERNSHIP = 'internship', 'Internship'
        FREELANCE  = 'freelance',  'Freelance'

    class Status(models.TextChoices):
        DRAFT       = 'draft',       'Draft'
        OPEN        = 'open',        'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        CLOSED      = 'closed',      'Closed'

    # ── Core fields ──────────────────────────────────────────────────────────
    title            = models.CharField(max_length=200)
    description      = models.TextField()
    contract_type    = models.CharField(max_length=20, choices=ContractType.choices)
    location         = models.CharField(max_length=200)
    experience_years = models.PositiveSmallIntegerField(default=0)
    salary_min       = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    salary_max       = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deadline         = models.DateField(null=True, blank=True)
    slug             = models.SlugField(max_length=255, unique=True, blank=True)

    # ── Status & ownership ───────────────────────────────────────────────────
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_jobs',
    )

    # ── Skills ───────────────────────────────────────────────────────────────
    skills = models.ManyToManyField(Skill, blank=True, related_name='jobs')

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} [{self.status}]"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            self.slug = f"{base}-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    @property
    def is_open(self):
        return self.status == self.Status.OPEN

    @property
    def application_count(self):
        return self.applications.count()

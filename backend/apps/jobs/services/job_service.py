"""
Job service layer — ALL business logic lives here.
Views call these functions and stay thin.
"""
from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied
from ..models import Job
from ...users.models import User


# ── Valid status transitions ──────────────────────────────────────────────────
VALID_TRANSITIONS = {
    Job.Status.DRAFT:       [Job.Status.OPEN, Job.Status.CLOSED],
    Job.Status.OPEN:        [Job.Status.IN_PROGRESS, Job.Status.CLOSED],
    Job.Status.IN_PROGRESS: [Job.Status.CLOSED],
    Job.Status.CLOSED:      [],  # Terminal — no transitions allowed
}


def validate_status_transition(current: str, new: str) -> None:
    """Raise ValidationError if the status transition is not allowed."""
    allowed = VALID_TRANSITIONS.get(current, [])
    if new not in allowed and new != current:
        raise ValidationError(
            f"Cannot transition from '{current}' to '{new}'. "
            f"Allowed transitions: {[s for s in allowed] or 'none (terminal state)'}."
        )


@transaction.atomic
def create_job(user: User, validated_data: dict) -> Job:
    """Create a new job offer and assign the creator."""
    skills = validated_data.pop('skills', [])
    job = Job.objects.create(created_by=user, **validated_data)
    if skills:
        job.skills.set(skills)
    return job


@transaction.atomic
def update_job(job: Job, user: User, validated_data: dict) -> Job:
    """
    Update a job offer.
    Validates status transitions. Candidates cannot call this.
    """
    new_status = validated_data.get('status', job.status)

    if new_status != job.status:
        validate_status_transition(job.status, new_status)

        # When closing: reject all pending applications automatically
        if new_status == Job.Status.CLOSED:
            _reject_pending_applications(job)

    skills = validated_data.pop('skills', None)

    for attr, value in validated_data.items():
        setattr(job, attr, value)
    job.save()

    if skills is not None:
        job.skills.set(skills)

    return job


def _reject_pending_applications(job: Job) -> None:
    """Auto-reject any pending/in_review applications when a job is closed."""
    from ...applications.models import Application
    job.applications.filter(
        status__in=[Application.Status.PENDING, Application.Status.IN_REVIEW]
    ).update(status=Application.Status.REJECTED)


def get_jobs_queryset(user: User):
    """
    Return the correct queryset for the given role:
    - Candidates see only open jobs
    - HR/Recruiters/Admin see all
    """
    qs = Job.objects.select_related('created_by').prefetch_related('skills')
    if user.role == User.Roles.CANDIDATE:
        return qs.filter(status=Job.Status.OPEN)
    return qs


def delete_job(job: Job, user: User) -> None:
    """Only admins can delete jobs."""
    if user.role != User.Roles.ADMIN:
        raise PermissionDenied('Only administrators can delete job offers.')
    job.delete()

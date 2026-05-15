"""
Application service layer — ALL business logic lives here.
Views are thin and only call these functions.
"""
from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.applications.models import Application
from apps.jobs.models import Job
from apps.users.models import User
from apps.candidates.notification_service import notify


# ── Valid status transitions ──────────────────────────────────────────────────
VALID_TRANSITIONS = {
    Application.Status.PENDING:     [Application.Status.IN_REVIEW, Application.Status.REJECTED],
    Application.Status.IN_REVIEW:   [Application.Status.SHORTLISTED, Application.Status.REJECTED],
    Application.Status.SHORTLISTED: [Application.Status.HIRED, Application.Status.REJECTED],
    Application.Status.HIRED:       [],  # Terminal
    Application.Status.REJECTED:    [],  # Terminal
}


def validate_status_transition(current: str, new: str) -> None:
    """Raise ValidationError if the status transition is not allowed."""
    allowed = VALID_TRANSITIONS.get(current, [])
    if new not in allowed and new != current:
        raise ValidationError(
            f"Cannot transition from '{current}' to '{new}'. "
            f"Allowed: {allowed or 'none (terminal state)'}."
        )


@transaction.atomic
def submit_application(candidate: User, validated_data: dict) -> Application:
    """
    Create a new application.
    Validates:
    - Job must be open
    - Candidate has not already applied
    """
    job = validated_data['job']

    # Double-check job is open (serializer validates but service is the source of truth)
    if not job.is_open:
        raise ValidationError('This job offer is no longer accepting applications.')

    # Prevent duplicate applications
    if Application.objects.filter(candidate=candidate, job=job).exists():
        raise ValidationError('You have already applied for this position.')

    application = Application.objects.create(candidate=candidate, **validated_data)

    # Notify candidate of successful submission
    notify(
        user=candidate,
        notif_type='app_submitted',
        message=f'Your application for "{job.title}" has been submitted successfully.',
        related_url='/dashboard/candidate/applications',
    )

    # Trigger AI CV parsing pipeline (on_commit ensures the row is committed first)
    def _trigger_ai():
        try:
            from apps.ai_engine.tasks import parse_cv_task
            parse_cv_task.apply_async(args=[application.pk], queue='ai')
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                'Could not trigger AI pipeline for application #%d: %s', application.pk, exc
            )

    transaction.on_commit(_trigger_ai)

    return application


@transaction.atomic
def update_application_status(
    application: Application,
    user: User,
    new_status: str,
    notes: str | None = None,
) -> Application:
    """
    Advance an application through the status pipeline.
    Only Recruiters, HR Managers, and Admins can do this.
    """
    allowed_roles = (User.Roles.ADMIN, User.Roles.HR_MANAGER, User.Roles.RECRUITER)
    if user.role not in allowed_roles:
        raise PermissionDenied('You do not have permission to update application statuses.')

    if application.is_terminal:
        raise ValidationError(
            f'This application is already in a terminal state ({application.status}).'
        )

    validate_status_transition(application.status, new_status)

    application.status = new_status
    if notes is not None:
        application.notes = notes
    application.save(update_fields=['status', 'notes', 'updated_at'])

    # Notify candidate of status change
    status_labels = {
        Application.Status.IN_REVIEW:   'is now under review',
        Application.Status.SHORTLISTED: 'has been shortlisted 🎉',
        Application.Status.HIRED:       'has been accepted — congratulations! 🎊',
        Application.Status.REJECTED:    'was not selected this time',
    }
    label = status_labels.get(new_status, f'moved to {new_status}')
    notify(
        user=application.candidate,
        notif_type='status_changed',
        message=f'Your application for "{application.job.title}" {label}.',
        related_url='/dashboard/candidate/applications',
    )

    return application


def get_applications_queryset(user: User):
    """
    Role-scoped queryset:
    - Candidate: only their own applications
    - Recruiter/HR/Admin: all applications
    """
    qs = Application.objects.select_related('candidate', 'job', 'job__created_by')
    if user.role == User.Roles.CANDIDATE:
        return qs.filter(candidate=user)
    return qs

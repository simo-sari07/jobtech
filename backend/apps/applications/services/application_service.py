"""
Application service layer — ALL business logic lives here.
Views are thin and only call these functions.
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from ..models import Application, ApplicationAuditLog
from ...jobs.models import Job
from ...users.models import User
from ...candidates.notification_service import notify

logger = logging.getLogger(__name__)


# ── Valid status transitions ──────────────────────────────────────────────────
VALID_TRANSITIONS = {
    Application.Status.PENDING:     [Application.Status.IN_REVIEW, Application.Status.REJECTED],
    Application.Status.IN_REVIEW:   [Application.Status.SHORTLISTED, Application.Status.REJECTED],
    Application.Status.SHORTLISTED: [Application.Status.INTERVIEW, Application.Status.HIRED, Application.Status.REJECTED],
    Application.Status.INTERVIEW:   [Application.Status.HIRED, Application.Status.REJECTED],
    Application.Status.HIRED:       [],
    Application.Status.REJECTED:    [],
    Application.Status.WITHDRAWN:   [],
}


def _log_action(application, action, user, old_value='', new_value='', note=''):
    """Create an immutable audit log entry."""
    ApplicationAuditLog.objects.create(
        application=application,
        action=action,
        performed_by=user,
        old_value=old_value,
        new_value=new_value,
        note=note,
    )


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

    if not job.is_open:
        raise ValidationError('This job offer is no longer accepting applications.')

    if Application.objects.filter(candidate=candidate, job=job).exists():
        raise ValidationError('You have already applied for this position.')

    application = Application.objects.create(candidate=candidate, **validated_data)

    _log_action(application, ApplicationAuditLog.Action.CREATED, candidate,
                new_value='pending', note=f'Applied for {job.title}')

    notify(
        user=candidate,
        notif_type='app_submitted',
        message=f'Your application for "{job.title}" has been submitted successfully.',
        related_url='/dashboard/candidate/applications',
    )

    def _trigger_ai():
        try:
            from ...ai_engine.tasks import parse_cv_task
            parse_cv_task.apply_async(args=[application.pk], queue='ai')
        except Exception as exc:
            logger.warning(
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

    old_status = application.status
    application.status = new_status
    if notes is not None:
        application.notes = notes
    application.save(update_fields=['status', 'notes', 'updated_at'])

    _log_action(application, ApplicationAuditLog.Action.STATUS_CHANGE, user,
                old_value=old_status, new_value=new_status,
                note=notes or '')

    status_labels = {
        Application.Status.IN_REVIEW:   'is now under review',
        Application.Status.SHORTLISTED: 'has been shortlisted 🎉',
        Application.Status.INTERVIEW:   'has moved to the interview stage 📋',
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


@transaction.atomic
def archive_application(application: Application, user: User) -> Application:
    """Archive an application. Admin and HR only."""
    if user.role not in (User.Roles.ADMIN, User.Roles.HR_MANAGER):
        raise PermissionDenied('Only admins and HR managers can archive applications.')
    if application.is_archived:
        raise ValidationError('Application is already archived.')

    application.is_archived = True
    application.archived_by = user
    application.archived_at = timezone.now()
    application.save(update_fields=['is_archived', 'archived_by', 'archived_at', 'updated_at'])

    _log_action(application, ApplicationAuditLog.Action.ARCHIVED, user)
    return application


@transaction.atomic
def unarchive_application(application: Application, user: User) -> Application:
    """Restore an archived application."""
    if user.role not in (User.Roles.ADMIN, User.Roles.HR_MANAGER):
        raise PermissionDenied('Only admins and HR managers can unarchive applications.')
    if not application.is_archived:
        raise ValidationError('Application is not archived.')

    application.is_archived = False
    application.archived_by = None
    application.archived_at = None
    application.save(update_fields=['is_archived', 'archived_by', 'archived_at', 'updated_at'])

    _log_action(application, ApplicationAuditLog.Action.UNARCHIVED, user)
    return application


@transaction.atomic
def delete_application(application: Application, user: User) -> None:
    """Permanently delete. Admin only."""
    if user.role != User.Roles.ADMIN:
        raise PermissionDenied('Only administrators can permanently delete applications.')

    _log_action(application, ApplicationAuditLog.Action.DELETED, user,
                note=f'Deleted application #{application.pk} ({application.candidate.email} → {application.job.title})')
    application.delete()


@transaction.atomic
def withdraw_application(application: Application, user: User) -> Application:
    """Candidate withdraws their own application (only before in_review)."""
    if application.candidate_id != user.pk:
        raise PermissionDenied('You can only withdraw your own application.')
    if application.status not in (Application.Status.PENDING, Application.Status.SHORTLISTED, Application.Status.INTERVIEW):
        raise ValidationError('You can only withdraw applications that are still pending.')

    old_status = application.status
    application.status = Application.Status.WITHDRAWN
    application.save(update_fields=['status', 'updated_at'])

    _log_action(application, ApplicationAuditLog.Action.WITHDRAWN, user,
                old_value=old_status, new_value='withdrawn')
    return application


@transaction.atomic
def bulk_update_status(application_ids: list[int], new_status: str, user: User) -> int:
    """Bulk status update for staff. Returns count of updated applications."""
    allowed_roles = (User.Roles.ADMIN, User.Roles.HR_MANAGER, User.Roles.RECRUITER)
    if user.role not in allowed_roles:
        raise PermissionDenied('Insufficient permissions for bulk operations.')

    apps = Application.objects.filter(pk__in=application_ids, is_archived=False)
    updated = 0
    for app in apps:
        try:
            validate_status_transition(app.status, new_status)
        except ValidationError:
            continue
        if app.is_terminal:
            continue
        old = app.status
        app.status = new_status
        app.save(update_fields=['status', 'updated_at'])
        _log_action(app, ApplicationAuditLog.Action.STATUS_CHANGE, user,
                    old_value=old, new_value=new_status, note='Bulk action')
        updated += 1
    return updated


@transaction.atomic
def bulk_archive(application_ids: list[int], user: User) -> int:
    """Bulk archive for Admin/HR. Returns count of archived applications."""
    if user.role not in (User.Roles.ADMIN, User.Roles.HR_MANAGER):
        raise PermissionDenied('Only admins and HR managers can archive applications.')

    apps = Application.objects.filter(pk__in=application_ids, is_archived=False)
    now = timezone.now()
    count = 0
    for app in apps:
        app.is_archived = True
        app.archived_by = user
        app.archived_at = now
        app.save(update_fields=['is_archived', 'archived_by', 'archived_at', 'updated_at'])
        _log_action(app, ApplicationAuditLog.Action.ARCHIVED, user, note='Bulk archive')
        count += 1
    return count


@transaction.atomic
def bulk_delete(application_ids: list[int], user: User) -> int:
    """Bulk permanent delete. Admin only."""
    if user.role != User.Roles.ADMIN:
        raise PermissionDenied('Only administrators can permanently delete applications.')

    apps = Application.objects.filter(pk__in=application_ids)
    count = 0
    for app in apps:
        _log_action(app, ApplicationAuditLog.Action.DELETED, user,
                    note=f'Bulk deleted application #{app.pk}')
        app.delete()
        count += 1
    return count


def get_applications_queryset(user: User, include_archived: bool = False):
    """
    Role-scoped queryset:
    - Candidate: only their own applications (non-withdrawn by default)
    - Recruiter/HR/Admin: all applications (non-archived by default)
    """
    qs = Application.objects.select_related('candidate', 'job', 'job__created_by')
    if user.role == User.Roles.CANDIDATE:
        return qs.filter(candidate=user)
    if not include_archived:
        qs = qs.filter(is_archived=False)
    return qs

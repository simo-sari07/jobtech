"""
Interview service layer — ALL business logic lives here.
Views are thin wrappers that only call these functions.
"""
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.interviews.models import Interview, Evaluation
from apps.applications.models import Application
from apps.users.models import User
from apps.candidates.notification_service import notify


# ─────────────────────────────────────────────────────────────────────────────
# Scheduling
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def schedule_interview(recruiter: User, validated_data: dict) -> Interview:
    """
    Create a new interview from validated serializer data.

    Business rules:
    - recruiter must have recruiter / HR / admin role
    - application must be in SHORTLISTED status
    - scheduled_at must be in the future (also validated in serializer, double-checked here)
    - sends notifications to both candidate and recruiter
    """
    allowed_roles = (User.Roles.ADMIN, User.Roles.HR_MANAGER, User.Roles.RECRUITER)
    if recruiter.role not in allowed_roles:
        raise PermissionDenied('Only recruiters and HR managers can schedule interviews.')

    application: Application = validated_data['application']

    if application.status != Application.Status.SHORTLISTED:
        raise ValidationError(
            'Interviews can only be scheduled for shortlisted applications.'
        )

    scheduled_at = validated_data['scheduled_at']
    if scheduled_at <= timezone.now():
        raise ValidationError('Scheduled date must be in the future.')

    interview = Interview.objects.create(
        recruiter=recruiter,
        **validated_data,
    )

    candidate = application.candidate

    # Notify candidate
    notify(
        user=candidate,
        notif_type='interview_scheduled',
        message=(
            f'An interview has been scheduled for your application to '
            f'"{application.job.title}" on '
            f'{scheduled_at.strftime("%d %b %Y at %H:%M")}.'
        ),
        related_url='/dashboard/candidate/interviews',
    )

    # Notify recruiter (confirmation)
    notify(
        user=recruiter,
        notif_type='interview_scheduled',
        message=(
            f'Interview scheduled with {candidate.get_full_name()} '
            f'for "{application.job.title}" on '
            f'{scheduled_at.strftime("%d %b %Y at %H:%M")}.'
        ),
        related_url='/dashboard/recruiter/interviews',
    )

    return interview


# ─────────────────────────────────────────────────────────────────────────────
# Status Update
# ─────────────────────────────────────────────────────────────────────────────

VALID_STATUS_TRANSITIONS = {
    Interview.Status.SCHEDULED: [
        Interview.Status.COMPLETED,
        Interview.Status.CANCELLED,
        Interview.Status.NO_SHOW,
    ],
    Interview.Status.COMPLETED: [],
    Interview.Status.CANCELLED: [],
    Interview.Status.NO_SHOW:   [],
}


@transaction.atomic
def update_interview(
    interview: Interview,
    user: User,
    validated_data: dict,
) -> Interview:
    """
    Update interview status and/or notes.
    Enforces valid status transitions.
    Sends notification to candidate on meaningful status changes.
    """
    allowed_roles = (User.Roles.ADMIN, User.Roles.HR_MANAGER, User.Roles.RECRUITER)
    if user.role not in allowed_roles:
        raise PermissionDenied('Only recruiters and HR managers can update interviews.')

    new_status = validated_data.get('status', interview.status)

    if new_status != interview.status:
        allowed = VALID_STATUS_TRANSITIONS.get(interview.status, [])
        if new_status not in allowed:
            raise ValidationError(
                f"Cannot transition from '{interview.status}' to '{new_status}'. "
                f"Allowed: {[s.value for s in allowed] or 'none (terminal state)'}."
            )

        # Notify candidate on status change
        labels = {
            Interview.Status.COMPLETED: 'has been marked as completed.',
            Interview.Status.CANCELLED: 'has been cancelled.',
            Interview.Status.NO_SHOW:   'was marked as no-show.',
        }
        label = labels.get(new_status, f'status changed to {new_status}.')
        notify(
            user=interview.application.candidate,
            notif_type='interview_status_changed',
            message=(
                f'Your interview for "{interview.application.job.title}" {label}'
            ),
            related_url='/dashboard/candidate/interviews',
        )

    for field, value in validated_data.items():
        setattr(interview, field, value)

    interview.save()
    return interview


# ─────────────────────────────────────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────────────────────────────────────

@transaction.atomic
def submit_evaluation(
    interview: Interview,
    evaluator: User,
    validated_data: dict,
) -> Evaluation:
    """
    Create the evaluation scorecard for a completed interview.

    Rules:
    - Interview must be COMPLETED
    - No evaluation can already exist (1-to-1)
    - Marks interview as completed if not already (belt-and-suspenders)
    """
    allowed_roles = (User.Roles.ADMIN, User.Roles.HR_MANAGER, User.Roles.RECRUITER)
    if evaluator.role not in allowed_roles:
        raise PermissionDenied('Only recruiters and HR managers can evaluate interviews.')

    if interview.status != Interview.Status.COMPLETED:
        raise ValidationError(
            'An interview must be in "completed" status before it can be evaluated. '
            f'Current status: {interview.status}.'
        )

    if hasattr(interview, 'evaluation'):
        raise ValidationError(
            'This interview has already been evaluated. '
            'Each interview can only have one evaluation.'
        )

    evaluation = Evaluation.objects.create(
        interview=interview,
        evaluator=evaluator,
        **validated_data,
    )
    # overall_score is auto-computed in Evaluation.save()

    # Notify candidate with recommendation outcome
    labels = {
        Evaluation.Recommendation.HIRE:       'and the outcome is: Hire 🎉',
        Evaluation.Recommendation.REJECT:     'and the outcome is: Not selected.',
        Evaluation.Recommendation.HOLD:       'and the decision is on hold.',
        Evaluation.Recommendation.NEXT_ROUND: 'and you have advanced to the next round!',
    }
    label = labels.get(evaluation.recommendation, '')
    notify(
        user=interview.application.candidate,
        notif_type='evaluation_complete',
        message=(
            f'Your interview for "{interview.application.job.title}" '
            f'has been evaluated {label}'
        ),
        related_url='/dashboard/candidate/interviews',
    )

    return evaluation


# ─────────────────────────────────────────────────────────────────────────────
# Queryset helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_interviews_queryset(user: User):
    """
    Role-scoped queryset with all relations pre-fetched (zero N+1).
    - Recruiter: only interviews they are assigned to
    - HR Manager / Admin: all interviews
    - Candidate: interviews linked to their applications
    """
    qs = Interview.objects.select_related(
        'application',
        'application__candidate',
        'application__job',
        'recruiter',
    ).prefetch_related('evaluation')

    if user.role == User.Roles.CANDIDATE:
        return qs.filter(application__candidate=user)

    if user.role == User.Roles.RECRUITER:
        return qs.filter(recruiter=user)

    # HR Manager + Admin see everything
    return qs

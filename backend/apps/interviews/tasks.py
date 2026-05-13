"""
Celery tasks for the interviews app.

send_interview_reminders — Celery beat task (runs every hour).
    Finds interviews scheduled within the next 24 hours that have
    not yet had a reminder sent (reminder_sent=False), sends emails
    to both candidate and recruiter, then sets reminder_sent=True.

Task design rules (from master document):
- Never block HTTP requests — async always
- Retry up to 3x with exponential backoff on email failure
- Set reminder_sent=True atomically to prevent duplicates
"""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Reminder task (Celery Beat — runs every hour)
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,   # 1 minute between retries
    name='interviews.send_interview_reminders',
)
def send_interview_reminders(self):
    """
    Celery beat task — scheduled to run every hour.

    Finds all interviews:
      - status = SCHEDULED
      - reminder_sent = False
      - scheduled_at in the window (now, now + 24h]

    For each, sends reminder emails to candidate and recruiter,
    then sets reminder_sent=True.  Uses select_for_update() to
    prevent double-sends when multiple workers run concurrently.
    """
    from apps.interviews.models import Interview  # deferred to avoid circular import at startup

    now     = timezone.now()
    window  = now + timedelta(hours=24)

    # Lock rows being processed to prevent concurrent duplicate sends
    # We use skip_locked=True where supported (MySQL 8+), but fallback if not (SQLite tests)
    queryset = Interview.objects.select_related(
        'application__candidate',
        'application__job',
        'recruiter',
    ).filter(
        status=Interview.Status.SCHEDULED,
        reminder_sent=False,
        scheduled_at__gt=now,
        scheduled_at__lte=window,
    )

    try:
        interviews = list(queryset.select_for_update(skip_locked=True))
    except Exception:  # Falls back if skip_locked is not supported
        interviews = list(queryset.select_for_update())

    sent_count = 0
    for interview in interviews:
        try:
            _send_reminder_emails(interview)
            interview.reminder_sent = True
            interview.save(update_fields=['reminder_sent'])
            sent_count += 1
            logger.info(
                'Reminder sent for interview #%s scheduled at %s',
                interview.pk,
                interview.scheduled_at,
            )
        except Exception as exc:
            logger.warning(
                'Failed to send reminder for interview #%s: %s',
                interview.pk, exc,
            )
            # Retry the whole task — individual failures logged but not fatal
            try:
                raise self.retry(exc=exc, countdown=2 ** self.request.retries * 60)
            except self.MaxRetriesExceededError:
                logger.error(
                    'Max retries exceeded for interview #%s reminder.',
                    interview.pk,
                )

    logger.info('send_interview_reminders: %s reminder(s) sent.', sent_count)
    return {'sent': sent_count}


def _send_reminder_emails(interview) -> None:
    """
    Send reminder emails to the candidate and recruiter.
    Uses Django's send_mail — configured via EMAIL_* env vars.
    """
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@jobtech.io')
    scheduled  = interview.scheduled_at.strftime('%A %d %B %Y at %H:%M')
    job_title  = interview.application.job.title
    itype      = interview.get_interview_type_display()
    location   = interview.location_or_link or 'To be confirmed'

    candidate = interview.application.candidate
    recruiter = interview.recruiter

    # ── Candidate email ──────────────────────────────────────────────────────
    if candidate and candidate.email:
        send_mail(
            subject=f'[JobTech] Reminder: Your interview for "{job_title}" is tomorrow',
            message=(
                f'Hello {candidate.get_full_name()},\n\n'
                f'This is a reminder that your {itype} interview for the position '
                f'"{job_title}" is scheduled for:\n\n'
                f'  📅  {scheduled}\n'
                f'  📍  {location}\n\n'
                f'Please ensure you are available at the scheduled time.\n\n'
                f'Good luck!\n'
                f'— The JobTech Recruitment Team'
            ),
            from_email=from_email,
            recipient_list=[candidate.email],
            fail_silently=False,
        )

    # ── Recruiter email ──────────────────────────────────────────────────────
    if recruiter and recruiter.email:
        send_mail(
            subject=f'[JobTech] Reminder: Interview with {candidate.get_full_name()} tomorrow',
            message=(
                f'Hello {recruiter.get_full_name()},\n\n'
                f'Reminder: You have a {itype} interview scheduled with '
                f'{candidate.get_full_name()} for the position "{job_title}":\n\n'
                f'  📅  {scheduled}\n'
                f'  📍  {location}\n\n'
                f'Please review the candidate\'s profile before the session.\n\n'
                f'— The JobTech System'
            ),
            from_email=from_email,
            recipient_list=[recruiter.email],
            fail_silently=False,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Notification task (called from service after scheduling)
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name='interviews.send_interview_confirmation_email',
)
def send_interview_confirmation_email(self, interview_id: int) -> dict:
    """
    Async task: send confirmation emails after an interview is scheduled.
    Called from interview_service.schedule_interview().
    """
    from apps.interviews.models import Interview  # deferred

    try:
        interview = (
            Interview.objects
            .select_related(
                'application__candidate',
                'application__job',
                'recruiter',
            )
            .get(pk=interview_id)
        )
    except Interview.DoesNotExist:
        logger.error('Interview #%s not found for confirmation email.', interview_id)
        return {'error': 'not_found'}

    try:
        _send_reminder_emails(interview)  # reuse same body for confirmation
        logger.info('Confirmation emails sent for interview #%s.', interview_id)
        return {'sent': True, 'interview_id': interview_id}
    except Exception as exc:
        logger.warning('Confirmation email failed for interview #%s: %s', interview_id, exc)
        try:
            raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)
        except self.MaxRetriesExceededError:
            logger.error('Max retries for interview #%s confirmation.', interview_id)
            return {'error': str(exc)}

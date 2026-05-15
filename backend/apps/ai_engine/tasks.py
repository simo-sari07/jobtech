"""
AI Engine Celery tasks.

Chain: parse_cv_task → score_candidate_task

Both tasks:
- Queue: 'ai'
- max_retries: 3, retry_delay: 120s
- acks_late=True (task not acknowledged until complete — safe on worker crash)
- Detailed logging at every step
- Smart chaining: calls scoring directly when CELERY_TASK_ALWAYS_EAGER or no broker
"""
import logging
from decimal import Decimal

from celery import shared_task
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_application(application_id: int):
    """Load an Application or raise Application.DoesNotExist."""
    from ..applications.models import Application
    return Application.objects.select_related('job', 'candidate').get(pk=application_id)


def _chain_score_task(application_id: int):
    """
    Chain the scoring task after CV parsing.

    In eager/dev mode (no broker): call scoring directly.
    In production (broker available): use apply_async via on_commit.
    """
    eager = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)

    if eager:
        # Direct call — no broker needed
        logger.info('[chain] Eager mode: calling score_candidate_task directly for #%d', application_id)
        score_candidate_task(application_id)
    else:
        # Production: schedule via broker after transaction commits
        transaction.on_commit(
            lambda: score_candidate_task.apply_async(
                args=[application_id],
                queue='ai',
            )
        )


# ── Task 1: Parse CV ─────────────────────────────────────────────────────────

@shared_task(
    name='ai_engine.parse_cv',
    queue='ai',
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    acks_late=True,
    autoretry_for=(Exception,),
)
def parse_cv_task(self, application_id: int) -> None:
    """
    Extract and parse the CV for an application using GPT.
    Saves the result to application.ai_parsed_data.
    On success, chains score_candidate_task.
    """
    logger.info('[parse_cv_task] Starting for application #%d', application_id)

    from .services.cv_parser import parse_cv

    try:
        application = _get_application(application_id)
    except Exception as exc:
        logger.error('[parse_cv_task] Application #%d not found: %s', application_id, exc)
        return  # Non-retryable — application was deleted

    # Parse CV (never raises — returns parse_error on failure)
    parsed_data = parse_cv(application)

    # Save to application
    application.ai_parsed_data = parsed_data
    application.save(update_fields=['ai_parsed_data'])

    if parsed_data.get('parse_error'):
        logger.warning(
            '[parse_cv_task] Parse failed for application #%d: %s',
            application_id, parsed_data['parse_error']
        )
        # Still chain scoring so we get an error record in CandidateScore
    else:
        logger.info(
            '[parse_cv_task] Parsed successfully for application #%d (%d skills found)',
            application_id, len(parsed_data.get('skills', []))
        )

    # Chain: trigger scoring task
    _chain_score_task(application_id)


# ── Task 2: Score Candidate ───────────────────────────────────────────────────

@shared_task(
    name='ai_engine.score_candidate',
    queue='ai',
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    acks_late=True,
    autoretry_for=(Exception,),
)
def score_candidate_task(self, application_id: int) -> None:
    """
    Score the candidate for a job application using CV data + GPT.
    Creates/updates CandidateScore, syncs application.ai_score.
    """
    logger.info('[score_candidate_task] Starting for application #%d', application_id)

    from .models import CandidateScore
    from .services.matcher import score_candidate

    # Guard: skip if already scored
    if CandidateScore.objects.filter(application_id=application_id).exists():
        logger.info(
            '[score_candidate_task] Score already exists for application #%d — skipping.',
            application_id
        )
        return

    try:
        application = _get_application(application_id)
    except Exception as exc:
        logger.error('[score_candidate_task] Application #%d not found: %s', application_id, exc)
        return

    # Score (never raises)
    model_version = getattr(settings, 'AI_MODEL_VERSION', '1.0.0')
    score_data    = score_candidate(application)

    # Create/update score record
    CandidateScore.objects.update_or_create(
        application=application,
        defaults={
            'match_score':         Decimal(str(score_data.get('match_score', 0))),
            'skills_match':        Decimal(str(score_data.get('skills_match', 0))),
            'experience_match':    Decimal(str(score_data.get('experience_match', 0))),
            'keyword_score':       Decimal(str(score_data.get('keyword_score', 0))),
            'extracted_skills':    score_data.get('extracted_skills', []),
            'extracted_experience': score_data.get('extracted_experience'),
            'strengths':           score_data.get('strengths', []),
            'gaps':                score_data.get('gaps', []),
            'reasoning':           score_data.get('reasoning', ''),
            'error':               score_data.get('error', ''),
            'model_version':       model_version,
        },
    )

    # Sync application.ai_score
    application.ai_score = Decimal(str(score_data.get('match_score', 0)))
    application.save(update_fields=['ai_score'])

    logger.info(
        '[score_candidate_task] Scored application #%d -> %.1f%%',
        application_id, score_data.get('match_score', 0)
    )


# ── Periodic task: retry stalled AI tasks ─────────────────────────────────────

@shared_task(name='ai_engine.retry_stalled_tasks')
def retry_stalled_tasks() -> int:
    """
    Re-queue applications where AI parsing/scoring is stalled
    (ai_score is still null after 30 minutes of submission).
    """
    from django.utils import timezone
    from datetime import timedelta
    from ..applications.models import Application

    cutoff = timezone.now() - timedelta(minutes=30)
    stalled = Application.objects.filter(
        ai_score__isnull=True,
        ai_parsed_data__isnull=True,
        created_at__lt=cutoff,
    )

    count = 0
    for app in stalled:
        try:
            parse_cv_task.apply_async(args=[app.pk], queue='ai')
            count += 1
        except Exception as exc:
            logger.warning('Failed to re-queue application #%d: %s', app.pk, exc)

    if count:
        logger.info('[retry_stalled_tasks] Re-queued %d stalled applications', count)

    return count

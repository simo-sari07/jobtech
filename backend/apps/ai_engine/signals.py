"""
AI Engine signals — auto-trigger CV parsing when an Application is created.
"""
import logging
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='applications.Application')
def auto_process_new_application(sender, instance, created, **kwargs):
    """When a new application is created, trigger the AI pipeline."""
    if not created:
        return
    if not instance.cv_file:
        return

    eager = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)

    from .tasks import parse_cv_task

    if eager:
        logger.info('[signal] Auto-processing application #%d (eager mode)', instance.pk)
        parse_cv_task(instance.pk)
    else:
        from django.db import transaction
        transaction.on_commit(
            lambda: parse_cv_task.apply_async(args=[instance.pk], queue='ai')
        )

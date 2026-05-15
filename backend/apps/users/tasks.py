"""
Celery tasks for the users app.

Tasks:
  flush_presence_to_db   — every 60s:  Redis → bulk_update User.last_activity
  cleanup_stale_presence — every 10min: null out last_activity for expired users

Beat schedule is registered in config/celery.py.
"""
import logging
from datetime import datetime

from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

PRESENCE_KEY_PREFIX = 'jobtech:presence:'


def _get_redis():
    """Return the raw Redis client from the Django cache backend."""
    try:
        from django.core.cache import cache
        return cache.client.get_client()
    except Exception:
        return None


@shared_task(name='users.flush_presence_to_db', ignore_result=True)
def flush_presence_to_db():
    """
    Scan all Redis presence keys and bulk-update User.last_activity.

    Runs every 60 seconds via Celery beat.
    Using bulk_update means a single DB query for all active users,
    regardless of how many there are.

    Returns the number of users updated (useful for monitoring).
    """
    from .models import User

    client = _get_redis()
    if client is None:
        logger.warning('flush_presence_to_db: Redis unavailable — skipping flush.')
        return 0

    try:
        keys = list(client.scan_iter(f'{PRESENCE_KEY_PREFIX}*'))
    except Exception:
        logger.exception('flush_presence_to_db: error scanning Redis keys')
        return 0

    updates = []
    for key in keys:
        try:
            raw = client.get(key)
            if not raw:
                continue
            user_id_str = key.decode() if isinstance(key, bytes) else key
            user_id     = int(user_id_str.split(':')[-1])
            timestamp   = datetime.fromisoformat(
                raw.decode() if isinstance(raw, bytes) else raw
            )
            updates.append(User(id=user_id, last_activity=timestamp))
        except (ValueError, AttributeError):
            logger.warning('flush_presence_to_db: skipping malformed key %s', key)

    if updates:
        User.objects.bulk_update(updates, ['last_activity'])
        logger.debug('flush_presence_to_db: updated %d users', len(updates))

    return len(updates)


@shared_task(name='users.cleanup_stale_presence', ignore_result=True)
def cleanup_stale_presence():
    """
    Null-out last_activity for users whose Redis presence key has expired.

    A Redis key expires automatically after PRESENCE_TTL_SECONDS (5min).
    When the key is gone, the user is offline — this task keeps the DB
    consistent by zeroing out the stale timestamp.

    Runs every 10 minutes via Celery beat.
    We use a 6-minute cutoff (1min grace) to avoid a race where:
      flush_presence_to_db ran at t=0, cleanup runs at t=5:01,
      but user made a request at t=4:55 (key still exists, DB not yet flushed).
    """
    from .models import User

    cutoff = timezone.now() - timedelta(minutes=6)
    count = User.objects.filter(
        last_activity__isnull=False,
        last_activity__lt=cutoff,
    ).update(last_activity=None)

    if count:
        logger.info('cleanup_stale_presence: cleared last_activity for %d users', count)

    return count

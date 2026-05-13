"""
Online Presence Middleware.

Strategy (avoids a DB write on every request):
  1. On each authenticated request → write to Redis with a 5-minute TTL.
     Redis key: "jobtech:presence:{user_id}"  →  ISO timestamp
  2. A Celery beat task (flush_presence_to_db, every 60s) reads all Redis
     presence keys and bulk-updates User.last_activity in one query.
  3. When a Redis key expires (user stops making requests), the presence
     vanishes automatically — no explicit "logout" needed.

This middleware MUST be registered AFTER AuthenticationMiddleware in
config/settings/base.py so that request.user is already resolved.

If Redis is unavailable (ConnectionError), the middleware degrades
gracefully — the request proceeds, and last_activity simply isn't updated.
"""
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)

# Redis client is a module-level singleton — instantiated once, reused per request.
_redis_client = None


def _get_redis():
    """
    Lazy-initialise the Redis client.

    Using django.core.cache avoids duplicating connection config —
    the Redis URL is already in settings.CACHES['default'].
    Falls back to None if the cache backend isn't Redis.
    """
    global _redis_client
    if _redis_client is None:
        try:
            from django.core.cache import cache
            # django-redis exposes the raw client via cache.client.get_client()
            _redis_client = cache.client.get_client()
        except Exception:
            logger.warning('OnlinePresenceMiddleware: Redis client unavailable. Presence tracking disabled.')
            _redis_client = False   # Falsy sentinel — won't retry each request
    return _redis_client or None


PRESENCE_KEY_PREFIX = 'jobtech:presence:'
PRESENCE_TTL_SECONDS = 300   # 5 minutes


class OnlinePresenceMiddleware:
    """
    Updates the Redis presence key for every authenticated API request.

    Registration: add AFTER AuthenticationMiddleware in MIDDLEWARE list:
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'core.middleware.OnlinePresenceMiddleware',
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only track authenticated users making API requests
        if (
            hasattr(request, 'user')
            and request.user.is_authenticated
            and request.path.startswith('/api/')
        ):
            self._update_presence(request.user.id)

        return response

    def _update_presence(self, user_id: int) -> None:
        """Write/refresh the presence key in Redis. Fails silently on errors."""
        try:
            client = _get_redis()
            if client is None:
                return
            key = f'{PRESENCE_KEY_PREFIX}{user_id}'
            client.setex(key, PRESENCE_TTL_SECONDS, timezone.now().isoformat())
        except Exception:
            # Never crash a request because of presence tracking
            logger.exception('OnlinePresenceMiddleware: failed to update presence for user_id=%s', user_id)

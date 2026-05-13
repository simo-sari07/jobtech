"""Notification service — called from other app services."""


def notify(user, notif_type: str, message: str, related_url: str = None):
    """
    Create a notification for a user. Silent on failure.

    Import is deferred inside the function body to avoid circular imports
    when this module is imported by apps.applications.services at startup.
    """
    try:
        # Lazy import — avoids circular import with apps.candidates.models
        from apps.candidates.models import Notification
        Notification.objects.create(
            user=user,
            type=notif_type,
            message=message,
            related_url=related_url,
        )
    except Exception:
        pass  # Notifications are best-effort — never break the main flow

"""
Audit Service — centralised, append-only audit logging.

Design principles:
- ONE public function: log_action().  Every admin operation in the project
  calls this single entry point, so the log format is always consistent.
- Never fails silently: if the write fails, a logged exception is raised
  so the caller knows the action could not be audited.  This is intentional —
  an unaudited admin action should be treated as an error, not ignored.
- IP and User-Agent are extracted here, not at the call-site, to prevent
  accidental omission.
- Metadata is sanitised before storage: any key containing 'password',
  'token', or 'secret' is stripped, regardless of nesting level.
"""
import logging
from typing import Any

from apps.users.models import User, UserAuditLog

logger = logging.getLogger(__name__)

# Keys that must never appear in stored metadata (case-insensitive substring match)
_SENSITIVE_KEYS = frozenset({'password', 'token', 'secret', 'refresh', 'access'})


# ─── Public API ───────────────────────────────────────────────────────────────

def log_action(
    actor: User | None,
    subject: User | None,
    action: str,
    *,
    request=None,
    metadata: dict | None = None,
) -> UserAuditLog:
    """
    Create an immutable audit log entry.

    Args:
        actor:    The user who performed the action (typically an admin).
                  Pass None for system-initiated actions (e.g. automated cleanup).
        subject:  The user the action was performed on.
                  Pass None when not applicable (e.g. failed login with unknown email).
        action:   One of UserAuditLog.Actions choices.
        request:  The DRF/Django request object.  Used to extract the client's
                  IP address and User-Agent header.  Optional but recommended.
        metadata: Arbitrary dict of before/after values or context.
                  Sensitive fields are stripped automatically.

    Returns:
        The created UserAuditLog instance.

    Raises:
        Exception: Re-raised after logging if the DB write fails.
                   Callers must NOT swallow this — an unaudited admin action
                   is a security concern.
    """
    ip_address = _extract_ip(request)
    user_agent = _extract_user_agent(request)
    safe_metadata = _sanitise_metadata(metadata)

    try:
        entry = UserAuditLog.objects.create(
            actor=actor,
            subject=subject,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=safe_metadata,
        )
        logger.info(
            'AUDIT | action=%s | actor=%s | subject=%s | ip=%s',
            action,
            actor.id if actor else 'system',
            subject.id if subject else 'N/A',
            ip_address,
        )
        return entry

    except Exception:
        logger.exception(
            'AUDIT WRITE FAILED | action=%s | actor=%s | subject=%s',
            action,
            actor.id if actor else 'system',
            subject.id if subject else 'N/A',
        )
        raise  # Never swallow audit failures


# ─── Private helpers ──────────────────────────────────────────────────────────

def _extract_ip(request) -> str | None:
    """
    Extract the real client IP address.

    Checks X-Forwarded-For first (for deployments behind a reverse proxy / CDN),
    then falls back to REMOTE_ADDR.  Only the first (leftmost) IP in the
    X-Forwarded-For chain is used — that is the original client address.
    """
    if request is None:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        # Format: "client, proxy1, proxy2" — take the first entry
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _extract_user_agent(request) -> str:
    """Return the User-Agent header, or an empty string if unavailable."""
    if request is None:
        return ''
    return request.META.get('HTTP_USER_AGENT', '')


def _sanitise_metadata(metadata: Any, _depth: int = 0) -> Any:
    """
    Recursively strip sensitive keys from a metadata dict.

    Rules:
    - Any key whose lowercase form contains a word from _SENSITIVE_KEYS is removed.
    - Works on nested dicts up to 5 levels deep (prevents accidental recursion).
    - Non-dict values (lists, strings, numbers) are returned as-is.
    - None is returned as-is.

    This is a defence-in-depth measure.  Callers should still avoid passing
    sensitive data, but this ensures nothing slips through.
    """
    if metadata is None or _depth > 5:
        return metadata

    if isinstance(metadata, dict):
        cleaned = {}
        for key, value in metadata.items():
            key_lower = str(key).lower()
            if any(sensitive in key_lower for sensitive in _SENSITIVE_KEYS):
                continue  # Drop this key entirely
            cleaned[key] = _sanitise_metadata(value, _depth + 1)
        return cleaned

    if isinstance(metadata, list):
        return [_sanitise_metadata(item, _depth + 1) for item in metadata]

    return metadata

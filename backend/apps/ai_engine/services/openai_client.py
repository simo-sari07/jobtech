"""
OpenAI client singleton.

Security rules:
- API key loaded from settings.OPENAI_API_KEY only — never hardcoded.
- Key is NEVER logged or returned in API responses.
- Singleton via @lru_cache prevents redundant client instantiation.
"""
import logging
from functools import lru_cache

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_client():
    """
    Return a cached OpenAI client.
    Raises ImproperlyConfigured if the API key is missing at startup.
    """
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ImproperlyConfigured(
            "openai package is not installed. "
            "Run: pip install openai==2.36.0"
        ) from exc

    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if not api_key:
        raise ImproperlyConfigured(
            "OPENAI_API_KEY is not set. "
            "Add it to your .env file."
        )

    return OpenAI(api_key=api_key, timeout=60, max_retries=2)


def call_gpt(
    system_prompt: str,
    user_message: str,
    model: str,
    max_tokens: int = 1500,
    response_format: str = 'json_object',
) -> str:
    """
    Call an OpenAI chat model and return the raw string response.

    Args:
        system_prompt   — The system instruction (controls output format / persona).
        user_message    — The user content (sanitised text or structured data).
        model           — The model to use (e.g. 'gpt-4o', 'gpt-4o-mini').
                          Passed explicitly by each service — configurable via settings.
        max_tokens      — Maximum tokens in the response.
        response_format — 'json_object' enforces strict JSON-only output.

    Returns:
        str — The raw model response content.

    Raises:
        RuntimeError — On any OpenAI API error (caller should handle).

    Architecture note:
        The model is an argument — NOT read from global settings here.
        Each service reads its own setting and passes it in.
        To swap models: change the setting in .env. No code change required.
    """
    client = _get_client()

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user',   'content': user_message},
            ],
            max_tokens=max_tokens,
            response_format={'type': response_format} if response_format == 'json_object' else None,
        )
        return response.choices[0].message.content
    except Exception as exc:
        # Log error type only — never the full payload (may contain user data)
        logger.error(
            'OpenAI API call failed [model=%s]: %s: %s',
            model, type(exc).__name__, str(exc)[:200],
        )
        raise RuntimeError(f'OpenAI call failed [{model}]: {type(exc).__name__}') from exc

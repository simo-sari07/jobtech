"""
Custom exception handler — all API errors return a consistent JSON envelope:

{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Human-readable description.",
        "details": { "field": ["error message"] }
    }
}
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Replace DRF's default exception handler with a standardised envelope.
    Non-DRF exceptions bubble through Django's default 500 handler.
    """
    # Let DRF handle the exception first (gives us the Response object)
    response = exception_handler(exc, context)

    if response is not None:
        error_code = _get_error_code(response.status_code)
        message = _extract_message(response.data)
        details = _extract_details(response.data)

        response.data = {
            'success': False,
            'error': {
                'code': error_code,
                'message': message,
                'details': details,
            },
        }

    return response


def _get_error_code(status_code: int) -> str:
    """Map HTTP status codes to internal error codes."""
    codes = {
        400: 'VALIDATION_ERROR',
        401: 'AUTHENTICATION_FAILED',
        403: 'PERMISSION_DENIED',
        404: 'NOT_FOUND',
        405: 'METHOD_NOT_ALLOWED',
        409: 'CONFLICT',
        429: 'RATE_LIMIT_EXCEEDED',
        500: 'INTERNAL_SERVER_ERROR',
    }
    return codes.get(status_code, 'ERROR')


def _extract_message(data) -> str:
    """Pull a human-readable top-level message from response data."""
    if isinstance(data, dict):
        # DRF puts auth errors under 'detail'
        if 'detail' in data:
            return str(data['detail'])
        # Take the first field error as the top-level message
        for key, val in data.items():
            if isinstance(val, list) and val:
                return str(val[0])
            if isinstance(val, str):
                return val
    if isinstance(data, list) and data:
        return str(data[0])
    return 'An error occurred.'


def _extract_details(data) -> dict:
    """Return per-field validation details, or empty dict."""
    if isinstance(data, dict):
        # Strip 'detail' — it's already the top-level message
        return {k: v for k, v in data.items() if k != 'detail'}
    return {}

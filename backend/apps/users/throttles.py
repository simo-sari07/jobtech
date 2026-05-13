"""
Custom throttle classes for the users app.
"""
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Strict rate limit for the login endpoint.
    5 requests per minute per IP address.
    Prevents brute-force password attacks.
    """
    scope = 'login'

"""
Auth Views — intentionally thin.

Each view:
1. Validates input with a serializer.
2. Calls the appropriate service function.
3. Returns a standardised response.

Security:
- Login endpoint uses a custom throttle class (5 req/min for anonymous users).
- Refresh token is set/read as an httpOnly cookie — never in the response body.
- All error messages pass through the custom exception handler (core/exceptions.py).
"""
import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from apps.users import services as auth_service
from apps.users.serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    SelfPasswordChangeSerializer,
)
from apps.users.throttles import LoginRateThrottle
from apps.users.services.auth_service import (
    register_user,
    authenticate_user,
    logout_user,
    get_user_profile,
    change_own_password,
)

logger = logging.getLogger(__name__)

JWT_SETTINGS = settings.SIMPLE_JWT
COOKIE_NAME     = JWT_SETTINGS.get('AUTH_COOKIE', 'refresh_token')
COOKIE_HTTP_ONLY = JWT_SETTINGS.get('AUTH_COOKIE_HTTP_ONLY', True)
COOKIE_SECURE   = JWT_SETTINGS.get('AUTH_COOKIE_SECURE', False)
COOKIE_SAMESITE = JWT_SETTINGS.get('AUTH_COOKIE_SAMESITE', 'Lax')
COOKIE_PATH     = JWT_SETTINGS.get('AUTH_COOKIE_PATH', '/')
REFRESH_LIFETIME_SECONDS = int(JWT_SETTINGS['REFRESH_TOKEN_LIFETIME'].total_seconds())


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Attach the refresh token as an httpOnly cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_LIFETIME_SECONDS,
        httponly=COOKIE_HTTP_ONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
    )


def _delete_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie on logout."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path=COOKIE_PATH,
        samesite=COOKIE_SAMESITE,
    )


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Open endpoint — no authentication required.
    Creates a user account and returns tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Force role=candidate for all public registrations
        # (Ignore any role value passed in request.data)
        validated_data = serializer.validated_data
        validated_data['role'] = 'candidate'

        result = register_user(validated_data)
        user   = result['user']
        tokens = result['tokens']

        profile = UserProfileSerializer(user, context={'request': request})
        response = Response(
            {
                'success': True,
                'data': {
                    'user':         profile.data,
                    'access_token': tokens['access'],
                },
            },
            status=status.HTTP_201_CREATED,
        )
        _set_refresh_cookie(response, tokens['refresh'])
        return response


class LoginView(APIView):
    """
    POST /api/v1/auth/login/

    Rate limited: 5 requests/minute per IP (LoginRateThrottle).
    Returns access token in body, refresh token in httpOnly cookie.
    """
    permission_classes = [AllowAny]
    throttle_classes   = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = authenticate_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        user   = result['user']
        tokens = result['tokens']

        profile = UserProfileSerializer(user, context={'request': request})
        response = Response(
            {
                'success': True,
                'data': {
                    'user':         profile.data,
                    'access_token': tokens['access'],
                },
            },
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, tokens['refresh'])
        return response


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    Blacklists the refresh token from the httpOnly cookie.
    Requires a valid access token in the Authorization header.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(COOKIE_NAME)

        if refresh_token:
            logout_user(refresh_token)

        response = Response(
            {'success': True, 'message': 'Logged out successfully.'},
            status=status.HTTP_200_OK,
        )
        _delete_refresh_cookie(response)
        return response


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    PATCH /api/v1/auth/me/

    GET: Returns the authenticated user's profile.
    PATCH: Allows users to change their own password.

    Safe — never exposes password or internal fields.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(
            request.user,
            context={'request': request},
        )
        return Response(
            {'success': True, 'data': serializer.data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        serializer = SelfPasswordChangeSerializer(
            data=request.data,
            context={'user': request.user},
        )
        serializer.is_valid(raise_exception=True)

        change_own_password(
            user=request.user,
            current_password=serializer.validated_data['current_password'],
            new_password=serializer.validated_data['new_password'],
        )

        return Response(
            {'success': True, 'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK,
        )


class CookieTokenRefreshView(BaseTokenRefreshView):
    """
    POST /api/v1/auth/token/refresh/

    Reads the refresh token from the httpOnly cookie (not the request body).
    Returns a new access token in the body + rotated refresh token in a new cookie.
    """

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(COOKIE_NAME)

        if not refresh_token:
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed('Refresh token not found.')

        # Inject refresh token into request data for the base view
        request.data['refresh'] = refresh_token

        try:
            response = super().post(request, *args, **kwargs)
        except (TokenError, InvalidToken) as e:
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed('Invalid or expired refresh token.')

        # Wrap response in standard envelope
        new_access = response.data.get('access')
        new_refresh = response.data.get('refresh')

        wrapped = Response(
            {
                'success': True,
                'data': {'access_token': new_access},
            },
            status=status.HTTP_200_OK,
        )

        if new_refresh:
            _set_refresh_cookie(wrapped, new_refresh)

        return wrapped

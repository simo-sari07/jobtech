"""
URL patterns for the users app.
All paths are under /api/v1/auth/ (see config/urls.py).
"""
from django.urls import path
from apps.users.views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    CookieTokenRefreshView,
)

app_name = 'users'

urlpatterns = [
    path('register/',       RegisterView.as_view(),          name='register'),
    path('login/',          LoginView.as_view(),             name='login'),
    path('logout/',         LogoutView.as_view(),            name='logout'),
    path('me/',             MeView.as_view(),                name='me'),
    path('token/refresh/',  CookieTokenRefreshView.as_view(), name='token-refresh'),
]

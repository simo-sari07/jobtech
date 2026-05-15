"""
Root URL configuration.
All API routes under /api/v1/ prefix.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/users/', include('apps.users.admin_urls')),
    path('api/v1/jobs/', include('apps.jobs.urls')),
    path('api/v1/applications/', include('apps.applications.urls')),
    path('api/v1/candidates/', include('apps.candidates.urls')),
    path('api/v1/interviews/', include('apps.interviews.urls')),
    path('api/v1/ai/',         include('apps.ai_engine.urls')),
    path('api/v1/public/', include('apps.jobs.public_urls')),  # ← Public (no auth)
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

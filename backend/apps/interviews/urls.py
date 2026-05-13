from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.interviews.views import InterviewViewSet

router = DefaultRouter()
router.register(r'', InterviewViewSet, basename='interview')

urlpatterns = [
    path('', include(router.urls)),
]

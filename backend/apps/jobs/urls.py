from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.jobs.views import JobViewSet, SkillViewSet

router = DefaultRouter()
router.register(r'offers', JobViewSet, basename='job')
router.register(r'skills', SkillViewSet, basename='skill')

urlpatterns = [
    path('', include(router.urls)),
]

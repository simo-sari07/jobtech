"""URL patterns for the AI Engine — all under /api/v1/ai/"""
from django.urls import path
from .views import (
    AIPipelineView,
    OfferListView,
    ProcessOfferView,
    CandidateScoreView,
    CandidateScoreRetryView,
    GenerateReportView,
)

app_name = 'ai_engine'

urlpatterns = [
    path('pipeline/',                               AIPipelineView.as_view(),          name='pipeline'),
    path('pipeline/process/',                       ProcessOfferView.as_view(),        name='pipeline-process'),
    path('offers/',                                 OfferListView.as_view(),            name='offer-list'),
    path('scores/<int:application_id>/',            CandidateScoreView.as_view(),       name='score'),
    path('scores/<int:application_id>/retry/',      CandidateScoreRetryView.as_view(),  name='score-retry'),
    path('reports/<int:offer_id>/generate/',        GenerateReportView.as_view(),        name='report-generate'),
]

"""
AI Engine views — thin layer, all logic delegated to services.

Endpoints:
  GET  /api/v1/ai/pipeline/?offer_id=<id>          → Per-offer ranked pipeline
  GET  /api/v1/ai/scores/<application_id>/          → Single application score
  POST /api/v1/ai/scores/<application_id>/retry/    → Re-trigger pipeline
  POST /api/v1/ai/reports/<offer_id>/generate/      → PDF download
"""
import logging

from django.db.models import Avg
from django.conf import settings as django_settings
from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsRecruiter

from .models import CandidateScore
from .serializers import CandidateScoreSerializer, CVParsedDataSerializer

logger = logging.getLogger(__name__)

# ── Processing status helper ──────────────────────────────────────────────────

def _processing_status(application) -> str:
    """
    Derive a processing status string from the application's AI fields.
    Values: pending | parsing | scoring | done | error

    NOTE: Use `is None` checks — ai_score=Decimal('0') is a valid score, not missing.
    """
    # Nothing has run yet
    if not application.ai_parsed_data and application.ai_score is None:
        return 'pending'

    parsed = application.ai_parsed_data or {}
    if parsed.get('parse_error'):
        return 'error'

    # Parsed but score not yet written
    if application.ai_parsed_data and application.ai_score is None:
        return 'scoring'

    # CandidateScore record exists → fully done
    try:
        application.ai_score_detail  # OneToOne reverse accessor
        return 'done'
    except CandidateScore.DoesNotExist:
        pass

    # Fallback: parsed but scoring task hasn't written the score yet
    if application.ai_parsed_data:
        return 'parsing'

    return 'pending'


# ── Views ─────────────────────────────────────────────────────────────────────

class AIPipelineView(APIView):
    """
    GET /api/v1/ai/pipeline/?offer_id=<id>

    Returns the AI-ranked pipeline for a specific job offer.
    All scores and stats are scoped to the selected offer only.

    Query params:
      offer_id (required) — PK of the Job offer.
      status   (optional) — filter by application status.
      min_score (optional) — minimum AI score (0-100).
    """
    permission_classes = [IsRecruiter]

    def get(self, request):
        from apps.applications.models import Application
        from apps.jobs.models import Job
        from apps.applications.serializers import ApplicationListSerializer

        # ── 1. Validate offer_id param ────────────────────────────────────────
        offer_id = request.query_params.get('offer_id')
        if not offer_id:
            return Response(
                {'success': False, 'error': {'message': 'offer_id query parameter is required.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            offer = Job.objects.get(pk=offer_id)
        except Job.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': f'Job offer #{offer_id} not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # ── 2. Build queryset — scoped to this offer only ─────────────────────
        qs = (
            Application.objects
            .filter(job_id=offer_id)
            .select_related('candidate', 'job', 'ai_score_detail')
            .order_by('-ai_score', '-created_at')
        )

        # Optional filters
        app_status = request.query_params.get('status')
        if app_status:
            qs = qs.filter(status=app_status)

        min_score = request.query_params.get('min_score')
        if min_score:
            try:
                qs = qs.filter(ai_score__gte=float(min_score))
            except (ValueError, TypeError):
                pass

        # ── 3. Compute per-offer stats ────────────────────────────────────────
        total         = qs.count()
        scored_qs     = qs.filter(ai_score__isnull=False)
        avg_score_raw = scored_qs.aggregate(avg=Avg('ai_score'))['avg'] or 0
        top_candidates = scored_qs.filter(ai_score__gte=70).count()
        needs_review   = scored_qs.filter(ai_score__gte=40, ai_score__lt=60).count()
        best_matches   = scored_qs.filter(ai_score__gte=80).count()
        rejected_by_ai = scored_qs.filter(ai_score__lt=40).count()
        processing     = qs.filter(ai_score__isnull=True, ai_parsed_data__isnull=False).count()

        # ── 4. Serialize ──────────────────────────────────────────────────────
        serializer = ApplicationListSerializer(qs, many=True, context={'request': request})

        return Response({
            'success': True,
            'offer': {
                'id':              offer.pk,
                'title':           offer.title,
                'location':        offer.location or '',
                'contract_type':   offer.contract_type,
                'status':          offer.status,
            },
            'stats': {
                'applications':    total,
                'average_score':   round(avg_score_raw),
                'top_candidates':  top_candidates,
                'best_matches':    best_matches,
                'needs_review':    needs_review,
                'rejected_by_ai':  rejected_by_ai,
                'processing':      processing,
            },
            'results': serializer.data,
        })


class OfferListView(APIView):
    """
    GET /api/v1/ai/offers/
    Returns a lightweight list of all job offers for the offer selector.
    Only id, title, location, status, application_count.
    """
    permission_classes = [IsRecruiter]

    def get(self, request):
        from apps.jobs.models import Job
        from django.db.models import Count

        offers = (
            Job.objects
            .annotate(application_count=Count('applications'))
            .order_by('-created_at')
            .values('id', 'title', 'location', 'status', 'contract_type', 'application_count')
        )

        return Response({'success': True, 'results': list(offers)})


class ProcessOfferView(APIView):
    """
    POST /api/v1/ai/pipeline/process/
    Body: { "offer_id": 5 }

    Processes all unscored applications for the given offer.
    In dev mode (eager): runs synchronously and returns results.
    In production: queues tasks and returns 202.
    """
    permission_classes = [IsRecruiter]

    def post(self, request):
        from apps.applications.models import Application
        from apps.ai_engine.tasks import parse_cv_task, score_candidate_task

        offer_id = request.data.get('offer_id')
        if not offer_id:
            return Response(
                {'success': False, 'error': {'message': 'offer_id is required.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unscored = list(
            Application.objects
            .filter(job_id=offer_id, ai_score__isnull=True)
            .values_list('pk', flat=True)
        )

        if not unscored:
            return Response({'success': True, 'processed': 0, 'message': 'All applications already scored.'})

        eager = getattr(django_settings, 'CELERY_TASK_ALWAYS_EAGER', False)
        processed = 0

        for app_id in unscored:
            try:
                if eager:
                    parse_cv_task(app_id)
                else:
                    parse_cv_task.apply_async(args=[app_id], queue='ai')
                processed += 1
            except Exception as exc:
                logger.error('Failed to process app #%d: %s', app_id, exc)

        logger.info('[ProcessOfferView] Triggered %d/%d for offer #%s', processed, len(unscored), offer_id)

        return Response(
            {'success': True, 'processed': processed, 'total': len(unscored)},
            status=status.HTTP_200_OK if eager else status.HTTP_202_ACCEPTED,
        )

class CandidateScoreView(APIView):
    """
    GET /api/v1/ai/scores/<application_id>/
    Returns the AI score, CV parsed data, and processing status.
    """
    permission_classes = [IsRecruiter]

    def get(self, request, application_id):
        from apps.applications.models import Application

        try:
            application = (
                Application.objects
                .select_related('candidate', 'job', 'ai_score_detail')
                .get(pk=application_id)
            )
        except Application.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': f'Application #{application_id} not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        proc_status = _processing_status(application)

        # Score data
        score_data = None
        try:
            score_data = CandidateScoreSerializer(application.ai_score_detail).data
        except CandidateScore.DoesNotExist:
            pass

        # CV parsed data
        cv_data = None
        if application.ai_parsed_data:
            serializer = CVParsedDataSerializer(data=application.ai_parsed_data)
            serializer.is_valid()
            cv_data = serializer.data

        return Response({
            'success':           True,
            'processing_status': proc_status,
            'score':             score_data,
            'cv_data':           cv_data,
        })


class CandidateScoreRetryView(APIView):
    """
    POST /api/v1/ai/scores/<application_id>/retry/
    Clears the existing score and re-triggers the full parse → score pipeline.
    """
    permission_classes = [IsRecruiter]

    def post(self, request, application_id):
        from apps.applications.models import Application
        from django.db import transaction

        try:
            application = Application.objects.get(pk=application_id)
        except Application.DoesNotExist:
            return Response(
                {'success': False, 'error': {'message': f'Application #{application_id} not found.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Clear existing data so the pipeline starts fresh
        CandidateScore.objects.filter(application=application).delete()
        application.ai_parsed_data = None
        application.ai_score       = None
        application.save(update_fields=['ai_parsed_data', 'ai_score', 'updated_at'])

        # Re-trigger the pipeline
        from django.conf import settings as django_settings
        from apps.ai_engine.tasks import parse_cv_task

        eager = getattr(django_settings, 'CELERY_TASK_ALWAYS_EAGER', False)
        if eager:
            # Dev mode — call directly, no broker needed
            parse_cv_task(application.pk)
        else:
            # Production — schedule via broker after commit
            transaction.on_commit(
                lambda: parse_cv_task.apply_async(args=[application.pk], queue='ai')
            )

        logger.info(
            'AI pipeline re-triggered for application #%d by user #%d',
            application_id, request.user.pk,
        )

        return Response(
            {'success': True, 'message': 'Re-analysis started. Check back in a few moments.'},
            status=status.HTTP_202_ACCEPTED,
        )


class GenerateReportView(APIView):
    """
    POST /api/v1/ai/reports/<offer_id>/generate/
    Generates and streams a PDF debrief report for a job offer.
    """
    permission_classes = [IsRecruiter]

    def post(self, request, offer_id):
        from apps.ai_engine.services.report_gen import generate_debrief_report

        try:
            pdf_bytes = generate_debrief_report(offer_id)
        except ValueError as exc:
            return Response(
                {
                    'success': False,
                    'error': {
                        'message': str(exc),
                        'hint': (
                            'The debrief report requires either completed interviews or '
                            'AI-scored applications for this job. Ensure candidates have been '
                            'processed by the AI pipeline first.'
                        ),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ImportError as exc:
            logger.error('WeasyPrint not installed: %s', exc)
            return Response(
                {
                    'success': False,
                    'error': {
                        'message': 'PDF generation is not available on this server.',
                        'hint': 'Run: pip install WeasyPrint==62.3',
                    },
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger.error('Report generation failed for offer #%d: %s', offer_id, exc)
            return Response(
                {'success': False, 'error': {'message': 'An unexpected error occurred while generating the report.'}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="debrief_{offer_id}.pdf"'
        return response

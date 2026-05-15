"""
Debrief Report Generator — Phase 4 AI Engine.

Generates a PDF debrief report for a job offer.

Data priority:
  1. Completed interviews (with or without evaluations)
  2. Fallback: applications with AI scores (no interviews needed)

Uses GPT for comparative narrative, WeasyPrint for HTML→PDF rendering.
"""
import json
import logging

from django.template.loader import render_to_string

from .openai_client import call_gpt

logger = logging.getLogger(__name__)

_DEBRIEF_SYSTEM = """You are an HR consultant writing a structured debrief report.
Analyse the provided candidate data and write a comparative narrative.
Respond with ONLY a valid JSON object — no markdown, no explanation:
{
  "executive_summary": "2-3 sentence overview of the overall candidate pool",
  "top_candidate": "Name of the recommended top candidate and why",
  "comparative_analysis": "3-4 sentence detailed comparison",
  "recommendations": ["Actionable recommendation 1", "Recommendation 2"],
  "risk_factors": ["Potential risk 1", "Risk 2"]
}
Base your analysis only on the data provided. Do not hallucinate."""


def _build_from_interviews(interviews) -> list:
    """Build candidate_summaries from completed Interview objects."""
    summaries = []
    for interview in interviews:
        app      = interview.application
        eval_obj = getattr(interview, 'evaluation', None)
        ai       = getattr(app, 'ai_score_detail', None)
        summaries.append({
            'name':             app.candidate.get_full_name(),
            'role_applied':     app.job.title,
            'data_source':      'interview',
            'interview_type':   interview.get_interview_type_display(),
            'recommendation':   eval_obj.recommendation if eval_obj else 'pending',
            'overall_score':    float(eval_obj.overall_score or 0) if eval_obj else None,
            'technical_score':  eval_obj.technical_score if eval_obj else None,
            'communication':    eval_obj.communication_score if eval_obj else None,
            'motivation':       eval_obj.motivation_score if eval_obj else None,
            'problem_solving':  eval_obj.problem_solving_score if eval_obj else None,
            'comments':         (eval_obj.comments or '')[:300] if eval_obj else '',
            'ai_match_score':   float(ai.match_score) if ai else None,
            'ai_score_label':   ai.score_label if ai else None,
            'ai_strengths':     ai.strengths[:3] if ai and ai.strengths else [],
            'ai_gaps':          ai.gaps[:3] if ai and ai.gaps else [],
            'has_evaluation':   eval_obj is not None,
        })
    return summaries


def _build_from_ai_scores(offer_id: int) -> list:
    """
    Fallback: build candidate_summaries from AI scores when no interviews exist.
    Returns an empty list if no scored applications exist.
    """
    from ...applications.models import Application
    applications = (
        Application.objects
        .filter(job_id=offer_id, ai_score__isnull=False)
        .select_related('candidate', 'job', 'ai_score_detail')
        .order_by('-ai_score')
    )
    summaries = []
    for app in applications:
        ai = getattr(app, 'ai_score_detail', None)
        summaries.append({
            'name':             app.candidate.get_full_name(),
            'role_applied':     app.job.title,
            'data_source':      'ai_score',
            'interview_type':   None,
            'recommendation':   None,
            'overall_score':    None,
            'technical_score':  None,
            'communication':    None,
            'motivation':       None,
            'problem_solving':  None,
            'comments':         '',
            'ai_match_score':   float(ai.match_score) if ai else float(app.ai_score),
            'ai_score_label':   ai.score_label if ai else None,
            'ai_strengths':     ai.strengths[:3] if ai and ai.strengths else [],
            'ai_gaps':          ai.gaps[:3] if ai and ai.gaps else [],
            'reasoning':        ai.reasoning if ai else '',
            'has_evaluation':   False,
        })
    return summaries


def generate_debrief_report(offer_id: int) -> bytes:
    """
    Generate a PDF debrief report for the given job offer.

    Priority:
      1. Completed interviews (with or without evaluations)
      2. Applications with AI scores (no interviews required)

    Raises:
        ValueError  — If neither interviews nor scored applications exist.
        ImportError — If WeasyPrint is not installed.
    """
    from ...interviews.models import Interview
    from ...jobs.models import Job

    # ── 1. Validate the offer exists ─────────────────────────────────────────
    try:
        offer = Job.objects.get(pk=offer_id)
    except Job.DoesNotExist:
        raise ValueError(f'Job #{offer_id} does not exist.')

    # ── 2. Try completed interviews first ─────────────────────────────────────
    interviews = (
        Interview.objects
        .filter(
            application__job_id=offer_id,
            status=Interview.Status.COMPLETED,
        )
        .select_related(
            'application__candidate',
            'application__job',
            'evaluation',
        )
        .prefetch_related('application__ai_score_detail')
    )
    completed = list(interviews)

    if completed:
        candidate_summaries = _build_from_interviews(completed)
        report_mode = 'interview'
        logger.info(
            'Generating report for job #%d from %d completed interview(s)',
            offer_id, len(completed),
        )
    else:
        # ── 3. Fallback: AI scores only ───────────────────────────────────────
        candidate_summaries = _build_from_ai_scores(offer_id)
        report_mode = 'ai_score'
        logger.info(
            'No completed interviews for job #%d — falling back to AI scores (%d candidates)',
            offer_id, len(candidate_summaries),
        )

    if not candidate_summaries:
        raise ValueError(
            f'No data available for job #{offer_id}. '
            f'Either complete at least one interview, or ensure candidates have been '
            f'scored by the AI pipeline (submit applications and wait for processing).'
        )

    # ── 4. Call GPT for comparative narrative ─────────────────────────────────
    prompt_payload = json.dumps({
        'job_title':    offer.title,
        'report_mode':  report_mode,
        'candidates':   candidate_summaries,
        'total_count':  len(candidate_summaries),
    }, ensure_ascii=False)

    from django.conf import settings as django_settings
    report_model = getattr(django_settings, 'OPENAI_REPORT_MODEL', 'gpt-4.1')

    try:
        raw = call_gpt(
            system_prompt=_DEBRIEF_SYSTEM,
            user_message=prompt_payload,
            model=report_model,
            max_tokens=800,
            response_format='json_object',
        )
        narrative = json.loads(raw)
    except Exception as exc:
        logger.error('GPT debrief narrative failed [model=%s]: %s', report_model, exc)
        narrative = {
            'executive_summary':    'Narrative generation failed.',
            'top_candidate':        'N/A',
            'comparative_analysis': '',
            'recommendations':      [],
            'risk_factors':         [],
        }

    # ── 5. Render HTML template ───────────────────────────────────────────────
    context = {
        'offer':        offer,
        'candidates':   candidate_summaries,
        'narrative':    narrative,
        'total':        len(candidate_summaries),
        'report_mode':  report_mode,   # template can show a banner when AI-only
    }
    html_content = render_to_string('ai_engine/debrief_report.html', context)

    # ── 6. Render PDF via WeasyPrint ──────────────────────────────────────────
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise ImportError(
            "WeasyPrint is required for PDF generation. "
            "Run: pip install WeasyPrint==62.3"
        ) from exc

    pdf_bytes = HTML(string=html_content).write_pdf()
    logger.info(
        'Debrief PDF generated for job #%d (%d candidates, mode=%s)',
        offer_id, len(candidate_summaries), report_mode,
    )
    return pdf_bytes

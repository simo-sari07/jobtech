"""
Candidate Scoring Service — Phase 4 AI Engine.

Score components:
  skills_match     (0–100) — rule-based: CV skills ∩ offer skills
  experience_match (0–100) — rule-based: quadratic penalty curve
  keyword_score    (0–100) — GPT-4o semantic analysis
  profile_fit      (0–100) — GPT-4o holistic judgment

Weighted final score = skills×0.35 + exp×0.20 + keyword×0.20 + fit×0.25

Never raises — returns {error, match_score: 0, ...} on any failure.
"""
import json
import logging

from django.conf import settings

from .openai_client import call_gpt

logger = logging.getLogger(__name__)

# ── Default weights (overridable from settings) ───────────────────────────────

_DEFAULT_WEIGHTS = {
    'skills_match':     0.35,
    'experience_match': 0.20,
    'keyword_score':    0.20,
    'profile_fit':      0.25,
}


def _get_weights() -> dict:
    return getattr(settings, 'AI_SCORE_WEIGHTS', _DEFAULT_WEIGHTS)


# ── Rule-based components ─────────────────────────────────────────────────────

def _compute_skills_match(cv_data: dict, offer) -> float:
    """
    Intersection of CV skills vs offer required skills → 0–100.
    If the offer has no skills tagged: return 50.0 (neutral) with a warning.
    """
    offer_skills = list(offer.skills.values_list('name', flat=True))
    if not offer_skills:
        logger.warning(
            'No skills tagged on job #%d — defaulting skills_match to 50.0', offer.pk
        )
        return 50.0

    cv_skills_lower = {s.lower() for s in cv_data.get('skills', [])}
    offer_skills_lower = {s.lower() for s in offer_skills}

    intersection = cv_skills_lower & offer_skills_lower
    score = (len(intersection) / len(offer_skills_lower)) * 100
    return round(min(100.0, score), 2)


def _compute_experience_match(cv_data: dict, offer) -> float:
    """
    Quadratic penalty curve:
      ratio >= 1.0  → 100.0
      ratio < 1.0   → (ratio²) × 100
    """
    cv_years    = cv_data.get('years_experience') or 0
    offer_years = getattr(offer, 'experience_years', 0) or 0

    if offer_years == 0:
        return 100.0  # No experience required → full score

    ratio = cv_years / offer_years
    if ratio >= 1.0:
        return 100.0

    score = (ratio ** 2) * 100
    return round(score, 2)


# ── Semantic scoring (GPT-4o) ─────────────────────────────────────────────────

_SEMANTIC_SYSTEM = """You are an ATS scoring engine. Analyse the candidate profile vs the job offer.
Respond with ONLY a valid JSON object:
{
  "keyword_score": integer 0-100,
  "profile_fit": integer 0-100,
  "strengths": ["string", ...],
  "gaps": ["string", ...],
  "reasoning": "2-3 sentence narrative"
}
keyword_score: how well CV vocabulary matches job description keywords.
profile_fit: holistic judgment of candidate suitability.
strengths: 2-4 positive observations.
gaps: 2-4 areas where the candidate falls short.
Do NOT invent data. Base your answer only on what is provided."""


def _compute_semantic_score(cv_data: dict, offer) -> dict:
    """
    Call GPT-4o for semantic analysis.
    Returns defaults on any failure — never raises.
    """
    _DEFAULTS = {
        'keyword_score': 50,
        'profile_fit':   50,
        'strengths':     [],
        'gaps':          [],
        'reasoning':     '',
    }

    try:
        # Build compact prompt — no raw user text, only structured data
        prompt_data = {
            'candidate': {
                'skills':           cv_data.get('skills', [])[:30],
                'years_experience': cv_data.get('years_experience'),
                'education':        cv_data.get('education', [])[:5],
                'summary':          (cv_data.get('summary') or '')[:500],
            },
            'job': {
                'title':            offer.title,
                'description':      offer.description[:1000],
                'required_skills':  list(offer.skills.values_list('name', flat=True)),
                'experience_years': offer.experience_years,
                'contract_type':    offer.contract_type,
            },
        }

        # Use the reasoning-quality model for semantic analysis (gpt-4.1)
        from django.conf import settings as django_settings
        analysis_model = getattr(django_settings, 'OPENAI_ANALYSIS_MODEL', 'gpt-4.1')

        raw = call_gpt(
            system_prompt=_SEMANTIC_SYSTEM,
            user_message=json.dumps(prompt_data, ensure_ascii=False),
            model=analysis_model,
            max_tokens=600,
            response_format='json_object',
        )

        data = json.loads(raw)

        return {
            'keyword_score': max(0, min(100, int(data.get('keyword_score', 50)))),
            'profile_fit':   max(0, min(100, int(data.get('profile_fit', 50)))),
            'strengths':     data.get('strengths', []) if isinstance(data.get('strengths'), list) else [],
            'gaps':          data.get('gaps', []) if isinstance(data.get('gaps'), list) else [],
            'reasoning':     str(data.get('reasoning', ''))[:2000],
        }

    except Exception as exc:
        logger.error('Semantic scoring failed: %s: %s', type(exc).__name__, str(exc)[:200])
        return _DEFAULTS


# ── Public interface ──────────────────────────────────────────────────────────

def score_candidate(application) -> dict:
    """
    Full scoring pipeline for one application.

    Returns a dict with all score fields, or
    {error, match_score: 0, ...} on failure.
    Never raises.
    """
    _ERROR_DEFAULTS = {
        'match_score':         0,
        'skills_match':        0,
        'experience_match':    0,
        'keyword_score':       0,
        'profile_fit':         0,
        'extracted_skills':    [],
        'extracted_experience': None,
        'strengths':           [],
        'gaps':                [],
        'reasoning':           '',
    }

    try:
        cv_data = application.ai_parsed_data or {}

        if cv_data.get('parse_error'):
            return {**_ERROR_DEFAULTS, 'error': cv_data['parse_error']}

        offer = application.job

        # 1. Rule-based components
        skills_match     = _compute_skills_match(cv_data, offer)
        experience_match = _compute_experience_match(cv_data, offer)

        # 2. Semantic scoring via GPT-4o
        semantic = _compute_semantic_score(cv_data, offer)

        keyword_score = semantic['keyword_score']
        profile_fit   = semantic['profile_fit']

        # 3. Weighted final score
        weights     = _get_weights()
        match_score = (
            skills_match     * weights['skills_match'] +
            experience_match * weights['experience_match'] +
            keyword_score    * weights['keyword_score'] +
            profile_fit      * weights['profile_fit']
        )
        match_score = round(min(100.0, max(0.0, match_score)), 2)

        result = {
            'match_score':          match_score,
            'skills_match':         skills_match,
            'experience_match':     experience_match,
            'keyword_score':        keyword_score,
            'profile_fit':          profile_fit,
            'extracted_skills':     cv_data.get('skills', []),
            'extracted_experience': cv_data.get('years_experience'),
            'strengths':            semantic['strengths'],
            'gaps':                 semantic['gaps'],
            'reasoning':            semantic['reasoning'],
            'error':                '',
        }

        logger.info(
            'Scored application #%d → %.1f%% (skills=%.1f, exp=%.1f, kw=%.1f, fit=%.1f)',
            application.pk, match_score, skills_match, experience_match,
            keyword_score, profile_fit,
        )
        return result

    except Exception as exc:
        reason = f'{type(exc).__name__}: {str(exc)[:200]}'
        logger.error('Scoring failed for application #%s: %s', getattr(application, 'pk', '?'), reason)
        return {**_ERROR_DEFAULTS, 'error': reason}

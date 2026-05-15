"""
CV Parser Service — Phase 4 AI Engine.

Security rules:
- Text is extracted LOCALLY — raw file bytes never leave the server.
- Only the first AI_MAX_CV_WORDS words are sent to OpenAI.
- On any failure: returns {parse_error: reason} — never raises to caller.
"""
import re
import logging

from django.conf import settings

from .openai_client import call_gpt

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────

CV_PARSE_SYSTEM = """You are a CV parser. Extract structured information from the CV text provided.
Respond with ONLY a valid JSON object — no markdown, no explanation.

Required JSON structure:
{
  "full_name": "string or null",
  "email": "string or null",
  "years_experience": integer or null,
  "skills": ["normalised skill strings"],
  "education": [{"institution":"","degree":"","field":"","year_end":null}],
  "experience": [{"company":"","title":"","start_year":null,"end_year":null}],
  "certifications": ["string"],
  "languages": ["string"],
  "summary": "string or null"
}

Rules:
- Normalise all skill names (e.g. "JS" → "JavaScript", "ML" → "Machine Learning").
- Deduplicate skills (case-insensitive).
- years_experience: infer from work history if not stated explicitly; clamp 0–50.
- Return null for any field you cannot find.
- Do NOT invent or hallucinate data.
"""


# ── Local text extraction ─────────────────────────────────────────────────────

def extract_text_from_file(file_path: str) -> str:
    """
    Extract raw text from a CV file locally.
    Supports: .pdf, .docx
    Raises ValueError for unsupported formats.
    """
    path_lower = file_path.lower()

    if path_lower.endswith('.pdf'):
        try:
            import pdfplumber
        except ImportError as exc:
            raise ImportError("pdfplumber is required: pip install pdfplumber==0.11.0") from exc

        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return '\n'.join(pages)

    if path_lower.endswith('.docx'):
        try:
            import docx
        except ImportError as exc:
            raise ImportError("python-docx is required: pip install python-docx==1.1.2") from exc

        doc = docx.Document(file_path)
        return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())

    raise ValueError(f"Unsupported file format: {file_path.rsplit('.', 1)[-1]}")


# ── JSON cleaning ─────────────────────────────────────────────────────────────

def _clean_json_response(raw: str) -> str:
    """Strip markdown code fences that some models include despite json_object format."""
    # Remove ```json ... ``` or ``` ... ```
    raw = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.IGNORECASE)
    raw = re.sub(r'\s*```$', '', raw.strip())
    return raw.strip()


def _normalise_parsed_data(data: dict) -> dict:
    """
    Validate and normalise the parsed CV dict:
    - Deduplicate skills (case-insensitive).
    - Clamp years_experience to 0-50.
    - Ensure list fields are lists.
    """
    import json

    # Ensure list fields
    for field in ('skills', 'education', 'experience', 'certifications', 'languages'):
        if not isinstance(data.get(field), list):
            data[field] = []

    # Deduplicate skills (preserve order, case-insensitive)
    seen = set()
    deduped = []
    for skill in data.get('skills', []):
        key = str(skill).lower()
        if key not in seen:
            seen.add(key)
            deduped.append(skill)
    data['skills'] = deduped

    # Clamp years_experience
    years = data.get('years_experience')
    if years is not None:
        try:
            data['years_experience'] = max(0, min(50, int(years)))
        except (TypeError, ValueError):
            data['years_experience'] = None

    return data


# ── Public interface ──────────────────────────────────────────────────────────

def parse_cv(application) -> dict:
    """
    Parse the CV attached to the given application.

    1. Validate the file exists.
    2. Extract text locally (no bytes to OpenAI).
    3. Truncate to AI_MAX_CV_WORDS.
    4. Call GPT-4o with structured JSON prompt.
    5. Clean, validate, and normalise the response.

    Returns a dict with parsed data, or {"parse_error": "reason"} on failure.
    Never raises — all exceptions are caught and stored in the error dict.
    """
    try:
        if not application.cv_file:
            return {'parse_error': 'No CV file attached to this application.'}

        file_path = application.cv_file.path

        import os
        if not os.path.exists(file_path):
            return {'parse_error': f'CV file not found on disk: {file_path}'}

        # 1. Extract text locally
        raw_text = extract_text_from_file(file_path)
        if not raw_text.strip():
            return {'parse_error': 'CV file appears to be empty or unreadable.'}

        # 2. Truncate to max words
        max_words = getattr(settings, 'AI_MAX_CV_WORDS', 4000)
        words     = raw_text.split()
        if len(words) > max_words:
            raw_text = ' '.join(words[:max_words])
            logger.info('CV truncated to %d words for application #%d', max_words, application.pk)

        # 3. Call GPT — use the cheap/fast model for extraction (gpt-4.1-mini)
        #    Model is read from settings so it can be changed in .env with no code changes.
        cv_model = getattr(settings, 'OPENAI_CV_PARSE_MODEL', 'gpt-4.1-mini')
        raw_response = call_gpt(
            system_prompt=CV_PARSE_SYSTEM,
            user_message=f"Parse this CV:\n\n{raw_text}",
            model=cv_model,
            max_tokens=1500,
            response_format='json_object',
        )

        # 4. Clean + parse JSON
        import json
        cleaned = _clean_json_response(raw_response)
        data    = json.loads(cleaned)

        # 5. Normalise
        data = _normalise_parsed_data(data)

        logger.info('CV parsed successfully for application #%d', application.pk)
        return data

    except Exception as exc:
        reason = f'{type(exc).__name__}: {str(exc)[:200]}'
        logger.error('CV parse failed for application #%s: %s', getattr(application, 'pk', '?'), reason)
        return {'parse_error': reason}

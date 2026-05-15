
---

## 🎯 CONTEXT — Read this first

I'm building **JobTech Solutions**, an ATS (Applicant Tracking System) for EMSI.
The project uses **Django REST Framework + React 18 + MySQL**.
I now need to implement **Phase 4: the AI Engine module** using **OpenAI GPT-4o**.

The existing project structure is already in place:

```
backend/
  apps/
    users/          ← done
    jobs/           ← done
    applications/   ← done
    interviews/     ← done
    ai_engine/      ← TO BUILD NOW (empty shell exists)
      __init__.py
      models.py     ← empty
      views.py      ← empty
      urls.py       ← empty
      tasks.py      ← empty
      services/
        __init__.py
        cv_parser.py    ← empty
        matcher.py      ← empty
        report_gen.py   ← empty
  core/
    permissions.py   ← IsRecruiterOrHR, IsHRManagerOrAdmin defined
    exceptions.py    ← custom_exception_handler defined
    pagination.py    ← StandardResultsPagination defined
    mixins.py        ← TimestampMixin, AuditMixin defined

frontend/
  src/
    features/
      ai/            ← TO BUILD NOW (empty)
    api/
      client.js      ← Axios instance with JWT interceptors (done)
      endpoints.js   ← URL constants (done)
```

The existing `Application` model already has these fields:
- `cv_file` — FileField with the uploaded CV path
- `ai_score` — DecimalField(5,2), nullable — stores the final match score
- `ai_parsed_data` — JSONField, nullable — stores parsed CV data
- `offer` — FK to JobOffer
- `candidate` — FK to User

---

## 📋 DATABASE TABLES TO CREATE

### Table: `ai_engine_candidatescore`
```
id                  BIGINT          PK AUTO
application_id      BIGINT          FK applications_application UNIQUE
match_score         DECIMAL(5,2)    NOT NULL  — overall AI score 0-100
skills_match        DECIMAL(5,2)    NOT NULL  — % of required skills found in CV
experience_match    DECIMAL(5,2)    NOT NULL  — years fit score
keyword_score       DECIMAL(5,2)    NOT NULL  — semantic relevance score
extracted_skills    JSON            NULL      — list of skill strings from CV
extracted_experience SMALLINT       NULL      — years of experience detected
strengths           JSON            NULL      — list of strength strings from AI
gaps                JSON            NULL      — list of gap strings from AI
reasoning           TEXT            blank=True — AI narrative explanation
model_version       VARCHAR(20)     NOT NULL  — e.g. "gpt-4o-1.0"
error               TEXT            blank=True — stores error message if failed
processed_at        DATETIME        auto_now_add
```

**Relations:**
- `applications_application` 1:1 → `ai_engine_candidatescore`
- `applications_application.ai_score` is synced from `match_score` after scoring

---

## 🤖 USE CASES TO IMPLEMENT

### UC-11: AI CV Parsing (Celery task)
**Trigger:** Automatically when a new Application is submitted  
**Flow:**
1. Celery task receives `application_id`
2. Load CV file from disk (already saved at `application.cv_file.path`)
3. Extract raw text locally using `pdfplumber` (PDF) or `python-docx` (DOCX) — **never send raw bytes to OpenAI**
4. Truncate to max 4000 words before sending to AI
5. Call OpenAI GPT-4o with a strict JSON-only system prompt
6. Parse JSON response, validate and normalise fields
7. Save result to `application.ai_parsed_data`
8. Chain: trigger UC-12 (scoring task)

**OpenAI prompt must extract:**
```json
{
  "full_name": "string|null",
  "email": "string|null",
  "years_experience": "integer|null",
  "skills": ["normalised skill strings"],
  "education": [{"institution":"","degree":"","field":"","year_end":null}],
  "experience": [{"company":"","title":"","start_year":null,"end_year":null}],
  "certifications": ["string"],
  "languages": ["string"],
  "summary": "string|null"
}
```

### UC-12: AI Candidate Scoring (Celery task, chained after UC-11)
**Flow:**
1. Load application + offer + extracted CV data
2. Compute `skills_match` (rule-based): intersection of CV skills vs offer required skills → 0-100
3. Compute `experience_match` (rule-based): CV years vs offer minimum years → 0-100 with penalty curve
4. Call OpenAI GPT-4o for semantic analysis → returns `keyword_score`, `profile_fit`, `strengths[]`, `gaps[]`, `reasoning`
5. Compute `match_score` = weighted sum:
   - `skills_match` × 0.35
   - `experience_match` × 0.20
   - `keyword_score` × 0.20
   - `profile_fit` × 0.25
6. Create `CandidateScore` record
7. Update `application.ai_score` field

### UC-13: Debrief PDF Report
**Trigger:** HR Manager clicks "Generate Report" for a job offer  
**Flow:**
1. GET `/api/v1/ai/reports/{offer_id}/generate/`
2. Query all completed interviews with evaluations for that offer
3. Call OpenAI GPT-4o for comparative narrative analysis
4. WeasyPrint renders HTML template → PDF bytes
5. Return as `Content-Disposition: attachment; filename="debrief_{offer_id}.pdf"`

---

## 📁 FILES TO CREATE — BACKEND

### `apps/ai_engine/services/openai_client.py`
```
RULES:
- Load OPENAI_API_KEY from settings (from env via django-environ) — NEVER hardcode
- Singleton client using @lru_cache(maxsize=1)
- Raise ImproperlyConfigured if key missing at startup
- Single function: call_gpt(system_prompt, user_message, max_tokens, response_format="json_object") → str
- Use model: "gpt-4o"
- timeout=60, max_retries=2
- Never log the API key
```

### `apps/ai_engine/services/cv_parser.py`
```
RULES:
- extract_text_from_file(file_path) → str  (local, no API call)
  - PDF: use pdfplumber
  - DOCX: use python-docx
  - Raise ValueError for unsupported formats
- parse_cv(application) → dict
  - Validate file exists
  - Extract text locally
  - Truncate to 4000 words
  - Call call_gpt() with CV_PARSE_SYSTEM prompt
  - Clean JSON response (strip markdown fences with regex)
  - Validate and normalise (deduplicate skills, clamp years 0-50)
  - Return structured dict
  - On any exception: return {"parse_error": "reason"} — never raise
```

### `apps/ai_engine/services/matcher.py`
```
RULES:
- score_candidate(application) → dict
  - Guard: return error if ai_parsed_data has parse_error
  - _compute_skills_match(cv_data, offer) → float
    - offer.skills.all() vs cv_data["skills"]
    - Score = (intersection / offer_skills_count) * 100
    - If no offer skills: return 50.0 with warning log
  - _compute_experience_match(cv_data, offer) → float
    - ratio = cv_years / offer.experience_years
    - If ratio >= 1.0: return 100.0
    - Else: return (ratio ** 2) * 100
  - _compute_semantic_score(cv_data, offer) → dict
    - Build compact sanitised prompt (no raw user text)
    - Call call_gpt() → parse JSON → return {keyword_score, profile_fit, strengths, gaps, reasoning}
    - On failure: return defaults {50, 50, [], [], ""}
  - Compute weighted match_score
  - Return full score dict + strengths + gaps + reasoning
  - On any exception: return {error: str, match_score: 0, ...} — never raise
```

### `apps/ai_engine/services/report_gen.py`
```
RULES:
- generate_debrief_report(offer_id) → bytes (PDF)
- Query completed interviews with evaluations
- Raise ValueError if none exist
- Build compact candidate summary dicts for GPT
- Call call_gpt() for comparative narrative
- render_to_string('ai_engine/debrief_report.html', context) → html
- HTML(string=html).write_pdf() → bytes
```

### `apps/ai_engine/models.py`
Create `CandidateScore` model with all fields listed in the DB schema above.  
Add `TimestampMixin` from `core.mixins`.  
Add properties: `score_label` (Excellent/Good/Average/Weak) and `score_color` (green/blue/amber/red).

### `apps/ai_engine/serializers.py`
```
- CandidateScoreSerializer (ModelSerializer, all fields read-only)
  + computed fields: score_label, score_color, candidate_name
- CVParsedDataSerializer (Serializer for ai_parsed_data JSON)
```

### `apps/ai_engine/permissions.py`
```
- IsRecruiterOrHR (import from core.permissions — already exists)
```

### `apps/ai_engine/views.py`
```
Endpoints:
  GET  /api/v1/ai/scores/{application_id}/        → return CandidateScore + CVParsedData + processing_status
  POST /api/v1/ai/scores/{application_id}/retry/  → clear old score, re-trigger Celery parse task → 202
  POST /api/v1/ai/reports/{offer_id}/generate/    → generate PDF → return as file download

Rules:
  - All views use permission_classes = [IsRecruiterOrHR]
  - processing_status values: "pending" | "parsing" | "scoring" | "done" | "error"
  - Views are THIN — no logic, all delegated to services
  - Return consistent {error, code, detail} on all errors (uses core.exceptions)
```

### `apps/ai_engine/urls.py`
```python
urlpatterns = [
  path('scores/<int:application_id>/',         CandidateScoreView.as_view()),
  path('scores/<int:application_id>/retry/',   CandidateScoreRetryView.as_view()),
  path('reports/<int:offer_id>/generate/',     GenerateReportView.as_view()),
]
```

### `apps/ai_engine/tasks.py`
```
- parse_cv_task(application_id) → shared_task
  - queue='ai', max_retries=3, acks_late=True
  - Calls cv_parser.parse_cv(application)
  - Saves result to application.ai_parsed_data
  - Chains score_candidate_task on success

- score_candidate_task(application_id) → shared_task
  - queue='ai', max_retries=3, acks_late=True
  - Guard: skip if CandidateScore already exists
  - Calls matcher.score_candidate(application)
  - CandidateScore.objects.update_or_create(...)
  - Syncs application.ai_score = match_score

- Both tasks: use transaction.on_commit() pattern
- Both tasks: detailed logging (logger.info/error)
- Both tasks: autoretry_for=(Exception,), default_retry_delay=120
```

### `apps/ai_engine/admin.py`
Register `CandidateScore` with all fields visible.

### `apps/ai_engine/tests/`
```
factories.py
  - CandidateScoreFactory (factory_boy)

test_services.py
  - TestCVParser: test parse success, test unsupported format, test empty file
  - TestMatcher: test skills_match calculation, test experience_match curve, test score with no offer skills
  - TestScoreCandidate: test full pipeline, test error stored on failure

test_views.py
  - Test GET score returns 200 with data
  - Test GET score returns 404 for unknown application
  - Test retry returns 202
  - Test permissions: candidate cannot access, recruiter can
```

---

## 📁 FILES TO CREATE — FRONTEND

### `src/features/ai/api.js`
```javascript
export const aiApi = {
  getScore:        (applicationId) => apiClient.get(ENDPOINTS.AI.SCORE(applicationId)),
  retryAnalysis:   (applicationId) => apiClient.post(ENDPOINTS.AI.RETRY(applicationId)),
  generateReport:  (offerId)       => apiClient.post(ENDPOINTS.AI.REPORT(offerId), {}, { responseType: 'blob' }),
}
```

### `src/features/ai/hooks/useAIScore.js`
```javascript
// useQuery for GET score — poll every 5s while status is "parsing" or "scoring"
// useAIScore(applicationId) → { score, cvData, processingStatus, isLoading, refetch }
```

### `src/features/ai/hooks/useRetryAnalysis.js`
```javascript
// useMutation for POST retry
// On success: invalidate score query, show toast "Re-analyse lancée"
```

### `src/features/ai/hooks/useGenerateReport.js`
```javascript
// useMutation for POST generate report
// On success: trigger browser download from blob response
// On error: show toast with error detail
```

### `src/features/ai/components/AIPipelinePage.jsx`
**This is the main page. Recreate the UI from the screenshot exactly:**

```
Layout: 3 columns
  LEFT:   Existing sidebar (DashboardLayout handles it)
  CENTER: Main content area (flex-1)
  RIGHT:  AI Processing panel (280px fixed)

CENTER contains:
  1. Page header
     - Title: "AI Candidate Pipeline"
     - Subtitle: "X applications analyzed by AI and ranked by best match"
     - Sort dropdown: "AI Score | Name | Date Applied"

  2. Stats row (4 cards):
     - Applications: count + "+X this week" green delta
     - Average AI Score: % + "+X% vs last week" green delta  
     - Interviews Scheduled: count + "+X this week"
     - Top Candidates: count + "High potential" label

  3. Filter tabs:
     - All (324) | Best Matches (78) | Needs Review (124) | High Potential (45) | Rejected by AI (77) | Recently Applied (24)
     - Active tab has blue underline

  4. Candidate list — each card contains:
     - Avatar (photo or initials fallback with gradient bg)
     - Name, Job Title, Location (pin icon), Experience (years icon)
     - AI Score ring: SVG circle with stroke-dashoffset animation
       * Score ≥ 80: green ring  (#16a34a)
       * Score 60-79: yellow ring (#f59e0b)
       * Score < 60: red ring    (#ef4444)
       * Text inside: "92%" bold + "AI Match" small label
     - AI Insights column (3-4 bullet points):
       * Green checkmark ✓ for positives
       * Orange dot ● for areas to improve
     - Top Skills chips (3-4 chips + "+N more")
     - Actions column:
       * "View Profile" button (primary)
       * "AI Report" button (outline, with document icon)
       * "Schedule" button (outline, with calendar icon)
       * Bookmark icon button
     - "Applied X hours ago" timestamp at card bottom

RIGHT PANEL contains:
  1. "AI Processing" section with green "● Live" badge
     - Timeline feed (newest at top):
       * Each item: timestamp | event name | subtitle
       * Icons: blue circle (upload), blue (parsing), blue (skills), blue (matching), green star (score), green star (ranked)
     - "View all activity" link

  2. "Filters" section with "Clear all" link
     - AI Score range slider (0% to 100%)
     - Experience dropdown
     - Location dropdown  
     - Skills multi-select input
     - Job dropdown
```

### `src/features/ai/components/ScoreRing.jsx`
```
Props: score (0-100), size (default 76px)
SVG circle with:
  - circumference = 2 * π * 34 (r=34 for 76px)
  - strokeDashoffset = circumference * (1 - score/100)
  - Color based on score threshold
  - Animated on mount with CSS transition
  - Score number centered, "AI Match" label below
```

### `src/features/ai/components/ProcessingTimeline.jsx`
```
Props: events[] = [{time, title, subtitle, status: "done"|"active"|"pending"}]
Vertical timeline with:
  - Blue filled circle for done/active steps
  - Green star circle for completed ranking
  - Connecting line between steps
  - Auto-scrolls to latest
  - Polls useQuery every 3s when any step is "active"
```

### `src/features/ai/components/AIFilters.jsx`
```
Props: filters, onChange
Contains:
  - RangeSlider for AI Score (0-100) with blue thumb
  - Select for Experience
  - Select for Location
  - CreatableSelect for Skills (react-select)
  - Select for Job
  - "Clear all" resets all filters
```

### `src/features/ai/schemas.js`
```javascript
// Zod schema for filter validation
export const aiFilterSchema = z.object({
  minScore:   z.number().min(0).max(100).default(0),
  experience: z.string().optional(),
  location:   z.string().optional(),
  skills:     z.array(z.string()).default([]),
  jobId:      z.number().optional(),
  sortBy:     z.enum(['ai_score', 'name', 'applied_at']).default('ai_score'),
  tab:        z.enum(['all','best_matches','needs_review','high_potential','rejected','recent']).default('all'),
})
```

---

## ⚙️ CONFIGURATION TO ADD

### Add to `config/settings/base.py`:
```python
# ── OpenAI AI Engine ──────────────────────────────────────────────────────────
OPENAI_API_KEY    = env('OPENAI_API_KEY', default='')
OPENAI_MODEL      = env('OPENAI_MODEL', default='gpt-4o')
AI_MODEL_VERSION  = '1.0.0'   # bumped when scoring logic changes — for audit trail
AI_MAX_CV_WORDS   = 4000      # truncate CVs before sending to OpenAI
AI_CELERY_QUEUE   = 'ai'

# Score weights — must sum to 1.0
AI_SCORE_WEIGHTS = {
    'skills_match':     0.35,
    'experience_match': 0.20,
    'keyword_score':    0.20,
    'profile_fit':      0.25,
}
```

### Add to `.env.example`:
```
# ── OpenAI ───────────────────────────────────────────────────────────────────
# Get your key at: https://platform.openai.com/api-keys
# SECURITY: Never hardcode. Set in server environment in production.
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
```

### Add to `requirements/base.txt`:
```
openai==1.30.1        # OpenAI Python SDK
pdfplumber==0.11.0    # Local PDF text extraction
python-docx==1.1.2    # Local DOCX text extraction
WeasyPrint==62.3      # HTML → PDF for debrief reports
```

### Add to `config/urls.py`:
```python
path('api/v1/ai/', include('apps.ai_engine.urls')),
```

### Add to `INSTALLED_APPS` in `config/settings/base.py`:
```python
'apps.ai_engine',
```

### Add to `src/api/endpoints.js`:
```javascript
AI: {
  SCORE:  (id) => `/ai/scores/${id}/`,
  RETRY:  (id) => `/ai/scores/${id}/retry/`,
  REPORT: (id) => `/ai/reports/${id}/generate/`,
},
```

### Add Celery beat schedule to `config/settings/base.py`:
```python
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
  # Re-queue any stalled AI tasks older than 30min
  'retry-stalled-ai-tasks': {
    'task': 'ai_engine.retry_stalled_tasks',
    'schedule': crontab(minute='*/30'),
  },
}
```

---

## 🔒 SECURITY RULES — ENFORCE ALL

1. `OPENAI_API_KEY` loaded from `settings.OPENAI_API_KEY` only — never hardcoded, never logged, never returned in API responses
2. CV text is extracted **locally** before sending to OpenAI — raw file bytes never leave the server
3. Only the first 4000 words of CV text are sent — prevent token abuse
4. All AI endpoints require `IsRecruiterOrHR` permission
5. Rate limit AI retry endpoint: max 3 retries per application per hour
6. Sanitise all AI JSON responses before saving to DB — validate with serializer
7. Store `model_version` on every score record — enables audit and reprocessing if model changes
8. Never store the raw CV text in the database

---

## 🎨 UI / UX RULES — ENFORCE ALL

1. The `ScoreRing` SVG must animate on mount with a 0.8s ease transition
2. Candidate cards animate in with staggered `animation-delay` (50ms per card)
3. Tab filter counts update in real-time when filters change (no page reload)
4. Processing timeline auto-refreshes every 3 seconds when a task is active
5. "AI Report" button shows a spinner while PDF is generating, then triggers browser download
6. Score ring color: green ≥80, amber 60-79, red <60
7. Empty state when no candidates match filters — show icon + message + clear filters CTA
8. Mobile: collapse right panel into a bottom drawer triggered by "AI Processing" button
9. All API errors use the global toast system — never silent failures
10. Skeleton loaders for every card while initial data loads

---

## 📐 COMPONENT TREE

```
AIPipelinePage
├── PageHeader (title + subtitle + sort dropdown)
├── StatsRow
│   ├── StatCard × 4
├── FilterTabs
│   └── TabItem × 6
├── CandidateList
│   └── CandidateCard × N
│       ├── CandidateAvatar
│       ├── CandidateInfo
│       ├── ScoreRing          ← SVG animated circle
│       ├── AIInsights         ← 3-4 bullet points
│       ├── SkillsChips        ← skill tags + "+N more"
│       └── CardActions        ← View Profile / AI Report / Schedule / Bookmark
└── RightPanel
    ├── ProcessingTimeline     ← live-polling feed
    └── AIFilters              ← score slider + dropdowns
```

---

## ✅ DEFINITION OF DONE

The feature is complete when:

**Backend:**
- [ ] `CandidateScore` model + migration created
- [ ] `openai_client.py` singleton with env key loading
- [ ] `cv_parser.py` extracts text locally, calls GPT-4o, returns structured JSON
- [ ] `matcher.py` computes rule-based + semantic scores with correct weights
- [ ] `report_gen.py` generates PDF via WeasyPrint
- [ ] Celery tasks chain: `parse_cv_task` → `score_candidate_task`
- [ ] All 3 API endpoints functional with correct permissions
- [ ] Task auto-triggered when Application is created (via `post_save` signal or service layer)
- [ ] Tests: services covered at 80%+, permissions tested, error paths tested
- [ ] `python manage.py check` passes with no warnings

**Frontend:**
- [ ] `AIPipelinePage` matches the provided screenshot pixel-perfectly
- [ ] `ScoreRing` SVG animates on mount
- [ ] Cards stagger-animate in on load
- [ ] Filter tabs work client-side with live count updates
- [ ] Processing timeline polls every 3s when active
- [ ] PDF report generates and downloads automatically
- [ ] Skeleton loading states for all data
- [ ] Mobile right panel collapses to bottom drawer
- [ ] All error states handled with toast notifications

---

## 🚀 ORDER OF IMPLEMENTATION

Build in this exact order (each step unblocks the next):

1. `apps/ai_engine/models.py` → run `makemigrations` + `migrate`
2. `apps/ai_engine/services/openai_client.py`
3. `apps/ai_engine/services/cv_parser.py`
4. `apps/ai_engine/services/matcher.py`
5. `apps/ai_engine/tasks.py`
6. Wire task trigger in `apps/applications/services/application_service.py` → call `parse_cv_task.delay(application.pk)` after application creation
7. `apps/ai_engine/serializers.py`
8. `apps/ai_engine/views.py` + `urls.py`
9. `apps/ai_engine/services/report_gen.py` + HTML template
10. `apps/ai_engine/tests/`
11. Frontend: `ScoreRing.jsx` (isolated, testable)
12. Frontend: `ProcessingTimeline.jsx`
13. Frontend: `AIFilters.jsx`
14. Frontend: hooks (`useAIScore`, `useRetryAnalysis`, `useGenerateReport`)
15. Frontend: `CandidateCard.jsx`
16. Frontend: `AIPipelinePage.jsx` (assembles everything)

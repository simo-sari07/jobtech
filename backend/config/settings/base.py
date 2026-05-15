"""
Django Base Settings — shared across all environments.
Environment-specific overrides live in development.py / production.py.
"""
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─── Core ───────────────────────────────────────────────────────────────────
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='', cast=Csv())

AUTH_USER_MODEL = 'users.User'

# ─── Installed Apps ──────────────────────────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
]

LOCAL_APPS = [
    'apps.users',
    'apps.jobs',
    'apps.applications',
    'apps.candidates',
    'apps.interviews',
    'apps.ai_engine',
    'core',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─── Middleware ───────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',      # Must be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # ─ Must be AFTER AuthenticationMiddleware so request.user is resolved ─
    'core.middleware.OnlinePresenceMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ─── Database — MySQL ─────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('DB_NAME', default='jobtech_db'),
        'USER': config('DB_USER', default='root'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='127.0.0.1'),
        'PORT': config('DB_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# ─── Password Validation ──────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    # ─ Custom complexity rules ────────────────────────────────────
    {'NAME': 'apps.users.validators.UppercaseValidator'},
    {'NAME': 'apps.users.validators.LowercaseValidator'},
    {'NAME': 'apps.users.validators.SpecialCharacterValidator'},
]

# ─── Internationalization ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ─── Static & Media ───────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = config('MEDIA_ROOT', default=str(BASE_DIR / 'media'))

# ─── File Upload Security ────────────────────────────────────────────────────
CV_MAX_UPLOAD_MB = config('CV_MAX_UPLOAD_MB', default=5, cast=int)
DATA_UPLOAD_MAX_MEMORY_SIZE = CV_MAX_UPLOAD_MB * 1024 * 1024

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── OpenAI AI Engine ─────────────────────────────────────────────────────────
OPENAI_API_KEY   = config('OPENAI_API_KEY', default='')
AI_MODEL_VERSION = '1.0.0'   # Bump when scoring logic changes — for audit trail
AI_MAX_CV_WORDS  = 4000      # Truncate CVs before sending to OpenAI
AI_CELERY_QUEUE  = 'ai'

# ── Per-task model strategy ───────────────────────────────────────────────────
# Switch any model via .env — zero business logic changes required.
#
#  CV_PARSE_MODEL      → fast & cheap extraction    → gpt-4.1-mini
#  ANALYSIS_MODEL      → semantic reasoning         → gpt-4.1
#  REPORT_MODEL        → comparative narrative      → gpt-4.1
#
# Future: swap any value to gpt-5 / a local model without touching services.
OPENAI_CV_PARSE_MODEL  = config('OPENAI_CV_PARSE_MODEL',  default='gpt-4.1-mini')
OPENAI_ANALYSIS_MODEL  = config('OPENAI_ANALYSIS_MODEL',  default='gpt-4.1')
OPENAI_REPORT_MODEL    = config('OPENAI_REPORT_MODEL',    default='gpt-4.1')

# Score weights — must sum to 1.0
AI_SCORE_WEIGHTS = {
    'skills_match':     0.35,
    'experience_match': 0.20,
    'keyword_score':    0.20,
    'profile_fit':      0.25,
}

# ─── Company / Public Surface ─────────────────────────────────────────────────
COMPANY_NAME = config('COMPANY_NAME', default='JobTech Solutions')
HIDE_SALARY  = config('HIDE_SALARY', default=False, cast=bool)

# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'login': '5/minute',
    },
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# ─── Simple JWT ───────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',

    'JTI_CLAIM': 'jti',

    # Cookie settings (used by our custom views)
    'AUTH_COOKIE': 'refresh_token',
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SECURE': config('JWT_COOKIE_SECURE', default=False, cast=bool),
    'AUTH_COOKIE_SAMESITE': config('JWT_COOKIE_SAMESITE', default='Lax'),
    'AUTH_COOKIE_PATH': '/api/v1/auth/',
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='', cast=Csv())
CORS_ALLOW_CREDENTIALS = True  # Required for cookie-based refresh token
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ─── Celery ──────────────────────────────────────────────────────────────────
from celery.schedules import crontab

CELERY_BROKER_URL        = config('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND    = config('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT    = ['json']
CELERY_TASK_SERIALIZER   = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE          = 'UTC'

# In development (DEBUG=True), run tasks synchronously — no Redis/broker needed.
# In production, set DEBUG=False and start a real Celery worker.
CELERY_TASK_ALWAYS_EAGER       = DEBUG
CELERY_TASK_EAGER_PROPAGATES   = DEBUG

# Celery Beat — periodic tasks
CELERY_BEAT_SCHEDULE = {
    # Runs every hour — finds interviews within the next 24h and sends reminders
    'send-interview-reminders-hourly': {
        'task':     'interviews.send_interview_reminders',
        'schedule': crontab(minute=0, hour='*'),
    },
    # Re-queue any stalled AI tasks older than 30min
    'retry-stalled-ai-tasks': {
        'task':     'ai_engine.retry_stalled_tasks',
        'schedule': crontab(minute='*/30'),
    },
}

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_BACKEND       = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST          = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT          = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS       = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER     = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = config('DEFAULT_FROM_EMAIL', default='noreply@jobtech.io')


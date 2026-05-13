# JobTech Solutions — Phase 1: Auth + RBAC + Layout

## Overview

**Goal:** Build the production-ready foundation for the JobTech SaaS HR platform. This covers the complete auth system (backend + frontend), role-based access control, security hardening, and a clean dashboard shell.

**Current State:** Backend is empty. Frontend is a bare Vite+React+TS scaffold with no dependencies installed yet.

**Stack:** Django + DRF + SimpleJWT + MySQL (backend) | React + Vite + TypeScript + TailwindCSS + Zustand + React Query + Axios + Zod (frontend)

---

## Proposed Changes

### Backend: Django Project Setup

#### [NEW] `backend/` — Complete Django project

**Structure:**
```
backend/
├── config/
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py          # Shared settings
│   │   ├── development.py   # DEBUG=True
│   │   └── production.py    # DEBUG=False, HTTPS
│   ├── urls.py              # Root router
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   └── users/
│       ├── models.py        # Custom User (email auth + role)
│       ├── serializers.py   # Validation only
│       ├── views.py         # Thin — delegates to services/
│       ├── urls.py
│       ├── permissions.py   # IsAdmin, IsHRManager, IsRecruiter, IsCandidate, IsSelf
│       ├── admin.py
│       └── services/
│           └── auth_service.py  # All business logic here
├── core/
│   ├── permissions.py       # Global DRF permissions
│   ├── exceptions.py        # Custom exception handler (standard JSON format)
│   ├── pagination.py
│   └── utils.py
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── .env.example
└── manage.py
```

**Key files to create:**

#### [NEW] `backend/config/settings/base.py`
- Custom User model: `AUTH_USER_MODEL = 'users.User'`  
- SimpleJWT config: access=15min, refresh=7d, rotation=True  
- CORS: whitelist from env  
- Rate limiting: django-ratelimit or DRF throttling  
- Password validators  

#### [NEW] `backend/apps/users/models.py`
- `AbstractBaseUser + PermissionsMixin`
- Fields: email, first_name, last_name, role, phone, avatar, is_active, date_joined
- Role choices: `admin | hr_manager | recruiter | candidate`
- Custom `UserManager` with `create_user` / `create_superuser`

#### [NEW] `backend/apps/users/services/auth_service.py`
- `register_user(data)` — creates user, validates uniqueness safely
- `authenticate_user(email, password)` — returns tokens or raises generic error
- `logout_user(refresh_token)` — blacklists token
- `get_current_user(user)` — safe user data retrieval

#### [NEW] `backend/apps/users/views.py`
- `RegisterView` — POST /api/v1/auth/register/
- `LoginView` — POST /api/v1/auth/login/ (rate-limited)
- `LogoutView` — POST /api/v1/auth/logout/ (blacklist refresh)
- `MeView` — GET /api/v1/auth/me/
- `TokenRefreshView` — POST /api/v1/auth/token/refresh/

#### [NEW] `backend/core/exceptions.py`
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} }
}
```

---

### Frontend: Complete Rebuild

#### [MODIFY] `frontend/package.json`
Add all required dependencies:
- `tailwindcss`, `@tailwindcss/vite`
- `react-router-dom`
- `@tanstack/react-query`
- `zustand`
- `axios`
- `zod`, `react-hook-form`, `@hookform/resolvers`
- `react-hot-toast`

#### [NEW] `frontend/src/` — Feature-based architecture

```
src/
├── api/
│   ├── client.ts          # Axios instance + interceptors
│   └── endpoints.ts       # URL constants
├── features/
│   └── auth/
│       ├── components/
│       │   ├── LoginForm.tsx
│       │   └── RegisterForm.tsx
│       ├── hooks/
│       │   ├── useLogin.ts
│       │   └── useRegister.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   └── RegisterPage.tsx
│       ├── api.ts           # Auth API calls
│       └── schemas.ts       # Zod validation schemas
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   └── shared/
│       ├── Layout.tsx       # Shell: Sidebar + Topbar + Content
│       ├── Sidebar.tsx      # Role-aware nav
│       ├── Topbar.tsx
│       └── SkeletonLoader.tsx
├── hooks/
│   └── useAuth.ts
├── store/
│   ├── authStore.ts         # Zustand: user, isAuthenticated, role
│   └── uiStore.ts           # sidebar toggle, theme
├── router/
│   ├── index.tsx
│   └── ProtectedRoute.tsx   # Role-gated guard
├── pages/
│   ├── dashboard/
│   │   ├── AdminDashboard.tsx
│   │   ├── HRDashboard.tsx
│   │   ├── RecruiterDashboard.tsx
│   │   └── CandidateDashboard.tsx
│   └── NotFound.tsx
└── utils/
    ├── constants.ts         # ROLES enum, STATUS enums
    └── formatters.ts
```

---

## Security Implementation Details

### Backend Security
| Concern | Solution |
|---|---|
| Brute-force login | DRF `AnonRateThrottle` — 5 req/min on login |
| User enumeration | Generic "Invalid credentials" for all auth failures |
| JWT storage | Short-lived access token in memory (Zustand), refresh via httpOnly cookie |
| Password strength | `MinimumLengthValidator`, `NumericPasswordValidator`, custom `UppercaseValidator` |
| CORS | Whitelist via env var, no wildcard in prod |
| Token blacklist | `rest_framework_simplejwt.token_blacklist` app |
| Sensitive data | Never expose `password`, `is_staff`, internal IDs in responses |

### Frontend Security
| Concern | Solution |
|---|---|
| XSS | React's JSX escaping + no `dangerouslySetInnerHTML` |
| CSRF | SameSite cookie for refresh token |
| Token rotation | Interceptor auto-refreshes on 401, queues concurrent requests |
| Route guarding | `ProtectedRoute` checks auth + role before rendering |

---

## Verification Plan

### Backend
```bash
cd backend
python -m pytest apps/users/tests/ -v
python manage.py runserver
```

Manual API tests:
- POST /api/v1/auth/register/ — success + duplicate email (same error)
- POST /api/v1/auth/login/ — correct/wrong creds, 6th req blocked
- GET /api/v1/auth/me/ — with valid token, without token

### Frontend
```bash
cd frontend
npm run dev
```

Manual UI tests:
- Login form: Zod validation, loading state, toast on error
- Protected route: redirect to /login if unauthenticated
- Role-based sidebar: different nav items per role
- Token auto-refresh: access token expires → interceptor refreshes silently

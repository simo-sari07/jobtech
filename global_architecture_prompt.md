# JobTech Solutions — Global Application Architecture
# Public ATS + Private Dashboard System Design
# Production-Ready Prompt

---

## CONTEXT — Stack & What Already Exists

### Already Built (Do NOT re-implement)
- Custom User model: `id, email, first_name, last_name, role, phone, avatar, is_active, last_activity`
- Roles: `admin | hr_manager | recruiter | candidate`
- JWT auth: access=15min, refresh=7d, rotation=True, blacklist enabled
- `core/exceptions.py` → uniform JSON: `{ success, error: { code, message, details } }`
- `core/permissions.py` → `IsAdmin, IsHRManager, IsRecruiter, IsCandidate, IsRecruiterOrHRManager`
- Auth endpoints: `/api/v1/auth/` (register, login, logout, me, token/refresh)
- Jobs app: `JobOffer`, `Skill` models, full CRUD
- Applications app: `Application` model, CV upload, status pipeline
- User management: admin CRUD, online presence, audit logs
- Frontend: Zustand authStore, Axios + JWT interceptors, basic Layout shell

### Stack
- **Backend:** Django 5 + DRF + SimpleJWT + MySQL + Celery + Redis
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS + React Query + Zustand + Axios + Zod

---

## ARCHITECTURE GOAL

Build a **dual-surface application** from one codebase:

```
JobTech Platform
├── PUBLIC SURFACE  →  Candidate-facing (Indeed-like)
│   └── /                Homepage with job search
│   └── /jobs            Job listings (browsable without login)
│   └── /jobs/:slug      Job detail + Apply button
│   └── /login           Single login for ALL roles
│   └── /register        Candidates only
│
└── PRIVATE SURFACE →  Internal ATS Dashboard
    └── /dashboard        Role-specific landing
    └── /dashboard/*      All internal features
    └── Protected by auth + role guard
```

**Key constraint:** This is NOT a public marketplace. It is an internal ATS for one company. The public surface exists only so candidates can browse open offers and apply. All real work happens in the private dashboard.

---

## PART 1 — BACKEND ARCHITECTURE

---

### 1.1 — API Structure (No Changes Needed)

The existing API already serves both surfaces correctly:

```
Public endpoints (no auth required):
  GET  /api/v1/jobs/offers/         → list open offers (status=open only)
  GET  /api/v1/jobs/offers/:slug/   → offer detail
  GET  /api/v1/jobs/skills/         → skills list (for search filters)
  POST /api/v1/auth/login/          → all roles
  POST /api/v1/auth/register/       → candidates only (enforce in view)

Private endpoints (auth required + role permissions):
  GET  /api/v1/jobs/offers/         → recruiter/HR sees all statuses
  POST /api/v1/jobs/offers/         → recruiter/HR only
  ...everything else already built
```

### 1.2 — Add `slug` Field to JobOffer

Public URLs must be human-readable, not `/jobs/42/`.

**File: `apps/jobs/models.py`**
```python
from django.utils.text import slugify
import uuid

class JobOffer(models.Model):
    # ... existing fields ...
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)
            unique = f"{base}-{uuid.uuid4().hex[:8]}"
            self.slug = unique
        super().save(*args, **kwargs)
```

**Migration:** `python manage.py makemigrations jobs --name add_slug_to_joboffer`

### 1.3 — Public JobOffer Serializer

The public serializer exposes LESS data than the private one. No internal notes, no applications_count, no created_by details.

**File: `apps/jobs/serializers.py`** — add:
```python
class PublicJobOfferSerializer(ModelSerializer):
    """
    Used for the public candidate-facing surface.
    Never exposes: created_by details, internal notes,
                   application counts, salary if configured to hide.
    """
    skills = SkillSerializer(many=True, read_only=True)
    company_name = SerializerMethodField()

    def get_company_name(self, obj):
        return settings.COMPANY_NAME  # from env/settings

    class Meta:
        model = JobOffer
        fields = [
            'id', 'slug', 'title', 'description',
            'contract_type', 'location', 'experience_years',
            'salary_min', 'salary_max',  # null if company hides salary
            'skills', 'deadline', 'company_name', 'created_at',
        ]
        # status is always 'open' for public — no need to expose
```

### 1.4 — Public Views (Unauthenticated)

**File: `apps/jobs/views.py`** — add:
```python
class PublicJobListView(generics.ListAPIView):
    """
    GET /api/v1/public/jobs/
    No authentication required.
    Always filters: status=open, deadline__gte=today or null.
    Supports: search (title, description), skills filter,
              contract_type filter, location filter, ordering.
    Uses PublicJobOfferSerializer — never exposes internal data.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicJobOfferSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'deadline']
    ordering = ['-created_at']

    def get_queryset(self):
        return JobOffer.objects.filter(
            status='open'
        ).filter(
            Q(deadline__isnull=True) | Q(deadline__gte=date.today())
        ).prefetch_related('skills')

class PublicJobDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/public/jobs/:slug/
    No authentication required.
    Returns full offer detail for the public surface.
    """
    permission_classes = [AllowAny]
    serializer_class = PublicJobOfferSerializer
    queryset = JobOffer.objects.filter(status='open').prefetch_related('skills')
    lookup_field = 'slug'
```

### 1.5 — Register View: Candidates Only

**File: `apps/users/views.py`** — enforce in RegisterView:
```python
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # ENFORCE: registration is for candidates only
        # Never allow registering as admin/hr_manager/recruiter
        # Non-candidates are created by admin via /api/v1/users/
        if data.get('role') and data['role'] != 'candidate':
            raise PermissionDenied(
                detail="Self-registration is only available for candidates. "
                       "Contact your administrator to create other account types."
            )
        data['role'] = 'candidate'  # force regardless of what was sent
        # ... rest of registration logic
```

### 1.6 — Add Public Routes

**File: `config/urls.py`** — add:
```python
urlpatterns = [
    # ... existing routes ...
    path('api/v1/public/', include('apps.jobs.public_urls')),
]
```

**File: `apps/jobs/public_urls.py`** — new file:
```python
urlpatterns = [
    path('jobs/', PublicJobListView.as_view(), name='public-job-list'),
    path('jobs/<slug:slug>/', PublicJobDetailView.as_view(), name='public-job-detail'),
]
```

### 1.7 — COMPANY_NAME Setting

**`.env.example`:**
```env
COMPANY_NAME=JobTech Solutions
COMPANY_LOGO_URL=https://...  # optional
HIDE_SALARY=False             # if True, salary fields return null in public serializer
```

**`config/settings/base.py`:**
```python
COMPANY_NAME = env('COMPANY_NAME', default='JobTech Solutions')
HIDE_SALARY = env.bool('HIDE_SALARY', default=False)
```

---

## PART 2 — FRONTEND ARCHITECTURE

---

### 2.1 — Core Principle: Two Layouts, One Router

The entire separation between public and private is handled by **two distinct layout components**. The router decides which layout wraps which pages.

```
App
├── <PublicLayout>     → used by all public/* pages
│   ├── PublicNavbar   (logo + "Post a Job" + Login btn)
│   ├── <Outlet />     (page content)
│   └── PublicFooter
│
└── <DashboardLayout>  → used by all dashboard/* pages
    ├── Sidebar        (role-aware nav)
    ├── Topbar         (user info + notifications)
    └── <Outlet />     (page content)
```

**There is no "mixed" layout.** A page is either fully public or fully dashboard. Never both.

---

### 2.2 — Complete Folder Structure

```
src/
├── api/
│   ├── client.ts                # Axios instance + interceptors (existing)
│   └── endpoints.ts             # All URL constants (add public endpoints)
│
├── components/
│   ├── ui/                      # Atomic components (existing)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Spinner.tsx
│   │   ├── Select.tsx
│   │   ├── FileUpload.tsx
│   │   └── PasswordStrengthMeter.tsx
│   │
│   ├── public/                  # ← NEW: public surface components
│   │   ├── PublicLayout.tsx     # Wrapper: navbar + footer + outlet
│   │   ├── PublicNavbar.tsx     # Logo, search bar shortcut, login link
│   │   └── PublicFooter.tsx     # Company info, links
│   │
│   └── dashboard/               # ← RENAME from shared/
│       ├── DashboardLayout.tsx  # Wrapper: sidebar + topbar + outlet
│       ├── Sidebar.tsx          # Role-aware nav (existing, move here)
│       ├── Topbar.tsx           # (existing, move here)
│       └── SkeletonLoader.tsx
│
├── features/
│   ├── auth/                    # (existing — login, register)
│   ├── jobs/                    # (existing — private dashboard jobs)
│   ├── applications/            # (existing — private dashboard applications)
│   ├── users/                   # (existing — admin user management)
│   │
│   └── public/                  # ← NEW: public candidate surface
│       ├── components/
│       │   ├── JobSearchBar.tsx       # Keyword + location search
│       │   ├── JobCard.tsx            # Card for job listing
│       │   ├── JobList.tsx            # Grid/list of JobCards
│       │   ├── JobFilters.tsx         # Sidebar filters (skills, type, etc.)
│       │   ├── JobDetailView.tsx      # Full offer detail
│       │   ├── ApplyButton.tsx        # Context-aware: login→apply flow
│       │   ├── HeroBanner.tsx         # Homepage hero section
│       │   └── StatsBar.tsx           # "X open positions, Y companies"
│       ├── hooks/
│       │   ├── usePublicJobs.ts       # React Query: public job list
│       │   └── usePublicJob.ts        # React Query: single job by slug
│       ├── api.ts                     # Public API calls (no auth)
│       └── pages/
│           ├── HomePage.tsx           # Hero + featured jobs
│           └── JobsPage.tsx           # Full searchable listing
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx              # Single login for ALL roles
│   │   └── RegisterPage.tsx           # Candidates only
│   ├── dashboard/
│   │   ├── AdminDashboard.tsx
│   │   ├── HRDashboard.tsx
│   │   ├── RecruiterDashboard.tsx
│   │   └── CandidateDashboard.tsx     # ← candidate's private: my applications
│   ├── jobs/
│   │   └── JobDetailPage.tsx          # Public: /jobs/:slug
│   └── errors/
│       ├── NotFoundPage.tsx
│       └── ForbiddenPage.tsx
│
├── router/
│   ├── index.tsx                      # ← FULL REBUILD (see below)
│   └── ProtectedRoute.tsx             # Auth + role guard (existing)
│
├── store/
│   ├── authStore.ts                   # (existing)
│   └── uiStore.ts                     # (existing)
│
└── utils/
    ├── constants.ts
    └── formatters.ts
```

---

### 2.3 — Router: The Single Source of Truth

This is the most important file. Every routing decision lives here.

**File: `src/router/index.tsx`**

```tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import { PublicLayout }    from '@/components/public/PublicLayout'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

// Guards
import { ProtectedRoute }  from './ProtectedRoute'
import { GuestRoute }      from './GuestRoute'       // ← NEW: redirect if already logged in

// Public pages
import { HomePage }        from '@/features/public/pages/HomePage'
import { JobsPage }        from '@/features/public/pages/JobsPage'
import { JobDetailPage }   from '@/pages/jobs/JobDetailPage'

// Auth pages
import { LoginPage }       from '@/pages/auth/LoginPage'
import { RegisterPage }    from '@/pages/auth/RegisterPage'

// Dashboard pages
import { AdminDashboard }     from '@/pages/dashboard/AdminDashboard'
import { HRDashboard }        from '@/pages/dashboard/HRDashboard'
import { RecruiterDashboard } from '@/pages/dashboard/RecruiterDashboard'
import { CandidateDashboard } from '@/pages/dashboard/CandidateDashboard'

// Feature pages (dashboard)
import { UserManagementPage } from '@/features/users/pages/UserManagementPage'
import { UserDetailPage }     from '@/features/users/pages/UserDetailPage'
import { JobsListPage }       from '@/features/jobs/pages/JobsListPage'
import { CreateJobPage }      from '@/features/jobs/pages/CreateJobPage'
import { ApplicationsPage }   from '@/features/applications/pages/ApplicationsPage'
import { MyApplicationsPage } from '@/features/applications/pages/MyApplicationsPage'

// Error pages
import { NotFoundPage }   from '@/pages/errors/NotFoundPage'
import { ForbiddenPage }  from '@/pages/errors/ForbiddenPage'

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-BASED REDIRECT
// Determines where to send a user after login based on their role
// ─────────────────────────────────────────────────────────────────────────────
export function getRoleHomePath(role: string): string {
  switch (role) {
    case 'admin':       return '/dashboard/admin'
    case 'hr_manager':  return '/dashboard/hr'
    case 'recruiter':   return '/dashboard/recruiter'
    case 'candidate':   return '/dashboard/candidate'
    default:            return '/login'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER DEFINITION
// ─────────────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([

  // ══════════════════════════════════════════════════
  // PUBLIC SURFACE — wrapped in PublicLayout
  // Accessible by everyone, authenticated or not
  // ══════════════════════════════════════════════════
  {
    element: <PublicLayout />,
    children: [
      { path: '/',            element: <HomePage /> },
      { path: '/jobs',        element: <JobsPage /> },
      { path: '/jobs/:slug',  element: <JobDetailPage /> },
    ],
  },

  // ══════════════════════════════════════════════════
  // AUTH PAGES — no layout wrapper
  // Redirect to dashboard if already authenticated
  // ══════════════════════════════════════════════════
  {
    element: <GuestRoute />,   // redirects authenticated users away
    children: [
      { path: '/login',    element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // ══════════════════════════════════════════════════
  // PRIVATE DASHBOARD — wrapped in DashboardLayout
  // Requires authentication. Role-specific sub-routes.
  // ══════════════════════════════════════════════════
  {
    path: '/dashboard',
    element: <ProtectedRoute />,   // checks isAuthenticated
    children: [
      {
        element: <DashboardLayout />,
        children: [

          // Default /dashboard → redirect to role-specific path
          {
            index: true,
            element: <RoleRedirect />,   // see component below
          },

          // ── Admin ─────────────────────────────────
          {
            path: 'admin',
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { index: true,           element: <AdminDashboard /> },
              { path: 'users',         element: <UserManagementPage /> },
              { path: 'users/:id',     element: <UserDetailPage /> },
              { path: 'jobs',          element: <JobsListPage /> },
              { path: 'jobs/new',      element: <CreateJobPage /> },
              { path: 'applications',  element: <ApplicationsPage /> },
            ],
          },

          // ── HR Manager ────────────────────────────
          {
            path: 'hr',
            element: <ProtectedRoute allowedRoles={['hr_manager']} />,
            children: [
              { index: true,           element: <HRDashboard /> },
              { path: 'jobs',          element: <JobsListPage /> },
              { path: 'jobs/new',      element: <CreateJobPage /> },
              { path: 'applications',  element: <ApplicationsPage /> },
            ],
          },

          // ── Recruiter ─────────────────────────────
          {
            path: 'recruiter',
            element: <ProtectedRoute allowedRoles={['recruiter']} />,
            children: [
              { index: true,           element: <RecruiterDashboard /> },
              { path: 'jobs',          element: <JobsListPage /> },
              { path: 'jobs/new',      element: <CreateJobPage /> },
              { path: 'applications',  element: <ApplicationsPage /> },
            ],
          },

          // ── Candidate ─────────────────────────────
          {
            path: 'candidate',
            element: <ProtectedRoute allowedRoles={['candidate']} />,
            children: [
              { index: true,           element: <CandidateDashboard /> },
              { path: 'applications',  element: <MyApplicationsPage /> },
            ],
          },

        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════
  // ERROR PAGES
  // ══════════════════════════════════════════════════
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*',    element: <NotFoundPage /> },

])

// ─────────────────────────────────────────────────────────────────────────────
// RoleRedirect — /dashboard → correct sub-path
// ─────────────────────────────────────────────────────────────────────────────
function RoleRedirect() {
  const role = useAuthStore(s => s.role)
  return <Navigate to={getRoleHomePath(role ?? '')} replace />
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
```

---

### 2.4 — GuestRoute (New Guard)

Prevents authenticated users from seeing login/register pages.

**File: `src/router/GuestRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getRoleHomePath } from './index'

/**
 * GuestRoute — redirects authenticated users to their dashboard.
 * Used to wrap /login and /register.
 * A logged-in user visiting /login goes straight to /dashboard/[role].
 */
export function GuestRoute() {
  const { isAuthenticated, role } = useAuthStore()

  if (isAuthenticated && role) {
    return <Navigate to={getRoleHomePath(role)} replace />
  }

  return <Outlet />
}
```

---

### 2.5 — Updated ProtectedRoute

**File: `src/router/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

/**
 * ProtectedRoute
 * - No auth → redirect to /login (preserves intended URL in state)
 * - Wrong role → redirect to /403
 * - Correct → render children
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
```

---

### 2.6 — Login Page: Role-Based Redirect After Login

**File: `src/pages/auth/LoginPage.tsx`**

```tsx
/**
 * Single login page for ALL roles.
 * After successful login:
 *   - If came from a specific URL (/jobs/some-job → was about to apply)
 *     redirect back to that URL
 *   - Otherwise: redirect to role-based dashboard
 * Registration link is shown but labeled "Create candidate account"
 * to signal it's only for candidates.
 */
export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const from = (location.state as any)?.from?.pathname

  const { mutate: login, isPending } = useLogin({
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken)

      // If redirected from a specific page (e.g. clicked Apply on a job)
      // go back there — otherwise go to role dashboard
      const destination = from && from !== '/login'
        ? from
        : getRoleHomePath(user.role)

      navigate(destination, { replace: true })
    },
  })

  // ... form JSX
}
```

---

### 2.7 — Public Layout

**File: `src/components/public/PublicLayout.tsx`**

```tsx
/**
 * PublicLayout — wraps all public-facing pages.
 * Completely separate from DashboardLayout.
 * No sidebar, no topbar, no dashboard chrome.
 */
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
```

**File: `src/components/public/PublicNavbar.tsx`**

```tsx
/**
 * PublicNavbar
 * - Left: Company logo
 * - Center: Job search shortcut (links to /jobs with query)
 * - Right: context-aware auth buttons
 *   • Unauthenticated: [Login] [Post a Job → goes to /login]
 *   • Authenticated candidate: [My Applications] [Logout]
 *   • Authenticated staff: [Go to Dashboard →] (no logout here)
 *
 * Design: clean, white, subtle bottom border.
 * Sticky on scroll.
 */
export function PublicNavbar() {
  const { isAuthenticated, role } = useAuthStore()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-600">JobTech</span>
          </Link>

          {/* Search shortcut (desktop) */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <QuickSearchBar />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {!isAuthenticated && (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
              </>
            )}
            {isAuthenticated && role === 'candidate' && (
              <>
                <Link to="/dashboard/candidate/applications">
                  <Button variant="ghost" size="sm">My Applications</Button>
                </Link>
                <LogoutButton />
              </>
            )}
            {isAuthenticated && role !== 'candidate' && (
              <Link to={getRoleHomePath(role!)}>
                <Button variant="primary" size="sm">Go to Dashboard →</Button>
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
```

---

### 2.8 — HomePage

**File: `src/features/public/pages/HomePage.tsx`**

```tsx
/**
 * HomePage — /
 * Sections:
 * 1. HeroBanner     — headline + search bar (keyword + location)
 * 2. StatsBar       — "X open positions" (from API count)
 * 3. FeaturedJobs   — latest 6 open jobs (React Query)
 * 4. CallToAction   — "Are you a recruiter? Contact us."
 *
 * No auth required. Works for everyone.
 * Candidate CTA: "Apply now" links to /jobs/:slug
 * Search bar submits to /jobs?search=...&location=...
 */
export function HomePage() {
  const { data: featuredJobs } = usePublicJobs({
    page_size: 6,
    ordering: '-created_at'
  })

  return (
    <div>
      <HeroBanner />
      <StatsBar />
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Latest Opportunities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredJobs?.results.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/jobs">
            <Button variant="outline">View All Positions</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
```

---

### 2.9 — JobsPage (Public Listing)

**File: `src/features/public/pages/JobsPage.tsx`**

```tsx
/**
 * JobsPage — /jobs
 * Indeed-inspired job listing page.
 *
 * Layout:
 *   [Search bar — full width at top]
 *   [Filters sidebar] | [Job list + pagination]
 *
 * All filters synced to URL (useSearchParams):
 *   ?search=django&location=casablanca&contract_type=cdi&skills=1,2
 *
 * No auth required.
 * JobCard "Apply" button:
 *   - Unauthenticated → redirects to /login (state: { from: /jobs/:slug })
 *   - Authenticated candidate → opens apply modal or goes to /jobs/:slug
 *   - Authenticated staff → shows "Login as candidate to apply"
 */
export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFiltersFromSearchParams(searchParams)

  const { data, isLoading } = usePublicJobs(filters)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search bar */}
      <JobSearchBar
        defaultValues={filters}
        onSearch={(values) => setSearchParams(values)}
      />

      <div className="flex gap-8 mt-6">
        {/* Sidebar filters */}
        <aside className="hidden lg:block w-64 shrink-0">
          <JobFilters
            filters={filters}
            onChange={(updated) => setSearchParams(updated)}
          />
        </aside>

        {/* Job list */}
        <div className="flex-1">
          {isLoading
            ? <JobListSkeleton />
            : <JobList jobs={data?.results ?? []} totalCount={data?.count ?? 0} />
          }
          <Pagination
            currentPage={filters.page ?? 1}
            totalCount={data?.count ?? 0}
            pageSize={20}
            onPageChange={(p) => setSearchParams({ ...filters, page: String(p) })}
          />
        </div>
      </div>
    </div>
  )
}
```

---

### 2.10 — JobDetailPage (Public)

**File: `src/pages/jobs/JobDetailPage.tsx`**

```tsx
/**
 * JobDetailPage — /jobs/:slug
 * Full job offer detail for candidates.
 *
 * Sections:
 * 1. Job header: title, company, location, contract type, posted date
 * 2. Skills required: skill badges
 * 3. Description: full text
 * 4. Salary range (if not hidden)
 * 5. Apply section (sticky on mobile):
 *    - Unauthenticated → "Sign in to apply" button (redirects to /login)
 *    - Authenticated candidate → "Apply Now" → ApplyModal
 *    - Already applied → "Application submitted ✓" (disabled)
 *    - Staff role → "Log in as a candidate to apply"
 */
export function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated, role } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: job, isLoading } = usePublicJob(slug!)

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    // open apply modal
    setApplyModalOpen(true)
  }

  if (isLoading) return <JobDetailSkeleton />
  if (!job) return <NotFoundPage />

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Main content */}
        <div className="flex-1">
          <JobHeader job={job} />
          <SkillsList skills={job.skills} />
          <div className="prose max-w-none mt-6">
            {/* Render description as markdown or plain text */}
            <p className="whitespace-pre-wrap text-gray-700">{job.description}</p>
          </div>
        </div>

        {/* Sticky apply card */}
        <aside className="lg:w-72 shrink-0">
          <ApplyCard
            job={job}
            isAuthenticated={isAuthenticated}
            role={role}
            onApplyClick={handleApplyClick}
          />
        </aside>

      </div>
    </div>
  )
}
```

---

### 2.11 — ApplyButton Logic (Context-Aware)

```tsx
/**
 * ApplyButton — shown on JobCard and JobDetailPage.
 * Behavior depends on auth state and role.
 */
export function ApplyButton({ job, size = 'md' }: ApplyButtonProps) {
  const { isAuthenticated, role } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [modalOpen, setModalOpen] = useState(false)

  // Check if candidate already applied (React Query)
  const { data: myApplications } = useMyApplications({ enabled: role === 'candidate' })
  const alreadyApplied = myApplications?.results.some(a => a.offer.id === job.id)

  if (!isAuthenticated) {
    return (
      <Button
        variant="primary"
        size={size}
        onClick={() => navigate('/login', { state: { from: location } })}
      >
        Sign in to Apply
      </Button>
    )
  }

  if (role !== 'candidate') {
    return (
      <Button variant="ghost" size={size} disabled>
        Staff account — cannot apply
      </Button>
    )
  }

  if (alreadyApplied) {
    return (
      <Button variant="success" size={size} disabled>
        ✓ Application submitted
      </Button>
    )
  }

  return (
    <>
      <Button variant="primary" size={size} onClick={() => setModalOpen(true)}>
        Apply Now
      </Button>
      <ApplyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        job={job}
      />
    </>
  )
}
```

---

### 2.12 — Public API Hooks

**File: `src/features/public/api.ts`**
```typescript
// Uses same Axios client but these endpoints don't attach auth headers
// (AllowAny on backend — but if user IS logged in, token is fine to send)
export const publicApi = {
  getJobs: (params: PublicJobFilters) =>
    client.get<PaginatedResponse<PublicJob>>(ENDPOINTS.PUBLIC.JOBS, { params }),

  getJob: (slug: string) =>
    client.get<PublicJob>(ENDPOINTS.PUBLIC.JOB_DETAIL(slug)),
}
```

**File: `src/features/public/hooks/usePublicJobs.ts`**
```typescript
export function usePublicJobs(filters: PublicJobFilters = {}) {
  return useQuery({
    queryKey: ['public', 'jobs', filters],
    queryFn: () => publicApi.getJobs(filters),
    staleTime: 2 * 60 * 1000,  // 2 minutes — public data doesn't change often
  })
}
```

**Add to `src/api/endpoints.ts`:**
```typescript
PUBLIC: {
  JOBS:       '/public/jobs/',
  JOB_DETAIL: (slug: string) => `/public/jobs/${slug}/`,
},
```

---

### 2.13 — CandidateDashboard (Private)

The candidate has TWO surfaces:
- **Public surface** (`/jobs`, `/jobs/:slug`) — browse and apply
- **Private dashboard** (`/dashboard/candidate`) — track their applications

```tsx
/**
 * CandidateDashboard — /dashboard/candidate
 * Private area for candidates.
 * Only accessible after login.
 *
 * Content:
 * - Greeting + stats (X applications, Y in review, Z interviews)
 * - Recent applications list with status badges
 * - "Browse More Jobs" CTA → links back to /jobs
 */
export function CandidateDashboard() {
  const user = useAuthStore(s => s.user)
  const { data: myApps } = useMyApplications({ page_size: 5 })

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome back, {user?.first_name} 👋
      </h1>
      <p className="text-gray-500 mb-6">Track your job applications</p>

      {/* Stats */}
      <ApplicationStatsCards />

      {/* Recent applications */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Applications</h2>
          <Link to="/dashboard/candidate/applications"
                className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <ApplicationsMiniList applications={myApps?.results ?? []} />
      </section>

      {/* CTA to browse more jobs */}
      <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-semibold text-blue-900">Looking for more opportunities?</h3>
        <p className="text-blue-700 text-sm mt-1 mb-3">
          Browse all open positions and apply directly.
        </p>
        <Link to="/jobs">
          <Button variant="primary">Browse Open Jobs</Button>
        </Link>
      </div>
    </div>
  )
}
```

---

## PART 3 — DATA FLOW DIAGRAM

```
USER VISITS /jobs
    │
    ▼
PublicLayout renders
    │
    ├── JobsPage fetches GET /api/v1/public/jobs/ (no auth required)
    │       └── Backend: status=open only, PublicJobOfferSerializer
    │
    └── User clicks "Apply Now"
            │
            ├── NOT logged in → navigate('/login', { state: { from: /jobs/:slug } })
            │       └── After login → redirected back to /jobs/:slug
            │
            └── Logged in as candidate → ApplyModal
                    └── POST /api/v1/applications/ (auth required)
                            └── Backend: creates Application, queues Celery tasks


USER VISITS /login
    │
    ├── Already authenticated → GuestRoute → Navigate to /dashboard/[role]
    │
    └── Submits credentials
            │
            ├── Success → setAuth(user, token)
            │       │
            │       ├── role=candidate   → /dashboard/candidate
            │       ├── role=recruiter   → /dashboard/recruiter
            │       ├── role=hr_manager  → /dashboard/hr
            │       └── role=admin       → /dashboard/admin
            │
            └── Failure → inline error (no user enumeration)


USER VISITS /dashboard/admin/users (wrong role)
    │
    ├── Not authenticated → ProtectedRoute → /login
    └── Wrong role (e.g. recruiter) → ProtectedRoute → /403
```

---

## PART 4 — COMPLETE CHECKLIST

### Backend
- [ ] `slug` field added to `JobOffer` model and migration applied
- [ ] `PublicJobOfferSerializer` — never exposes internal fields
- [ ] `PublicJobListView` — `AllowAny`, filters `status=open` only
- [ ] `PublicJobDetailView` — `AllowAny`, lookup by `slug`
- [ ] `RegisterView` — forces `role=candidate`, ignores any other value
- [ ] `COMPANY_NAME` in settings + `.env.example`
- [ ] `apps/jobs/public_urls.py` — separate URL file for public routes
- [ ] `/api/v1/public/` included in `config/urls.py`

### Frontend
- [ ] `GuestRoute` implemented — redirects authenticated users from /login
- [ ] `getRoleHomePath(role)` function — single source of truth for role redirects
- [ ] `ProtectedRoute` updated — handles no-auth + wrong-role cases
- [ ] Router rebuilt — all routes in one file, two distinct layout trees
- [ ] `PublicLayout` — completely separate from `DashboardLayout`
- [ ] `PublicNavbar` — context-aware: different actions per auth state
- [ ] `HomePage` — hero + search + featured jobs
- [ ] `JobsPage` — search + filters (URL-synced) + paginated list
- [ ] `JobDetailPage` — full detail + sticky apply card
- [ ] `ApplyButton` — 4 states: unauthenticated / candidate / already-applied / staff
- [ ] `CandidateDashboard` — private area + CTA back to /jobs
- [ ] `usePublicJobs` + `usePublicJob` — separate from private jobs hooks
- [ ] Login page: preserves `from` location state for post-login redirect
- [ ] All filters on `/jobs` synced to URL — bookmarkable

### Architecture Rules (Non-Negotiable)
- [ ] Public routes NEVER import from `features/jobs/` (private)
- [ ] Private routes NEVER import from `features/public/`
- [ ] No API calls with private permissions in public components
- [ ] `PublicJobOfferSerializer` and private `JobOfferDetailSerializer` are separate classes
- [ ] `RegisterView` always sets `role=candidate` — cannot be overridden by request body
- [ ] All filter state on `/jobs` in URL — never in component state only
- [ ] `getRoleHomePath` is the ONLY place that maps role → path

---

## PART 5 — FILES TO CREATE/MODIFY (In Order)

### Backend
1. `apps/jobs/models.py` — add `slug` field
2. `python manage.py makemigrations jobs --name add_slug_to_joboffer`
3. `python manage.py migrate`
4. `apps/jobs/serializers.py` — add `PublicJobOfferSerializer`
5. `apps/jobs/views.py` — add `PublicJobListView`, `PublicJobDetailView`
6. `apps/jobs/public_urls.py` — new file
7. `config/urls.py` — include public routes
8. `apps/users/views.py` — harden RegisterView (force role=candidate)
9. `config/settings/base.py` — add `COMPANY_NAME`, `HIDE_SALARY`
10. `.env.example` — add new vars

### Frontend
1. `src/router/GuestRoute.tsx` — new file
2. `src/router/ProtectedRoute.tsx` — update (add allowedRoles support)
3. `src/router/index.tsx` — full rebuild with dual layout tree
4. `src/api/endpoints.ts` — add PUBLIC endpoints
5. `src/features/public/api.ts` — new file
6. `src/features/public/hooks/usePublicJobs.ts` — new file
7. `src/features/public/hooks/usePublicJob.ts` — new file
8. `src/features/public/components/JobCard.tsx`
9. `src/features/public/components/JobSearchBar.tsx`
10. `src/features/public/components/JobFilters.tsx`
11. `src/features/public/components/JobList.tsx`
12. `src/features/public/components/HeroBanner.tsx`
13. `src/features/public/components/ApplyButton.tsx`
14. `src/features/public/components/ApplyModal.tsx`
15. `src/features/public/pages/HomePage.tsx`
16. `src/features/public/pages/JobsPage.tsx`
17. `src/pages/jobs/JobDetailPage.tsx`
18. `src/components/public/PublicLayout.tsx`
19. `src/components/public/PublicNavbar.tsx`
20. `src/components/public/PublicFooter.tsx`
21. `src/pages/auth/LoginPage.tsx` — update (add from-redirect logic)
22. `src/pages/dashboard/CandidateDashboard.tsx` — update (add Browse Jobs CTA)
23. `src/components/dashboard/DashboardLayout.tsx` — rename from shared/Layout

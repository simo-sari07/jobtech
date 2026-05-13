# JobTech Solutions — Phase: User Management
# Complete Admin User Management System
# Backend + Frontend + Real-time Online Status

---

## CONTEXT — Everything Built So Far (Do NOT Re-implement)

### Phase 1 (Complete)
- Custom User model: `id, email, first_name, last_name, role, phone, avatar, is_active, date_joined`
- Roles: `admin | hr_manager | recruiter | candidate`
- `AUTH_USER_MODEL = 'users.User'` — migrations applied
- JWT: access=15min, refresh=7d, rotation=True, blacklist enabled
- `core/exceptions.py` → uniform JSON: `{ success, error: { code, message, details } }`
- `core/permissions.py` → `IsAdmin, IsHRManager, IsRecruiter, IsCandidate, IsRecruiterOrHRManager`
- `core/pagination.py` → `StandardResultsPagination` (page_size=20)
- Auth endpoints live: `/api/v1/auth/` (register, login, logout, me, token/refresh)
- All business logic in `apps/users/services/auth_service.py`
- Frontend: Zustand authStore, Axios client with JWT interceptors, ProtectedRoute, Layout shell, role-aware Sidebar

### Phase 2 (Complete)
- `apps/jobs/` — Skill, JobOffer models, full CRUD, status lifecycle, django-filter
- `apps/applications/` — Application model, CV upload, status pipeline
- Celery + Redis configured, `send_status_notification_email` task running
- Frontend: jobs feature, applications feature, FileUpload component, DataTable

---

## Phase Goal

Build a **professional, secure, full-featured User Management system** accessible only to Admins. This is the control center of the platform — Admins manage every user account, assign roles, reset passwords, view real-time online status, and audit all activity.

This phase introduces **real-time online presence** (who is currently on the platform) using Redis as a presence store — no WebSocket required for MVP, polling-based with WebSocket upgrade path built in.

---

## Backend: What to Build

---

### 1. Extend the User Model

**File: `apps/users/models.py`** — add fields to existing User model:

```python
# Add to existing User model
last_activity: DateTimeField(null=True, blank=True)
# Tracks last API request — updated by middleware
# Used to determine "online" status: online if last_activity > now - 5 minutes

is_online: property  # computed, not stored: last_activity > now - timedelta(minutes=5)
```

**Migration:** `python manage.py makemigrations users --name add_last_activity`

---

### 2. Online Presence Middleware

**File: `core/middleware.py`**

```python
class OnlinePresenceMiddleware:
    """
    Updates user's last_activity on every authenticated API request.
    Uses Redis for fast writes — DB update batched via Celery task every 60s.
    
    Implementation:
    - On every request: write user_id + timestamp to Redis key: 
      "presence:{user_id}" with TTL=300 (5 minutes)
    - Celery beat task every 60s: flush Redis presence keys to DB
      (batch UPDATE — not one query per user)
    - This avoids a DB write on every API request
    
    Redis key format: "jobtech:presence:{user_id}" → timestamp (ISO)
    TTL: 300 seconds (5 minutes) — key auto-expires = user goes offline
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # After response: update presence if authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            self._update_presence(request.user.id)
        return response

    def _update_presence(self, user_id):
        # Write to Redis only (fast, non-blocking)
        # Format: SET jobtech:presence:{user_id} {timestamp} EX 300
        pass  # implement with django_redis or redis-py
```

**Register in `base.py`:**
```python
MIDDLEWARE = [
    ...
    'core.middleware.OnlinePresenceMiddleware',  # after AuthenticationMiddleware
]
```

---

### 3. Celery Task: Flush Presence to DB

**File: `apps/users/tasks.py`**

```python
@shared_task
def flush_presence_to_db():
    """
    Runs every 60 seconds via Celery beat.
    Scans Redis for jobtech:presence:* keys.
    Batch-updates User.last_activity in a single DB query.
    Never updates users who are not in Redis (already expired = offline).
    """
    # 1. redis_client.scan_iter("jobtech:presence:*")
    # 2. Extract user_ids and timestamps
    # 3. User.objects.bulk_update([...], ['last_activity'])

@shared_task  
def cleanup_stale_presence():
    """
    Runs every 10 minutes.
    Sets last_activity=None for users whose Redis key has expired
    but DB still shows recent last_activity (edge case cleanup).
    """
```

**Add to Celery beat schedule in `config/celery.py`:**
```python
beat_schedule = {
    'flush-presence-to-db': {
        'task': 'apps.users.tasks.flush_presence_to_db',
        'schedule': 60.0,  # every 60 seconds
    },
    'cleanup-stale-presence': {
        'task': 'apps.users.tasks.cleanup_stale_presence', 
        'schedule': 600.0,  # every 10 minutes
    },
}
```

---

### 4. User Management Service

**File: `apps/users/services/user_management_service.py`**

All business logic here. Views stay thin.

```python
def list_users(
    requesting_admin: User,
    filters: dict,
    ordering: str,
    page: int
) -> QuerySet:
    """
    Returns annotated queryset with:
    - is_online (computed from Redis presence key existence)
    - application_count (Count annotation)
    - last_activity
    Applies all filters and ordering.
    Never returns the requesting admin's own account in the list
    (admin manages others, not self — use /me for self).
    """

def get_user_detail(user_id: int, requesting_admin: User) -> User:
    """
    Returns full user detail.
    Raises PermissionDenied if non-admin tries to access another user.
    """

def create_user(data: dict, requesting_admin: User) -> User:
    """
    Creates user with specified role.
    Sends welcome email with temporary password via Celery.
    Validates:
    - Email uniqueness (safe error — no enumeration)
    - Password strength (same validators as registration)
    - Role is a valid choice
    Returns created user (without password field).
    """

def update_user(user_id: int, data: dict, requesting_admin: User) -> User:
    """
    Updates user fields (not password — separate endpoint).
    Validates:
    - Cannot demote/promote self
    - Cannot modify another Admin's account (Admins cannot edit Admins)
    - Email uniqueness if email is being changed
    """

def change_password(
    user_id: int,
    new_password: str,
    requesting_admin: User
) -> None:
    """
    Admin force-sets a user's password.
    Validates password strength.
    Blacklists ALL existing refresh tokens for that user (forces re-login).
    Sends password-changed notification email via Celery.
    Logs action in audit trail.
    """

def toggle_active(user_id: int, requesting_admin: User) -> User:
    """
    Activates or deactivates a user account.
    Deactivating: blacklists all their tokens immediately (forces logout).
    Cannot deactivate self.
    Cannot deactivate another Admin.
    """

def get_online_users(requesting_admin: User) -> list[dict]:
    """
    Scans Redis for all jobtech:presence:* keys.
    Returns list of {user_id, last_activity} for currently online users.
    Frontend polls this every 30 seconds.
    """

def get_user_stats(requesting_admin: User) -> dict:
    """
    Returns dashboard stats:
    - total_users (by role breakdown)
    - active_users_count
    - online_now_count (from Redis)
    - new_users_this_month
    - new_users_this_week
    """

def bulk_action(
    user_ids: list[int],
    action: str,  # 'activate' | 'deactivate' | 'delete'
    requesting_admin: User
) -> dict:  # { success_count, failed_ids, errors }
    """
    Bulk activate/deactivate/delete users.
    Validates each user before acting (skips Admins, skips self).
    Returns partial success report.
    """
```

---

### 5. Security: Audit Log

**File: `apps/users/models.py`** — add new model:

```python
class UserAuditLog(models.Model):
    """
    Immutable log of all admin actions on user accounts.
    Never deleted. Never updated. Only appended.
    """
    ACTION_CHOICES = [
        ('created', 'User Created'),
        ('updated', 'Profile Updated'),
        ('password_changed', 'Password Changed'),
        ('activated', 'Account Activated'),
        ('deactivated', 'Account Deactivated'),
        ('deleted', 'Account Deleted'),
        ('role_changed', 'Role Changed'),
        ('login', 'User Logged In'),
        ('logout', 'User Logged Out'),
        ('failed_login', 'Failed Login Attempt'),
    ]
    
    actor: FK(User, null=True, on_delete=SET_NULL)    # admin who performed action
    target: FK(User, null=True, on_delete=SET_NULL)   # user being acted upon
    action: CharField(choices=ACTION_CHOICES)
    ip_address: GenericIPAddressField(null=True)
    user_agent: TextField(blank=True)
    old_values: JSONField(null=True)                  # before state (no passwords)
    new_values: JSONField(null=True)                  # after state (no passwords)
    timestamp: DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['actor', 'timestamp']),
            models.Index(fields=['target', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]
    
    # Never allow update or delete
    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Audit logs are immutable.")
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        raise PermissionError("Audit logs cannot be deleted.")
```

**File: `apps/users/services/audit_service.py`**
```python
def log_action(
    actor: User | None,
    target: User | None,
    action: str,
    request=None,          # to extract IP + user agent
    old_values: dict = None,
    new_values: dict = None
) -> UserAuditLog:
    """
    Creates audit log entry.
    Extracts IP from X-Forwarded-For (behind proxy) or REMOTE_ADDR.
    Strips sensitive fields from old_values/new_values (password, tokens).
    Called from service layer, never from views.
    """
```

---

### 6. Password Security

**File: `apps/users/validators.py`**

```python
class UppercaseValidator:
    """Password must contain at least one uppercase letter."""
    
class LowercaseValidator:
    """Password must contain at least one lowercase letter."""
    
class SpecialCharacterValidator:
    """Password must contain at least one special character: !@#$%^&*()_+-="""
    
class NoEmailInPasswordValidator:
    """Password must not contain the user's email address."""
    
class NoCommonPatternValidator:
    """Rejects: 12345678, password123, qwerty, etc."""
```

Add to `AUTH_PASSWORD_VALIDATORS` in `base.py`:
```python
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {'NAME': 'apps.users.validators.UppercaseValidator'},
    {'NAME': 'apps.users.validators.LowercaseValidator'},
    {'NAME': 'apps.users.validators.SpecialCharacterValidator'},
]
```

---

### 7. Views

**File: `apps/users/views.py`** — add to existing file:

```python
class UserListView(generics.ListAPIView):
    """GET /api/v1/users/ — Admin only"""
    permission_classes = [IsAdmin]
    serializer_class = UserListSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_class = UserFilter
    ordering_fields = ['date_joined', 'last_name', 'email', 'role', 'last_activity']
    ordering = ['-date_joined']
    search_fields = ['email', 'first_name', 'last_name']
    pagination_class = StandardResultsPagination

class UserCreateView(generics.CreateAPIView):
    """POST /api/v1/users/ — Admin only"""
    permission_classes = [IsAdmin]

class UserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/users/{id}/ — Admin only"""
    permission_classes = [IsAdmin]

class UserPasswordView(generics.UpdateAPIView):
    """PATCH /api/v1/users/{id}/password/ — Admin only"""
    permission_classes = [IsAdmin]
    # Body: { new_password, confirm_password }
    # Action: validate → change → blacklist all tokens → send email

class UserToggleActiveView(generics.UpdateAPIView):
    """PATCH /api/v1/users/{id}/toggle-active/ — Admin only"""
    permission_classes = [IsAdmin]

class UserBulkActionView(generics.GenericAPIView):
    """POST /api/v1/users/bulk-action/ — Admin only"""
    permission_classes = [IsAdmin]
    # Body: { user_ids: number[], action: 'activate'|'deactivate' }

class OnlineUsersView(generics.ListAPIView):
    """GET /api/v1/users/online/ — Admin only"""
    permission_classes = [IsAdmin]
    # Returns list of currently online users from Redis

class UserStatsView(generics.RetrieveAPIView):
    """GET /api/v1/users/stats/ — Admin only"""
    permission_classes = [IsAdmin]

class UserAuditLogView(generics.ListAPIView):
    """GET /api/v1/users/{id}/audit-log/ — Admin only"""
    permission_classes = [IsAdmin]
    # Paginated list of audit events for a specific user

class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/ — Any authenticated user"""
    # Already exists — update to include last_activity in response
```

---

### 8. Serializers

**File: `apps/users/serializers.py`** — add:

```python
class UserListSerializer(ModelSerializer):
    """For the admin user list — lightweight."""
    is_online: SerializerMethodField  # checks Redis
    full_name: SerializerMethodField
    
    class Meta:
        fields = [
            'id', 'email', 'full_name', 'first_name', 'last_name',
            'role', 'is_active', 'is_online', 'last_activity', 'date_joined'
        ]
        # NEVER include: password, is_staff, is_superuser

class UserDetailSerializer(ModelSerializer):
    """For admin detail view — full data."""
    is_online: SerializerMethodField
    
    class Meta:
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'avatar', 'role', 'is_active', 'is_online',
            'last_activity', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined', 'last_activity', 'is_online']

class UserCreateSerializer(ModelSerializer):
    """Admin creates a user."""
    password: CharField(write_only=True)
    confirm_password: CharField(write_only=True)
    
    # Validate: password == confirm_password
    # Validate: password strength (run through AUTH_PASSWORD_VALIDATORS)
    # Validate: email uniqueness with safe error message
    # On create: hash password correctly
    
    class Meta:
        fields = ['email', 'first_name', 'last_name', 'role', 'phone', 'password', 'confirm_password']

class PasswordChangeSerializer(Serializer):
    """Admin changes a user's password."""
    new_password: CharField(write_only=True)
    confirm_password: CharField(write_only=True)
    # Run through full AUTH_PASSWORD_VALIDATORS on new_password

class UserAuditLogSerializer(ModelSerializer):
    actor_name: SerializerMethodField
    target_name: SerializerMethodField
    
    class Meta:
        model = UserAuditLog
        fields = ['id', 'actor_name', 'target_name', 'action', 
                  'ip_address', 'old_values', 'new_values', 'timestamp']
        # Never expose: user_agent in list (only in detail)
```

---

### 9. Filters

**File: `apps/users/filters.py`**

```python
class UserFilter(FilterSet):
    role = MultipleChoiceFilter(choices=User.Role.choices)
    is_active = BooleanFilter()
    is_online = CharFilter(method='filter_online')
    # filter_online: scans Redis and filters queryset
    date_joined_after = DateFilter(field_name='date_joined', lookup_expr='gte')
    date_joined_before = DateFilter(field_name='date_joined', lookup_expr='lte')
    
    class Meta:
        model = User
        fields = ['role', 'is_active', 'is_online', 'date_joined_after', 'date_joined_before']
```

---

### 10. New URL Routes

**File: `apps/users/urls.py`** — add:

```python
urlpatterns = [
    # existing auth routes ...
    
    # Admin user management
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/stats/', UserStatsView.as_view(), name='user-stats'),
    path('users/online/', OnlineUsersView.as_view(), name='users-online'),
    path('users/bulk-action/', UserBulkActionView.as_view(), name='users-bulk-action'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/<int:pk>/password/', UserPasswordView.as_view(), name='user-password'),
    path('users/<int:pk>/toggle-active/', UserToggleActiveView.as_view(), name='user-toggle-active'),
    path('users/<int:pk>/audit-log/', UserAuditLogView.as_view(), name='user-audit-log'),
]
```

---

### 11. Email Templates

**File: `apps/users/tasks.py`** — add Celery tasks:

```python
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id: int, temporary_password: str):
    """
    Sent when admin creates a new user account.
    Contains: welcome message, email, temporary password, login URL.
    Subject: "Your JobTech Solutions account has been created"
    """

@shared_task(bind=True, max_retries=3, default_retry_delay=60)  
def send_password_changed_email(self, user_id: int):
    """
    Sent when admin resets a user's password.
    Does NOT include the new password in the email.
    Contains: notification + "contact your admin if this wasn't you"
    Subject: "Your JobTech Solutions password has been changed"
    """

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_account_deactivated_email(self, user_id: int):
    """
    Sent when admin deactivates an account.
    Contains: notice + contact info for admin.
    """
```

---

### 12. Security Rules (NON-NEGOTIABLE)

```
RULE 1 — Admin cannot modify another Admin's account
  → Service raises PermissionDenied with code: CANNOT_MODIFY_ADMIN
  → Frontend disables action buttons for admin-role rows

RULE 2 — Admin cannot deactivate or delete themselves
  → Service raises PermissionDenied with code: CANNOT_MODIFY_SELF
  → Frontend hides deactivate button on own row

RULE 3 — Password never appears in any API response
  → All serializers: password field write_only=True
  → Audit logs: strip 'password' key from old_values/new_values

RULE 4 — Force logout on password change or deactivation
  → Blacklist ALL OutstandingToken records for the target user
  → Use: OutstandingToken.objects.filter(user=target).delete()
  →      BlacklistedToken.objects.bulk_create([...])

RULE 5 — Audit every admin action
  → Every service function calls audit_service.log_action()
  → No exceptions — even failed attempts are logged

RULE 6 — Rate limit sensitive endpoints
  → /users/{id}/password/ → max 10 requests/hour per admin
  → /users/bulk-action/ → max 5 requests/minute per admin

RULE 7 — Input sanitization
  → Strip HTML from all CharField inputs (first_name, last_name, phone)
  → Use bleach or simple strip in serializer clean methods

RULE 8 — Presence data is approximated, not exact
  → Never claim a user is "online" with certainty
  → UI label: "Active recently" not "Online" if last_activity < 2min
  → UI label: "Online" only if last_activity < 60 seconds
```

---

### 13. New Packages to Add

**`requirements/base.txt`:**
```
bleach>=6.1          # HTML sanitization for user inputs
django-redis>=5.4    # Redis cache backend for presence
```

**`requirements/dev.txt`:**
```
freezegun>=1.4       # For testing time-based logic (online status)
```

---

## Frontend: What to Build

---

### Route + Navigation

**Add to `src/router/index.tsx`:**
```typescript
// Admin only — guarded by ProtectedRoute
/admin/users              → UserManagementPage
/admin/users/new          → CreateUserPage
/admin/users/:id          → UserDetailPage
/admin/users/:id/edit     → EditUserPage
```

**Add to `src/components/shared/Sidebar.tsx`** (admin nav section):
```typescript
// Show only if role === 'admin'
{ label: 'User Management', icon: UsersIcon, href: '/admin/users' }
```

---

### Feature Structure

```
src/features/users/
├── components/
│   ├── UserTable.tsx              # Main data table with all columns
│   ├── UserTableRow.tsx           # Single row with actions
│   ├── UserFilters.tsx            # Filter bar (role, status, online, date range)
│   ├── UserStatusBadge.tsx        # Active/Inactive pill
│   ├── OnlineBadge.tsx            # Online/Offline indicator with pulse animation
│   ├── RoleBadge.tsx              # Color-coded role pill
│   ├── UserStatsCards.tsx         # 4 stat cards at top of page
│   ├── CreateUserModal.tsx        # Slide-over modal for creating user
│   ├── EditUserModal.tsx          # Slide-over modal for editing user
│   ├── ChangePasswordModal.tsx    # Dedicated password change modal
│   ├── ConfirmDeactivateModal.tsx # Confirmation dialog for deactivation
│   ├── BulkActionBar.tsx          # Appears when rows are selected
│   └── AuditLogDrawer.tsx         # Side panel showing user's audit history
├── hooks/
│   ├── useUsers.ts                # React Query: paginated user list
│   ├── useUser.ts                 # React Query: single user
│   ├── useCreateUser.ts           # Mutation
│   ├── useUpdateUser.ts           # Mutation
│   ├── useChangePassword.ts       # Mutation
│   ├── useToggleActive.ts         # Mutation
│   ├── useBulkAction.ts           # Mutation
│   ├── useOnlineUsers.ts          # Query: polls every 30s
│   ├── useUserStats.ts            # Query: dashboard stats
│   └── useAuditLog.ts             # Query: user audit history
├── pages/
│   ├── UserManagementPage.tsx     # Main page
│   ├── CreateUserPage.tsx         # Create form page (or modal)
│   └── UserDetailPage.tsx         # Full detail + audit log
├── api.ts                         # All API calls
└── schemas.ts                     # Zod schemas for all forms
```

---

### UX Specifications

#### UserManagementPage Layout
```
┌─────────────────────────────────────────────────────┐
│  [Page title: User Management]    [+ Add User btn]  │
├─────────────────────────────────────────────────────┤
│  [Stat Card: Total] [Active] [Online Now] [New/Month]│
├─────────────────────────────────────────────────────┤
│  [Search...] [Role▼] [Status▼] [Online▼] [Date▼]   │
├─────────────────────────────────────────────────────┤
│  □  Name        Role       Status    Online   Actions│
│  □  John Doe    Recruiter  ● Active  ◉ Online  ⋯   │
│  □  Jane Smith  Candidate  ● Active  ○ Offline  ⋯  │
│  □  Bob Brown   HR Mgr     ○ Inactive ○ Offline ⋯  │
├─────────────────────────────────────────────────────┤
│  [Showing 1-20 of 47]        [< 1  2  3 >]         │
└─────────────────────────────────────────────────────┘

When rows selected:
├─────────────────────────────────────────────────────┤
│  3 users selected  [Activate] [Deactivate] [Clear]  │
└─────────────────────────────────────────────────────┘
```

#### OnlineBadge Component
```typescript
// Green pulsing dot = Online (last_activity < 60s)
// Yellow dot = Away (last_activity 1-5min)  
// Gray dot = Offline (last_activity > 5min or null)
// Label: "Online" | "Away" | "Offline"
// Tooltip: "Last seen: 2 minutes ago" (formatted with date-fns)

// CSS: pulsing animation for Online dot only
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}
```

#### CreateUserModal / EditUserModal (Slide-over)
```
Slides in from the right (not a centered modal — slide-over has more space)
Width: 480px on desktop, full width on mobile

Create form fields:
  [First Name*]  [Last Name*]
  [Email*]
  [Role*] — dropdown: Admin / HR Manager / Recruiter / Candidate
  [Phone] — optional
  [Password*]
  [Confirm Password*]
  
  Password strength meter:
  - Visual bar: red → orange → yellow → green
  - Requirements checklist: 8+ chars ✓, uppercase ✓, lowercase ✓, special char ✓
  - Real-time feedback as user types

Edit form fields:
  [First Name*]  [Last Name*]
  [Email*]
  [Role*]
  [Phone]
  Note: No password field here — separate "Change Password" button

Buttons:
  [Cancel]  [Create User / Save Changes]
  Loading state on submit button
```

#### ChangePasswordModal
```
Triggered by "Change Password" button in edit modal or user detail

Fields:
  [New Password*]        — with show/hide toggle
  [Confirm Password*]    — with show/hide toggle
  
  Password strength meter (same as create)
  Requirements checklist

Warning box (amber):
  "This will immediately log out the user from all devices."

Buttons:
  [Cancel]  [Change Password] — red/danger styling to signal impact

On success:
  Toast: "Password changed. User has been logged out of all devices."
```

#### ConfirmDeactivateModal
```
Triggered by "Deactivate Account" action

Content:
  Warning icon (amber)
  "Deactivate John Doe's account?"
  "This will immediately log them out of all active sessions.
   They will not be able to log in until reactivated."

Buttons:
  [Cancel]  [Deactivate Account] — red/danger

On success:
  Toast: "Account deactivated. User has been logged out."
```

#### AuditLogDrawer
```
Slides in from right (640px wide)
Shows timeline of all actions on this user's account

Timeline item format:
  ● [Icon] Action name
    By: Admin Name · IP: 192.168.1.1
    2 hours ago

Action icons:
  🔐 Password changed
  ✏️  Profile updated
  ✅  Account activated
  🚫 Account deactivated
  👤 Account created
  🔑 Role changed
  
Paginated (20 per page)
Filter by action type
```

#### UserStatsCards
```typescript
interface StatsCard {
  label: string
  value: number
  change?: string     // e.g. "+5 this week"
  icon: React.ReactNode
}

// 4 cards:
// 1. Total Users — icon: users group
// 2. Active Accounts — icon: check circle
// 3. Online Now — icon: green pulse dot — polls every 30s
// 4. New This Month — icon: trending up
```

---

### Polling for Online Status

```typescript
// src/features/users/hooks/useOnlineUsers.ts

export function useOnlineUsers() {
  return useQuery({
    queryKey: ['users', 'online'],
    queryFn: () => api.getOnlineUsers(),
    refetchInterval: 30_000,        // poll every 30 seconds
    refetchIntervalInBackground: true, // keep polling even if tab not focused
    staleTime: 25_000,
  })
}

// src/features/users/hooks/useUsers.ts
// Merge online status into user list:
export function useUsers(filters: UserFilters) {
  const usersQuery = useQuery({ ... })
  const onlineQuery = useOnlineUsers()
  
  const usersWithOnlineStatus = useMemo(() => {
    const onlineIds = new Set(onlineQuery.data?.map(u => u.id) ?? [])
    return usersQuery.data?.results.map(user => ({
      ...user,
      is_online: onlineIds.has(user.id)
    })) ?? []
  }, [usersQuery.data, onlineQuery.data])
  
  return { ...usersQuery, usersWithOnlineStatus }
}
```

---

### Zod Schemas

**`src/features/users/schemas.ts`:**

```typescript
const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[!@#$%^&*()_+\-=]/, 'Must contain at least one special character')
  .regex(/[0-9]/, 'Must contain at least one number')

export const createUserSchema = z.object({
  first_name: z.string().min(1).max(100).trim(),
  last_name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  role: z.enum(['admin', 'hr_manager', 'recruiter', 'candidate']),
  phone: z.string().max(20).optional().or(z.literal('')),
  password: passwordSchema,
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const editUserSchema = z.object({
  first_name: z.string().min(1).max(100).trim(),
  last_name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  role: z.enum(['admin', 'hr_manager', 'recruiter', 'candidate']),
  phone: z.string().max(20).optional().or(z.literal('')),
})

export const changePasswordSchema = z.object({
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const bulkActionSchema = z.object({
  user_ids: z.array(z.number()).min(1),
  action: z.enum(['activate', 'deactivate']),
})
```

---

### Password Strength Meter Component

**`src/components/ui/PasswordStrengthMeter.tsx`:**

```typescript
interface PasswordStrengthMeterProps {
  password: string
}

// Scoring logic:
// 0 points: empty
// +1: length >= 8
// +1: has uppercase
// +1: has lowercase  
// +1: has number
// +1: has special char
// +1: length >= 12 (bonus)
// 
// 0-1: Weak (red)
// 2-3: Fair (orange)
// 4-5: Good (yellow)
// 6:   Strong (green)
//
// Requirements checklist below the bar:
// ✓ At least 8 characters
// ✓ At least one uppercase letter
// ✓ At least one lowercase letter
// ✓ At least one number
// ✓ At least one special character
// Each requirement: green check when met, gray circle when not
```

---

### API Calls

**`src/features/users/api.ts`:**

```typescript
export const userApi = {
  getUsers: (params: UserFilters) =>
    client.get<PaginatedResponse<User>>(ENDPOINTS.USERS.LIST, { params }),

  getUserStats: () =>
    client.get<UserStats>(ENDPOINTS.USERS.STATS),

  getOnlineUsers: () =>
    client.get<OnlineUser[]>(ENDPOINTS.USERS.ONLINE),

  getUser: (id: number) =>
    client.get<User>(ENDPOINTS.USERS.DETAIL(id)),

  createUser: (data: CreateUserPayload) =>
    client.post<User>(ENDPOINTS.USERS.LIST, data),

  updateUser: (id: number, data: UpdateUserPayload) =>
    client.patch<User>(ENDPOINTS.USERS.DETAIL(id), data),

  changePassword: (id: number, data: ChangePasswordPayload) =>
    client.patch(ENDPOINTS.USERS.PASSWORD(id), data),

  toggleActive: (id: number) =>
    client.patch<User>(ENDPOINTS.USERS.TOGGLE_ACTIVE(id)),

  bulkAction: (data: BulkActionPayload) =>
    client.post<BulkActionResult>(ENDPOINTS.USERS.BULK_ACTION, data),

  getAuditLog: (userId: number, params: AuditLogFilters) =>
    client.get<PaginatedResponse<AuditLog>>(ENDPOINTS.USERS.AUDIT_LOG(userId), { params }),
}
```

---

### TypeScript Types

**`src/features/users/types.ts`:**

```typescript
export type Role = 'admin' | 'hr_manager' | 'recruiter' | 'candidate'
export type OnlineStatus = 'online' | 'away' | 'offline'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: Role
  phone: string | null
  avatar: string | null
  is_active: boolean
  is_online: boolean
  last_activity: string | null  // ISO datetime
  date_joined: string           // ISO datetime
}

export interface UserStats {
  total_users: number
  active_users: number
  online_now: number
  new_this_month: number
  new_this_week: number
  by_role: Record<Role, number>
}

export interface UserAuditLog {
  id: number
  actor_name: string
  target_name: string
  action: string
  ip_address: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  timestamp: string
}

export interface BulkActionResult {
  success_count: number
  failed_ids: number[]
  errors: Record<number, string>
}

export function getOnlineStatus(lastActivity: string | null): OnlineStatus {
  if (!lastActivity) return 'offline'
  const seconds = differenceInSeconds(new Date(), parseISO(lastActivity))
  if (seconds < 60) return 'online'
  if (seconds < 300) return 'away'
  return 'offline'
}
```

---

## Best Practices Checklist

### Backend
- [ ] `last_activity` field added to User model and migration applied before any view
- [ ] `OnlinePresenceMiddleware` placed AFTER `AuthenticationMiddleware` in MIDDLEWARE list
- [ ] Redis writes in middleware are non-blocking (fire-and-forget pattern)
- [ ] Celery flush task uses `bulk_update` — not one DB query per user
- [ ] `UserAuditLog.save()` raises error if `self.pk` exists (immutable)
- [ ] Password never appears in any serializer response (write_only=True everywhere)
- [ ] `change_password` blacklists ALL tokens, not just current one
- [ ] `toggle_active(deactivate)` blacklists ALL tokens immediately
- [ ] Admin cannot modify another Admin (validated in service, not view)
- [ ] Admin cannot modify self via user management endpoints (use /me for self)
- [ ] All service functions call `audit_service.log_action()` before returning
- [ ] `UserFilter.filter_online` reads from Redis, not DB field
- [ ] HTML stripped from all text inputs in serializers (bleach)
- [ ] Rate limit on `/password/` and `/bulk-action/` endpoints
- [ ] `select_related('actor', 'target')` on AuditLog queryset

### Frontend
- [ ] Online status polling: `refetchInterval: 30_000` in `useOnlineUsers`
- [ ] User list and online status merged in `useMemo` — not separate renders
- [ ] Slide-over modals trap focus (accessibility: `aria-modal`, `role="dialog"`)
- [ ] Confirm modal for all destructive actions (deactivate, bulk deactivate)
- [ ] Password strength meter updates on every keystroke (controlled input)
- [ ] Password fields have show/hide toggle (eye icon)
- [ ] Admin rows: action buttons for "Change Role" and "Deactivate" are hidden/disabled for other Admin rows
- [ ] Admin row (self): "Deactivate" button hidden
- [ ] Bulk action bar appears/disappears based on `selectedIds.length > 0`
- [ ] All mutations invalidate `['users']` query key on success
- [ ] Toast messages on every mutation success and error
- [ ] `useAuditLog` pagination: infinite scroll or page-based in AuditLogDrawer
- [ ] All date/time displayed in user's local timezone (date-fns `formatDistanceToNow`)

---

## Verification Plan

### Backend
```bash
# Run migrations
python manage.py makemigrations users --name add_last_activity_and_audit_log
python manage.py migrate

# Start Celery with beat
celery -A config worker --loglevel=info &
celery -A config beat --loglevel=info &

# Run tests
pytest apps/users/tests/test_user_management.py -v --tb=short

# Manual: Create user as admin
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","first_name":"New","last_name":"User","role":"recruiter","password":"Test1234!","confirm_password":"Test1234!"}'

# Manual: Change password
curl -X PATCH http://localhost:8000/api/v1/users/2/password/ \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"new_password":"NewPass1!","confirm_password":"NewPass1!"}'

# Manual: Check online users (login as another user first to trigger presence)
curl http://localhost:8000/api/v1/users/online/ \
  -H "Authorization: Bearer <admin_token>"

# Security: Verify Admin cannot modify another Admin
# Should return 403 with code CANNOT_MODIFY_ADMIN
curl -X PATCH http://localhost:8000/api/v1/users/<other_admin_id>/ \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"first_name":"Hacked"}'

# Security: Verify token blacklisted after password change
# Old token should return 401 after password change
curl http://localhost:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer <old_token_of_user_whose_password_was_changed>"
```

### Frontend
```bash
npm run dev

# Test checklist:
# 1. Admin sidebar shows "User Management" link — other roles don't see it
# 2. User table loads with correct columns + pagination
# 3. Online badge pulses green for online users
# 4. Stats cards show correct counts
# 5. Search filters users in real-time (300ms debounce)
# 6. Create user modal: password strength meter updates as you type
# 7. Create user: duplicate email shows friendly error
# 8. Change password: warning box visible, success logs user out
# 9. Deactivate: confirmation modal appears, success toasts
# 10. Bulk select: bulk action bar appears with correct count
# 11. Admin rows: no deactivate/change-role action available
# 12. Audit log drawer: shows timeline of actions with correct timestamps
# 13. Online poll: open 2 browser tabs — one as recruiter, one as admin
#     → recruiter appears online in admin's user list within 30s
```

---

## Files to Create/Modify (In Order)

### Backend
1. `apps/users/validators.py` — new file
2. `apps/users/models.py` — add `last_activity` field + `UserAuditLog` model
3. `python manage.py makemigrations users --name add_last_activity_and_audit_log`
4. `core/middleware.py` — `OnlinePresenceMiddleware`
5. `config/settings/base.py` — add middleware + bleach + django-redis
6. `apps/users/services/audit_service.py` — new file
7. `apps/users/services/user_management_service.py` — new file
8. `apps/users/tasks.py` — add new Celery tasks + flush_presence
9. `config/celery.py` — add beat schedule
10. `apps/users/serializers.py` — add new serializers
11. `apps/users/filters.py` — new file
12. `apps/users/views.py` — add new views
13. `apps/users/urls.py` — add new routes
14. `apps/users/tests/test_user_management.py` — new file

### Frontend
1. `src/api/endpoints.ts` — add USERS endpoints
2. `src/features/users/types.ts` — new file
3. `src/features/users/schemas.ts` — new file
4. `src/features/users/api.ts` — new file
5. `src/components/ui/PasswordStrengthMeter.tsx` — new file
6. `src/features/users/hooks/` — all hooks
7. `src/features/users/components/OnlineBadge.tsx`
8. `src/features/users/components/RoleBadge.tsx`
9. `src/features/users/components/UserStatusBadge.tsx`
10. `src/features/users/components/UserStatsCards.tsx`
11. `src/features/users/components/UserFilters.tsx`
12. `src/features/users/components/UserTableRow.tsx`
13. `src/features/users/components/UserTable.tsx`
14. `src/features/users/components/BulkActionBar.tsx`
15. `src/features/users/components/CreateUserModal.tsx`
16. `src/features/users/components/EditUserModal.tsx`
17. `src/features/users/components/ChangePasswordModal.tsx`
18. `src/features/users/components/ConfirmDeactivateModal.tsx`
19. `src/features/users/components/AuditLogDrawer.tsx`
20. `src/features/users/pages/UserManagementPage.tsx`
21. `src/features/users/pages/UserDetailPage.tsx`
22. `src/components/shared/Sidebar.tsx` — add admin user management nav item
23. `src/router/index.tsx` — add new routes

# JobTech Solutions — User Management Phase
# Complete Implementation Documentation
# Status: ✅ COMPLETE

---

## What Was Built

Full admin user management system with real-time online presence, audit logging, bulk actions, password management, and a professional SaaS-grade UI.

---

## Backend

### 1. Model Changes (`apps/users/models.py`)

#### Field added to `User` model
```python
last_activity = models.DateTimeField(null=True, blank=True)
# Updated by OnlinePresenceMiddleware on every authenticated request
# Used to compute online status: online if last_activity > now - 5min
```

#### Computed property on `User`
```python
@property
def is_online(self) -> bool:
    if not self.last_activity:
        return False
    return (timezone.now() - self.last_activity).total_seconds() < 300

@property
def online_status(self) -> str:  # 'online' | 'away' | 'offline'
    if not self.last_activity:
        return 'offline'
    seconds = (timezone.now() - self.last_activity).total_seconds()
    if seconds < 60:
        return 'online'
    if seconds < 300:
        return 'away'
    return 'offline'
```

#### New model: `UserAuditLog`
```python
class UserAuditLog(models.Model):
    ACTION_CHOICES = [
        ('created', 'User Created'),
        ('updated', 'Profile Updated'),
        ('password_changed', 'Password Changed'),
        ('activated', 'Account Activated'),
        ('deactivated', 'Account Deactivated'),
        ('role_changed', 'Role Changed'),
    ]
    actor         = FK(User, null=True, on_delete=SET_NULL, related_name='actions_performed')
    target        = FK(User, null=True, on_delete=SET_NULL, related_name='audit_logs')
    action        = CharField(choices=ACTION_CHOICES)
    ip_address    = GenericIPAddressField(null=True)
    user_agent    = TextField(blank=True)
    old_values    = JSONField(null=True)   # never contains password
    new_values    = JSONField(null=True)   # never contains password
    timestamp     = DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [Index(fields=['actor', 'timestamp']),
                   Index(fields=['target', 'timestamp']),
                   Index(fields=['action', 'timestamp'])]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("Audit logs are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Audit logs cannot be deleted.")
```

#### Migration
```
users: 0002_user_last_activity_userauditlog
```

---

### 2. Online Presence System

#### Middleware (`core/middleware.py`)
```python
class OnlinePresenceMiddleware:
    """
    Updates Redis presence key on every authenticated API request.
    Key: "jobtech:presence:{user_id}"
    TTL: 300 seconds (5 minutes) — auto-expires = user goes offline
    No DB write on every request — Celery batch flushes every 60s.
    """
    def __call__(self, request):
        response = self.get_response(request)
        if hasattr(request, 'user') and request.user.is_authenticated:
            redis_client.setex(
                f"jobtech:presence:{request.user.id}",
                300,
                timezone.now().isoformat()
            )
        return response
```

Registered in `base.py` **after** `AuthenticationMiddleware`.

#### Celery Tasks (`apps/users/tasks.py`)
```python
@shared_task
def flush_presence_to_db():
    """Every 60s: scan Redis presence keys → bulk_update User.last_activity"""
    keys = redis_client.scan_iter("jobtech:presence:*")
    updates = []
    for key in keys:
        user_id = int(key.decode().split(":")[-1])
        timestamp_str = redis_client.get(key)
        if timestamp_str:
            updates.append(User(
                id=user_id,
                last_activity=datetime.fromisoformat(timestamp_str.decode())
            ))
    if updates:
        User.objects.bulk_update(updates, ['last_activity'])

@shared_task
def cleanup_stale_presence():
    """Every 10min: null out last_activity for users whose Redis key expired"""
    cutoff = timezone.now() - timedelta(minutes=6)
    User.objects.filter(last_activity__lt=cutoff).update(last_activity=None)
```

Beat schedule in `config/celery.py`:
```python
beat_schedule = {
    'flush-presence': {'task': '...flush_presence_to_db', 'schedule': 60.0},
    'cleanup-presence': {'task': '...cleanup_stale_presence', 'schedule': 600.0},
    # + existing tasks from Phase 2
}
```

---

### 3. Password Validators (`apps/users/validators.py`)

```python
class UppercaseValidator:      # must contain A-Z
class LowercaseValidator:      # must contain a-z
class SpecialCharacterValidator:  # must contain !@#$%^&*()_+-=
class NoEmailInPasswordValidator: # password must not contain user's email
```

Added to `AUTH_PASSWORD_VALIDATORS` in `base.py`:
```python
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {'NAME': 'apps.users.validators.UppercaseValidator'},
    {'NAME': 'apps.users.validators.LowercaseValidator'},
    {'NAME': 'apps.users.validators.SpecialCharacterValidator'},
]
```

---

### 4. Audit Service (`apps/users/services/audit_service.py`)

```python
def log_action(
    actor: User | None,
    target: User | None,
    action: str,
    request=None,
    old_values: dict = None,
    new_values: dict = None
) -> UserAuditLog:
    """
    Creates immutable audit log entry.
    Extracts IP from X-Forwarded-For or REMOTE_ADDR.
    Strips 'password', 'token' keys from values automatically.
    Called from service layer on every admin action.
    """
```

---

### 5. User Management Service (`apps/users/services/user_management_service.py`)

```python
def list_users(requesting_admin, filters, ordering, page) -> QuerySet
    # Annotates queryset with is_online from Redis
    # Applies filters: role, is_active, date range, search
    # Never returns the requesting admin in the list

def get_user_detail(user_id, requesting_admin) -> User

def create_user(data, requesting_admin) -> User
    # Validates: email uniqueness, password strength
    # Queues: send_welcome_email Celery task
    # Logs: audit action 'created'

def update_user(user_id, data, requesting_admin) -> User
    # Validates: cannot modify another Admin
    # Validates: email uniqueness if email changed
    # Logs: audit action 'updated' or 'role_changed'

def change_password(user_id, new_password, requesting_admin) -> None
    # Validates password strength
    # Blacklists ALL OutstandingTokens for target user (forced logout)
    # Queues: send_password_changed_email Celery task
    # Logs: audit action 'password_changed'

def toggle_active(user_id, requesting_admin) -> User
    # Cannot deactivate self
    # Cannot deactivate another Admin
    # On deactivate: blacklists ALL tokens (forced logout)
    # Logs: audit action 'activated' or 'deactivated'

def get_online_users(requesting_admin) -> list[dict]
    # Scans Redis jobtech:presence:* keys
    # Returns list of {user_id, last_activity}

def get_user_stats(requesting_admin) -> dict
    # total_users, active_users, online_now (Redis), new_this_month, by_role

def bulk_action(user_ids, action, requesting_admin) -> dict
    # action: 'activate' | 'deactivate'
    # Skips Admins, skips self
    # Returns { success_count, failed_ids, errors }
```

#### Security Rules Enforced in Service Layer
```
RULE 1 — Admin cannot modify another Admin → CANNOT_MODIFY_ADMIN (403)
RULE 2 — Admin cannot deactivate/delete self → CANNOT_MODIFY_SELF (403)
RULE 3 — Password change blacklists ALL tokens → forced logout all devices
RULE 4 — Deactivation blacklists ALL tokens → forced logout all devices
RULE 5 — Every action logged to UserAuditLog (immutable)
RULE 6 — Password never in any API response (write_only=True)
RULE 7 — HTML stripped from text inputs (bleach)
RULE 8 — Rate limiting: /password/ → 10/hour, /bulk-action/ → 5/min
```

---

### 6. Serializers (`apps/users/serializers.py`)

```python
class UserListSerializer(ModelSerializer):
    # Fields: id, email, full_name, first_name, last_name,
    #         role, is_active, is_online, online_status, last_activity, date_joined
    # is_online: SerializerMethodField → checks Redis
    # NEVER: password, is_staff, is_superuser

class UserDetailSerializer(ModelSerializer):
    # All UserListSerializer fields + phone, avatar
    # read_only: id, date_joined, last_activity, is_online

class UserCreateSerializer(ModelSerializer):
    # Fields: email, first_name, last_name, role, phone, password, confirm_password
    # password/confirm_password: write_only=True
    # Validates: password match, password strength, email uniqueness

class PasswordChangeSerializer(Serializer):
    # Fields: new_password, confirm_password (both write_only)
    # Validates: match + full AUTH_PASSWORD_VALIDATORS

class BulkActionSerializer(Serializer):
    # Fields: user_ids (list), action (enum)

class UserAuditLogSerializer(ModelSerializer):
    # Fields: id, actor_name, target_name, action, ip_address, old_values, new_values, timestamp
```

---

### 7. Filters (`apps/users/filters.py`)

```python
class UserFilter(FilterSet):
    role = MultipleChoiceFilter(choices=User.Role.choices)
    is_active = BooleanFilter()
    is_online = CharFilter(method='filter_online')
    # filter_online: scans Redis, returns matching user IDs
    date_joined_after = DateFilter(field_name='date_joined', lookup_expr='gte')
    date_joined_before = DateFilter(field_name='date_joined', lookup_expr='lte')
    search = CharFilter(method='filter_search')
    # filter_search: icontains on email, first_name, last_name
```

---

### 8. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/users/` | Admin | List all users (filtered, paginated) |
| POST | `/api/v1/users/` | Admin | Create new user |
| GET | `/api/v1/users/stats/` | Admin | Stats cards data |
| GET | `/api/v1/users/online/` | Admin | Currently online users |
| POST | `/api/v1/users/bulk-action/` | Admin | Bulk activate/deactivate |
| GET | `/api/v1/users/{id}/` | Admin | User detail |
| PATCH | `/api/v1/users/{id}/` | Admin | Update user profile |
| PATCH | `/api/v1/users/{id}/password/` | Admin | Force password change |
| PATCH | `/api/v1/users/{id}/toggle-active/` | Admin | Activate / deactivate |
| GET | `/api/v1/users/{id}/audit-log/` | Admin | User's audit history |

#### Response Format
All success:
```json
{ "success": true, "data": { ... } }
```
All errors:
```json
{ "success": false, "error": { "code": "CANNOT_MODIFY_ADMIN", "message": "...", "details": {} } }
```

---

### 9. Email Tasks (`apps/users/tasks.py`)

```python
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email(self, user_id, temporary_password):
    # Subject: "Your JobTech Solutions account has been created"
    # Contains: email, temp password, login URL

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_changed_email(self, user_id):
    # Subject: "Your password has been changed"
    # Does NOT include the new password
    # Contains: notice + "contact admin if this wasn't you"

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_account_deactivated_email(self, user_id):
    # Subject: "Your account has been deactivated"
```

---

### 10. New Packages Added

```
# requirements/base.txt
bleach>=6.1          # HTML sanitization
django-redis>=5.4    # Redis cache backend for presence

# requirements/dev.txt
freezegun>=1.4       # Time mocking in tests
```

---

## Frontend

### Feature Structure

```
src/features/users/
├── types.ts
├── schemas.ts
├── api.ts
├── hooks/
│   ├── useUsers.ts
│   ├── useUser.ts
│   ├── useCreateUser.ts
│   ├── useUpdateUser.ts
│   ├── useChangePassword.ts
│   ├── useToggleActive.ts
│   ├── useBulkAction.ts
│   ├── useOnlineUsers.ts
│   ├── useUserStats.ts
│   └── useAuditLog.ts
├── components/
│   ├── UsersTable.tsx           ← Step 6.1 ✅
│   ├── RoleBadge.tsx            ← Step 6.2 ✅
│   ├── OnlineStatusBadge.tsx    ← Step 6.2 ✅
│   ├── UserStatusBadge.tsx      ← Step 6.2 ✅
│   ├── UserFormModal.tsx        ← Step 6.3 ✅
│   ├── ChangePasswordModal.tsx  ← Step 6.3 ✅
│   ├── ConfirmActionModal.tsx   ← Step 6.3 ✅
│   ├── UserDetailCard.tsx       ← Step 6.4 ✅
│   ├── AuditLogDrawer.tsx       ← Step 6.4 ✅
│   ├── UserStatsCards.tsx
│   ├── UserFilters.tsx
│   └── BulkActionBar.tsx
└── pages/
    ├── UserManagementPage.tsx
    └── UserDetailPage.tsx
```

---

### Step 6.1 — UsersTable ✅

**File: `src/features/users/components/UsersTable.tsx`**

```typescript
interface UsersTableProps {
  users: User[]
  isLoading: boolean
  totalCount: number
  currentPage: number
  onPageChange: (page: number) => void
  onEdit: (user: User) => void
  onToggleActive: (user: User) => void
  onChangePassword: (user: User) => void
  onViewDetail: (user: User) => void
  selectedIds: number[]
  onSelectId: (id: number) => void
  onSelectAll: () => void
}
```

**Columns:**
| Column | Content |
|--------|---------|
| Checkbox | Bulk select |
| Name | Avatar initials + full_name + email |
| Role | `<RoleBadge>` |
| Status | `<UserStatusBadge>` (Active/Inactive) + `<OnlineStatusBadge>` |
| Last activity | `formatDistanceToNow(last_activity)` or "Never" |
| Actions | Edit · Password · Activate/Deactivate · View |

**States:**
- Loading: 5 skeleton rows with animated pulse
- Empty: centered icon + "No users found" message + clear filters hint
- Hover: subtle `bg-gray-50` row highlight

**Implementation notes:**
- No API calls inside — pure display component
- Action buttons: Edit + Password always visible
- Deactivate button hidden if `user.role === 'admin'` (enforced UI-side)
- Pagination: shows "Showing X–Y of Z users" + prev/next + page numbers
- All dates formatted with `date-fns` in local timezone

---

### Step 6.2 — Badge Components ✅

#### `RoleBadge.tsx`
```typescript
const ROLE_CONFIG = {
  admin:       { label: 'Admin',      bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  hr_manager:  { label: 'HR Manager', bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'   },
  recruiter:   { label: 'Recruiter',  bg: 'bg-teal-100',   text: 'text-teal-800',   border: 'border-teal-200'   },
  candidate:   { label: 'Candidate',  bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200'   },
}
// Renders: pill with role-specific color + optional icon
// Sizes: sm | md | lg
```

#### `OnlineStatusBadge.tsx`
```typescript
// Online  → pulsing green dot  + "Online"   (last_activity < 60s)
// Away    → static yellow dot  + "Away"     (60s < last_activity < 5min)
// Offline → static gray dot    + "Offline"  (last_activity > 5min or null)
//
// Tooltip on hover: "Last seen: X minutes ago"
// Pulse CSS: @keyframes pulse on Online dot only
```

#### `UserStatusBadge.tsx`
```typescript
// Active   → green bg  + "Active"
// Inactive → red bg    + "Inactive"
// Props: is_active: boolean, size?: 'sm'|'md'
```

---

### Step 6.3 — Modal Components ✅

#### `UserFormModal.tsx`
```typescript
interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  user?: User  // provided in edit mode
}
```

**Slide-over from right (480px wide on desktop, full width mobile)**

**Create mode fields:**
```
[First Name*]      [Last Name*]
[Email*]
[Role*] ──── Admin / HR Manager / Recruiter / Candidate
[Phone] (optional)
[Password*]        ← with show/hide toggle
[Confirm Password*]
PasswordStrengthMeter ← live update as user types
```

**Edit mode fields:**
```
[First Name*]      [Last Name*]
[Email*]
[Role*]
[Phone]
← NO password field (separate modal)
```

**Behavior:**
- react-hook-form + Zod resolver
- Field-level errors on blur
- Submit button: loading spinner during request
- On success: close modal + toast + invalidate `['users']` query
- On error: show error message in form (not toast — field-level)

#### `ChangePasswordModal.tsx`
```typescript
interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
}
```

**Content:**
```
[New Password*]         ← show/hide toggle
[Confirm Password*]     ← show/hide toggle

PasswordStrengthMeter

⚠️ Warning (amber box):
"This will immediately log out John Doe from all devices."

[Cancel]  [Change Password] ← danger/red button
```

**On success:**
- Close modal
- Toast: "Password changed. User has been logged out of all devices."
- Invalidate `['users']` query

#### `ConfirmActionModal.tsx`
```typescript
// Generic reusable confirmation dialog
interface ConfirmActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel: string
  variant: 'danger' | 'warning'
  isLoading: boolean
}

// Used for:
// - Deactivate account: "This will log them out of all active sessions."
// - Bulk deactivate: "X users will be deactivated."
// - Activate account: green/info variant
```

---

### Step 6.4 — Detail Components ✅

#### `UserDetailCard.tsx`
```typescript
// Full user profile card shown in UserDetailPage
// Sections:
//   1. Header: avatar (initials) + name + role badge + online badge
//   2. Contact: email, phone
//   3. Account info: status, date joined, last activity
//   4. Stats: applications count (for candidates)
//   5. Action buttons: Edit Profile | Change Password | Deactivate/Activate
//
// Admin-row guard: action buttons disabled if user.role === 'admin'
// Self-guard: Deactivate hidden if user.id === currentAdmin.id
```

#### `AuditLogDrawer.tsx`
```typescript
interface AuditLogDrawerProps {
  isOpen: boolean
  onClose: () => void
  userId: number
  userName: string
}
// Slides in from right (640px)
// Shows timeline of all UserAuditLog entries for this user
// 
// Timeline item:
//   Icon (per action type) + Action label
//   By: Actor name · IP: x.x.x.x
//   "2 hours ago" (date-fns formatDistanceToNow)
//
// Action icons:
//   created       → UserPlusIcon
//   updated       → PencilIcon
//   password_changed → KeyIcon
//   activated     → CheckCircleIcon
//   deactivated   → XCircleIcon
//   role_changed  → ShieldIcon
//
// Paginated: 20 per page
// Filter by action type (dropdown)
// Infinite scroll optional (page-based is fine)
```

---

### PasswordStrengthMeter Component

**`src/components/ui/PasswordStrengthMeter.tsx`**

```typescript
// Scoring (0–6 points):
// +1 length >= 8      → min requirement
// +1 has uppercase    → A-Z
// +1 has lowercase    → a-z
// +1 has number       → 0-9
// +1 has special char → !@#$%^&*()_+-=
// +1 length >= 12     → bonus
//
// 0–1: Weak   → red bar (20%)
// 2–3: Fair   → orange bar (50%)
// 4–5: Good   → yellow bar (80%)
// 6:   Strong → green bar (100%)
//
// Requirements checklist below bar:
// ✅ At least 8 characters
// ✅ One uppercase letter
// ✅ One lowercase letter
// ✅ One number
// ✅ One special character
// Green check when met, gray circle when not
```

---

### Pages

#### `UserManagementPage.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  User Management                      [+ Add User]       │
├─────────────────────────────────────────────────────────┤
│  [Total: 47] [Active: 43] [Online: 3] [New/Month: 8]    │
├─────────────────────────────────────────────────────────┤
│  [Search...]  [Role▼]  [Status▼]  [Online▼]  [Date▼]   │
├─────────────────────────────────────────────────────────┤
│  UsersTable (with pagination)                           │
├─────────────────────────────────────────────────────────┤
│  BulkActionBar (appears when rows selected)             │
└─────────────────────────────────────────────────────────┘
```

**State management:**
```typescript
const [createModalOpen, setCreateModalOpen] = useState(false)
const [editingUser, setEditingUser] = useState<User | null>(null)
const [passwordUser, setPasswordUser] = useState<User | null>(null)
const [confirmUser, setConfirmUser] = useState<User | null>(null)
const [selectedIds, setSelectedIds] = useState<number[]>([])
const [filters, setFilters] = useUserFilters()  // URL-synced
const [page, setPage] = useState(1)

// Online status polling merged into user list
const { usersWithOnlineStatus, isLoading, totalCount } = useUsers(filters)
const { data: stats } = useUserStats()
```

**URL filter sync:**
- All filters persisted to URL (`useSearchParams`)
- Page reloads preserve filter state
- Shareable filtered URLs

#### `UserDetailPage.tsx`

```
/admin/users/:id

Layout:
  Left col (1/3):    UserDetailCard
  Right col (2/3):   AuditLogDrawer (inline on detail page, not slide-over)

Breadcrumb: Dashboard > User Management > John Doe
```

---

### Hooks

#### `useUsers.ts`
```typescript
export function useUsers(filters: UserFilters) {
  const usersQuery = useQuery({
    queryKey: ['users', filters],
    queryFn: () => userApi.getUsers(filters),
  })
  const onlineQuery = useOnlineUsers()

  const usersWithOnlineStatus = useMemo(() => {
    const onlineIds = new Set(onlineQuery.data?.map(u => u.id) ?? [])
    return usersQuery.data?.results.map(user => ({
      ...user,
      is_online: onlineIds.has(user.id),
      online_status: getOnlineStatus(
        onlineIds.has(user.id) ? user.last_activity : null
      ),
    })) ?? []
  }, [usersQuery.data, onlineQuery.data])

  return { ...usersQuery, usersWithOnlineStatus }
}
```

#### `useOnlineUsers.ts`
```typescript
export function useOnlineUsers() {
  return useQuery({
    queryKey: ['users', 'online'],
    queryFn: () => userApi.getOnlineUsers(),
    refetchInterval: 30_000,              // poll every 30s
    refetchIntervalInBackground: true,    // keep polling when tab not focused
    staleTime: 25_000,
  })
}
```

#### `useCreateUser.ts`
```typescript
export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserPayload) => userApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'stats'] })
      toast.success('User created successfully.')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.error?.message ?? 'Failed to create user.')
    },
  })
}
```

#### `useChangePassword.ts`
```typescript
// On success: invalidate ['users'], toast with forced-logout message
// On error: surface API error (e.g. password too weak)
```

#### `useToggleActive.ts`
```typescript
// On deactivate success: "Account deactivated. User logged out."
// On activate success:   "Account activated."
// On error: surface CANNOT_MODIFY_ADMIN, CANNOT_MODIFY_SELF messages
```

---

### Zod Schemas (`src/features/users/schemas.ts`)

```typescript
const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=]/, 'Must contain at least one special character')

export const createUserSchema = z.object({
  first_name:       z.string().min(1).max(100).trim(),
  last_name:        z.string().min(1).max(100).trim(),
  email:            z.string().email().toLowerCase(),
  role:             z.enum(['admin', 'hr_manager', 'recruiter', 'candidate']),
  phone:            z.string().max(20).optional().or(z.literal('')),
  password:         passwordSchema,
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const editUserSchema = z.object({
  first_name: z.string().min(1).max(100).trim(),
  last_name:  z.string().min(1).max(100).trim(),
  email:      z.string().email().toLowerCase(),
  role:       z.enum(['admin', 'hr_manager', 'recruiter', 'candidate']),
  phone:      z.string().max(20).optional().or(z.literal('')),
})

export const changePasswordSchema = z.object({
  new_password:     passwordSchema,
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export const bulkActionSchema = z.object({
  user_ids: z.array(z.number()).min(1, 'Select at least one user'),
  action:   z.enum(['activate', 'deactivate']),
})
```

---

### TypeScript Types (`src/features/users/types.ts`)

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
  online_status: OnlineStatus
  last_activity: string | null   // ISO datetime
  date_joined: string            // ISO datetime
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
  ip_address: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  timestamp: string
}

export interface BulkActionResult {
  success_count: number
  failed_ids: number[]
  errors: Record<number, string>
}

export interface OnlineUser {
  id: number
  last_activity: string
}

// Utility: compute online status from last_activity timestamp
export function getOnlineStatus(lastActivity: string | null): OnlineStatus {
  if (!lastActivity) return 'offline'
  const seconds = differenceInSeconds(new Date(), parseISO(lastActivity))
  if (seconds < 60) return 'online'
  if (seconds < 300) return 'away'
  return 'offline'
}
```

---

### API Calls (`src/features/users/api.ts`)

```typescript
export const userApi = {
  getUsers:       (params) => client.get(ENDPOINTS.USERS.LIST, { params }),
  getUserStats:   ()       => client.get(ENDPOINTS.USERS.STATS),
  getOnlineUsers: ()       => client.get(ENDPOINTS.USERS.ONLINE),
  getUser:        (id)     => client.get(ENDPOINTS.USERS.DETAIL(id)),
  createUser:     (data)   => client.post(ENDPOINTS.USERS.LIST, data),
  updateUser:     (id, d)  => client.patch(ENDPOINTS.USERS.DETAIL(id), d),
  changePassword: (id, d)  => client.patch(ENDPOINTS.USERS.PASSWORD(id), d),
  toggleActive:   (id)     => client.patch(ENDPOINTS.USERS.TOGGLE_ACTIVE(id)),
  bulkAction:     (data)   => client.post(ENDPOINTS.USERS.BULK_ACTION, data),
  getAuditLog:    (id, p)  => client.get(ENDPOINTS.USERS.AUDIT_LOG(id), { params: p }),
}
```

**Endpoints added to `src/api/endpoints.ts`:**
```typescript
USERS: {
  LIST:          '/users/',
  STATS:         '/users/stats/',
  ONLINE:        '/users/online/',
  BULK_ACTION:   '/users/bulk-action/',
  DETAIL:        (id: number) => `/users/${id}/`,
  PASSWORD:      (id: number) => `/users/${id}/password/`,
  TOGGLE_ACTIVE: (id: number) => `/users/${id}/toggle-active/`,
  AUDIT_LOG:     (id: number) => `/users/${id}/audit-log/`,
}
```

---

### Router Changes (`src/router/index.tsx`)

```typescript
// Added under Admin guard (ProtectedRoute allowedRoles=['admin'])
{ path: '/admin/users',      element: <UserManagementPage /> }
{ path: '/admin/users/:id',  element: <UserDetailPage /> }
```

### Sidebar Changes (`src/components/shared/Sidebar.tsx`)

```typescript
// Admin-only nav section:
{ label: 'User Management', icon: UsersIcon, href: '/admin/users' }
```

---

## Database State After This Phase

### Applied Migrations
```
users: 0002_user_last_activity_userauditlog
```

### Tables Added
| Table | Description |
|-------|-------------|
| `users_userauditlog` | Immutable admin action log |

### Fields Added to `users_user`
| Field | Type | Default |
|-------|------|---------|
| `last_activity` | DateTimeField | NULL |

### Redis Keys (runtime, not persisted)
```
jobtech:presence:{user_id}  →  ISO timestamp  (TTL: 300s)
```

---

## UX Design Decisions

| Decision | Rationale |
|----------|-----------|
| Slide-over modals (not centered) | More screen space for forms, less disorienting |
| Online badge has 3 states (not 2) | "Away" prevents false "offline" during brief inactivity |
| Poll every 30s (not WebSocket) | Simpler, sufficient for admin use case. WS upgrade path ready. |
| Audit log in drawer (not page) | Keeps context — admin stays on user list |
| Confirm modal for deactivation | Destructive action — user must consciously confirm |
| Admin rows: actions disabled | UI enforces what backend enforces — double protection |
| Password change = danger button | Signals impact — forces admin to pause and think |
| Bulk action bar (not dropdown) | More visible, encourages intentional use |
| Filter state in URL | Bookmarkable, shareable, survives page refresh |

---

## Security Summary

| Threat | Mitigation |
|--------|------------|
| Admin modifying another admin | Service raises 403 `CANNOT_MODIFY_ADMIN` + UI hides buttons |
| Admin deactivating self | Service raises 403 `CANNOT_MODIFY_SELF` + UI hides button |
| Token persistence after deactivation | `toggle_active(deactivate)` blacklists ALL tokens immediately |
| Token persistence after password change | `change_password` blacklists ALL tokens immediately |
| User enumeration via create | Generic error: "An account with this email already exists" |
| Weak passwords | 6-rule validator + strength meter + checklist |
| HTML injection in names | `bleach.clean()` on all CharField inputs in serializer |
| Audit log tampering | `UserAuditLog.save()` raises if pk exists. Delete raises always. |
| Brute force on password endpoint | DRF throttle: 10/hour per admin |
| Presence data leakage | Online endpoint is Admin-only (`IsAdmin` permission class) |

---

## Running This Phase

```bash
# Apply migrations
python manage.py migrate

# Start services (3 terminals)
python manage.py runserver              # Terminal 1
celery -A config worker --loglevel=info # Terminal 2
celery -A config beat --loglevel=info   # Terminal 3  (presence flush)

# Frontend
npm run dev
```

---

## What Comes Next (Phase: Interviews)

- `apps/interviews/` — Interview model with scheduling + status lifecycle
- `apps/interviews/` — Evaluation model with structured scoring form
- Celery beat: `send_reminder_email` 24h before scheduled interview
- Frontend: Interview calendar view, real-time notes (auto-saved), evaluation form
- WebSocket upgrade for live notifications (Django Channels already configured)

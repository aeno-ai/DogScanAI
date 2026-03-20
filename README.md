# DogScanAI

DogScanAI is a full-stack dog scanning platform with:
- React frontend (`frontend/`)
- Express API backend (`backend/`)
- Flask ML inference service (`app.py`)
- PostgreSQL database (`backend/migrations`)

This README documents the major implementation changes and end-to-end flows added during this build cycle (admin module, moderation, contribution review pipeline, profile system, and UI behavior updates).

## 1) What Was Added / Changed

### A. Database and schema updates
Primary schema files:
- `backend/migrations/database.sql` (fresh setup, includes all latest tables/columns)
- `backend/migrations/20260301_admin_module.sql` (admin + moderation + contribution pipeline patch)
- `backend/migrations/20260302_profile_settings.sql` (profile cooldown timestamps)

Key schema additions:
- `users` moderation and role fields:
  - `is_admin`, `is_superadmin`
  - `session_version`
  - `is_banned`, `banned_until`, `ban_reason`, `banned_at`, `banned_by`
  - `username_changed_at`, `email_changed_at`, `password_changed_at`
- `scan_history.scan_type` with check constraint (`breed` or `disease`)
- `scan_predictions` index for `breed_id`
- New tables:
  - `public_scan_usage` (monthly public demo usage tracking)
  - `admin_user_actions` (audit logs)
  - `scan_contributions` (consent review queue)
  - `approved_samples` (approved immutable training samples)

### B. Auth, roles, and session hardening
Updated files:
- `backend/routes/auth.js`
- `backend/middleware/auth.js`
- `backend/middleware/admin.js`

Key behavior:
- JWT now carries session version (`sv`).
- Every protected request validates:
  - user exists
  - user ban state
  - token session version matches `users.session_version`
- Ban and moderation actions invalidate sessions immediately by incrementing `session_version`.
- Banned responses are structured consistently with:
  - `code: "ACCOUNT_BANNED"`
  - `ban_reason`
  - `banned_until`
- Expired timed bans auto-clear on auth check/login.

### C. Admin backend module
Added routes:
- `backend/routes/admin.dashboard.js`
- `backend/routes/admin.users.js`
- `backend/routes/admin.contributions.js`

Mounted in:
- `backend/server.js`

APIs implemented:
- Dashboard analytics:
  - `GET /api/admin/dashboard?range=7d|30d|all`
- User management:
  - `GET /api/admin/users`
  - `POST /api/admin/users/:id/kick` (kept backend-compatible)
  - `POST /api/admin/users/:id/ban`
  - `POST /api/admin/users/:id/unban`
- Contribution review:
  - `GET /api/admin/contributions`
  - `GET /api/admin/contributions/:id`
  - `POST /api/admin/contributions/:id/approve`
  - `POST /api/admin/contributions/:id/reject`

Moderation permission rules:
- No self-moderation.
- Superadmin accounts cannot be moderated.
- Admin-to-admin moderation requires superadmin.

### D. Scan + contribution consent pipeline
Updated file:
- `backend/routes/scans.js`

Added behavior:
- Scan save (`POST /api/scans`) accepts:
  - `scan_type` (`breed` or `disease`)
  - `share_for_training` (only for `breed`)
- If `share_for_training=true` on a breed scan:
  - creates `scan_contributions` row in `pending`
- History endpoint (`GET /api/scans`) now includes:
  - `training_status`
  - `training_rejection_reason`
  - `training_reviewed_at`
- Scan delete behavior:
  - pending contribution is deleted with user scan delete
  - terminal review records are preserved by schema strategy (`scan_id` can become null, approved samples retained)

### E. Profile system (fully functional)
Added backend route:
- `backend/routes/profile.js`

Mounted in:
- `backend/server.js` at `/api/profile`

Profile endpoints:
- `GET /api/profile` (user info, total scans, cooldown metadata)
- `PUT /api/profile/username`
- `PUT /api/profile/email`
- `PUT /api/profile/password`

Profile security and cooldown rules:
- Current password required for all changes.
- Username cooldown: 30 days.
- Email cooldown: 30 days.
- Password cooldown: 7 days.
- Email/password update forces relogin (session invalidation).

### F. Frontend admin pages and routing
Updated/added frontend:
- `frontend/src/App.jsx`
- `frontend/src/pages/auth/AdminRoute.jsx`
- `frontend/src/layouts/AdminLayout.jsx`
- `frontend/src/pages/admin/AdminOverviewPage.jsx`
- `frontend/src/pages/admin/AdminUsersPage.jsx`
- `frontend/src/pages/admin/AdminContributionsPage.jsx`

Behavior:
- Dedicated `/admin/*` route tree with protected admin guard.
- Separate admin navigation and admin pages.
- Responsive tables/cards with mobile-safe overflow handling.

### G. Frontend auth/ban UX and propagation
Updated files:
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/services/api.js`
- `frontend/src/pages/auth/Login.jsx`

Behavior:
- Login error handling preserves structured banned payload.
- Login form shows ban notice block with reason and end time.
- If user is banned during active session:
  - API interceptor catches `403 ACCOUNT_BANNED`
  - clears local auth token
  - redirects to login with ban metadata in query params
  - login renders the same ban notice

### H. User-side UI changes
Updated files:
- `frontend/src/context/UIContext.jsx`
- `frontend/src/components/ui/TopNav.jsx`
- `frontend/src/components/ui/Sidebar.jsx`
- `frontend/src/pages/ScanPage.jsx`
- `frontend/src/pages/History.jsx`
- `frontend/src/pages/ProfilePage.jsx`

Behavior:
- User sidebar open/closed state persists across user page navigation in-session via `UIContext`.
- Contribution consent on scan result is now a toggle button (not checkbox) with toasts:
  - ON: scan will be shared after save
  - OFF: scan will not be shared
- History no longer uses static training label:
  - renders real statuses: pending/approved/rejected/not shared
  - shows rejection reason when rejected
- Kick action removed from admin UI surface (backend endpoint remains for compatibility).

## 2) Implementation Timeline (Chronological)

1. Core admin schema and moderation support were introduced:
   - role fields (`is_admin`, `is_superadmin`)
   - ban/session fields
   - admin audit table
2. Consent-based contribution pipeline was added:
   - contribution queue (`scan_contributions`)
   - approved dataset table (`approved_samples`)
   - public monthly usage tracking (`public_scan_usage`)
3. Auth/session reliability was hardened:
   - JWT `sv` session version checks
   - DB-backed token invalidation
   - consistent banned payloads with reason/time
4. Admin module APIs and pages were added:
   - overview analytics
   - user moderation
   - contribution review
5. Superadmin behavior was applied:
   - only superadmin can moderate admin users
   - superadmin accounts are protected from moderation
6. User profile system was made fully functional:
   - real backend APIs
   - current-password verification
   - cooldown windows (30/30/7)
7. UX updates and parity fixes were applied:
   - user sidebar persistence in-session across navigation
   - ban notice rendering on login and active-session ban redirects
   - contribution control changed from checkbox to toggle button + toast
   - kick removed from admin UI surface (backend endpoint preserved)

## 3) End-to-End Flow

### Flow A: Authentication and role routing
1. User logs in via `POST /api/auth/login`.
2. Backend verifies password, unbans expired timed bans, blocks active bans with structured payload.
3. On success, frontend stores token and user payload.
4. `ProtectedRoute` guards normal pages.
5. `AdminRoute` guards `/admin/*` and requires `user.is_admin === true`.

### Flow B: Ban enforcement and visibility
1. Admin/superadmin submits ban with required future `until` and required reason.
2. Backend sets `is_banned=true`, stores `ban_reason`/`banned_until`, increments `session_version`.
3. Existing tokens fail next protected request.
4. Middleware returns `403 ACCOUNT_BANNED` + reason/time.
5. Frontend redirects to login and displays ban reason and end time in a warning block.
6. After expiry, backend auto-clears ban on auth/login check.

### Flow C: Scan save and training contribution queue
1. User runs a scan (breed or disease).
2. On result screen, user can toggle contribution ON/OFF (breed only).
3. User clicks `Save to History`.
4. Backend stores `scan_history` + `scan_predictions`.
5. If breed + contribution ON:
  - backend inserts `scan_contributions` row with `pending` status.
6. History page fetches `/api/scans` and renders real training status badges.

### Flow D: Admin contribution review
1. Admin opens `/admin/contributions`.
2. Admin sees pending/approved/rejected queue with search/filter/pagination.
3. Admin opens a contribution detail.
4. Approve path:
  - choose final breed
  - optional note
  - backend marks queue row approved
  - copies source image to approved storage
  - inserts immutable row into `approved_samples`
  - writes audit trail
5. Reject path:
  - required reason
  - backend marks row rejected
  - writes audit trail

### Flow E: Profile management
1. Profile page loads from `GET /api/profile`.
2. User updates username/email/password with current password verification.
3. Server enforces cooldown windows per field.
4. Email/password changes invalidate current session and force relogin.
5. Username updates refresh live user display.

## 4) Current API Surface (Quick Reference)

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Scans:
- `GET /api/scans/public/usage`
- `POST /api/scans/public/breed`
- `POST /api/scans/public/disease`
- `POST /api/scans/breed`
- `POST /api/scans/disease`
- `GET /api/scans/breed/:breedId`
- `POST /api/scans`
- `GET /api/scans`
- `DELETE /api/scans/:id`

Admin:
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `POST /api/admin/users/:id/kick` (backend present, UI removed)
- `POST /api/admin/users/:id/ban`
- `POST /api/admin/users/:id/unban`
- `GET /api/admin/contributions`
- `GET /api/admin/contributions/:id`
- `POST /api/admin/contributions/:id/approve`
- `POST /api/admin/contributions/:id/reject`

Profile:
- `GET /api/profile`
- `PUT /api/profile/username`
- `PUT /api/profile/email`
- `PUT /api/profile/password`

## 5) Setup and Run

## Prerequisites
- Node.js and npm
- PostgreSQL
- Python 3.10+ (for Flask ML service)

## Install dependencies
Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

Python ML service:
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Database initialization
For a fresh database:
```bash
psql -U <db_user> -d <db_name> -f backend/migrations/database.sql
```

For an existing older database:
```bash
psql -U <db_user> -d <db_name> -f backend/migrations/20260301_admin_module.sql
psql -U <db_user> -d <db_name> -f backend/migrations/20260302_profile_settings.sql
```

## Run services
Node backend API:
```bash
cd backend
npm run dev
```

Flask ML API:
```bash
python app.py
```

Frontend:
```bash
cd frontend
npm run dev
```

## Environment variables
Backend `.env` must include at least:
- `JWT_SECRET`
- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `FLASK_API_URL` (or `FLASK_URL`) (defaults to `http://localhost:5001` if not set)

Do not commit real credentials/tokens to git.

## 6) Role Bootstrapping

To promote an existing user:
```sql
UPDATE users SET is_admin = TRUE WHERE email = '<admin-email>';
```

To grant superadmin:
```sql
UPDATE users
SET is_admin = TRUE, is_superadmin = TRUE
WHERE email = '<superadmin-email>';
```

## 7) Notes and Compatibility

- Kick endpoint is still available in backend for compatibility, but kick action is removed from admin UI.
- Ban is designed as timed moderation using `banned_until`.
- Ban reason and ban-until are visible in login for:
  - direct banned login attempts
  - users banned during an active session
- Contribution sharing only applies to breed scans.
- Approved training samples are copied to dedicated approved storage and tracked in `approved_samples`.

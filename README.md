# DogScanAI

DogScanAI is a full-stack dog scanning platform with:
- a React web app in `frontend/`
- an Express API in `backend/`
- a Flask ML service in `app.py`
- a PostgreSQL database managed through `backend/migrations/`

This README is the current setup guide for the latest repo state, including:
- database migrations and seed/import steps
- web and backend environment variables
- Google sign-in setup for web
- Kotlin Android / mobile integration notes
- the new registration policy acceptance flow

## Project Structure

- `frontend/`: React + Vite web app
- `backend/`: Express API, auth, profile, admin, scans, contributors
- `app.py`: Flask ML inference + assistant service
- `backend/migrations/`: schema and migration files
- `frontend/public/image/complete_dog_breeds.json`: breed catalog source used for DB import

## Requirements

- Node.js 20+ recommended
- npm
- PostgreSQL
- Python 3.10 or 3.11 recommended
- Windows PowerShell commands below assume Windows, but the same steps work on other OSes with equivalent commands

## Fresh Setup After Pulling The Latest Repo

### 1. Install dependencies

Backend:

```powershell
cd backend
npm install
```

Frontend:

```powershell
cd frontend
npm install
```

Python service:

```powershell
cd ..
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Create the PostgreSQL database

Create a database named `dogscan_ai`.

Example:

```sql
CREATE DATABASE dogscan_ai;
```

### 3. Run schema + migrations

Important: `backend/migrations/database.sql` does not contain all of the newest normalized auth/provider/policy tables by itself. On a fresh setup, run the base schema first and then all later migrations in order.

```powershell
psql -U postgres -d dogscan_ai -f backend/migrations/database.sql
psql -U postgres -d dogscan_ai -f backend/migrations/20260301_admin_module.sql
psql -U postgres -d dogscan_ai -f backend/migrations/20260302_profile_settings.sql
psql -U postgres -d dogscan_ai -f backend/migrations/20260309_assistant_module.sql
psql -U postgres -d dogscan_ai -f backend/migrations/20260320_password_reset_tokens.sql
psql -U postgres -d dogscan_ai -f backend/migrations/20260322_auth_normalization_google_oauth.sql
psql -U postgres -d dogscan_ai -f backend/migrations/20260322_full_schema_normalization.sql
psql -U postgres -d dogscan_ai -f backend/migrations/20260322_registration_policy_acceptance.sql
```

### 4. Import the breed catalog

This imports the breed library JSON into the database, including normalized breed child tables.

```powershell
node backend/config/import-json.js
```

### 5. Create environment files

You need:
- `backend/.env`
- `frontend/.env`

Examples are below.

### 6. Start all services

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Flask service:

```powershell
cd ..
.venv\Scripts\activate
python app.py
```

## Environment Variables

### Backend `.env`

Minimum example:

```env
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=dogscan_ai
DB_USER=postgres
DB_PASSWORD=your_postgres_password

FLASK_API_URL=http://localhost:5001

APP_NAME=DogScan AI
PUBLIC_SCAN_LIMIT=5

FRONTEND_URL=http://localhost:5173
RESET_PASSWORD_URL=http://localhost:5173/reset-password
CORS_ALLOW_ORIGINS=http://localhost:5173

REQUIRE_RESET_EMAIL=false
RETURN_RESET_TOKEN=true

GOOGLE_CLIENT_IDS=
```

Optional mail settings if you want real reset emails:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=DogScan AI <no-reply@example.com>
SMTP_VERIFY=true
SMTP_ALLOW_SELF_SIGNED=true
```

Optional assistant tuning in `app.py`:

```env
EAGER_LOAD_SCAN_MODELS=false
DOG_VALIDATOR_THRESHOLD=0.20
ASSISTANT_MODEL_NAME=llama3.2-lite
ASSISTANT_EMBED_MODEL_NAME=BAAI/bge-small-en-v1.5
ASSISTANT_TOP_K=5
ASSISTANT_KEEP_ALIVE=30s
```

### Frontend `.env`

Example:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=
```

## How To Find The Correct URL On Your Own Machine

Do not copy a friend's LAN IP into your own env file unless you are literally using their computer as the host.

Use one of these:

- same computer only:
  - `http://localhost:5173`
- phone / other device on your Wi-Fi:
  - `http://<your_pc_ipv4>:5173`

How to find your own LAN IP:

```powershell
ipconfig
```

Look for `IPv4 Address` under the network adapter you are actually using.

Examples:

- `FRONTEND_URL=http://localhost:5173`
- `RESET_PASSWORD_URL=http://localhost:5173/reset-password`

Or for LAN/mobile testing:

- `FRONTEND_URL=http://192.168.0.22:5173`
- `RESET_PASSWORD_URL=http://192.168.0.22:5173/reset-password`

If you want other devices to reach the Vite dev server, run:

```powershell
cd frontend
npm run dev -- --host 0.0.0.0
```

## Google Sign-In Setup

DogScanAI uses:
- Google Identity Services on the web frontend
- backend verification of the returned Google ID token
- account linking by email when a Google account matches an existing password account

### What the code expects

Frontend:
- `VITE_GOOGLE_CLIENT_ID`

Backend:
- `GOOGLE_CLIENT_IDS`

The backend accepts a comma-separated list, so you can support multiple Google client IDs if needed later.

Example:

```env
GOOGLE_CLIENT_IDS=your_web_client_id.apps.googleusercontent.com
```

### Step 1. Create a Google Cloud project

Go to Google Cloud Console and create or choose a project for DogScanAI.

### Step 2. Configure the Google consent / branding screen

In Google Cloud:
- set the app name
- set support email
- set developer contact email
- if the app is still in testing mode, add your own Gmail as a test user

### Step 3. Create the Web OAuth client

In Google Cloud:
- go to `Google Auth Platform`
- open `Clients`
- click `Create client`
- choose `Web application`

What to put:

- Name:
  - anything descriptive, such as `DogScanAI Web`

- Authorized JavaScript origins:
  - use the exact frontend origin you open in the browser
  - no path
  - no trailing slash

Examples:

- `http://localhost:5173`
- `http://192.168.0.22:5173`

Do not put:

- `http://localhost:5173/`
- `http://localhost:5173/login`
- `http://localhost:5000`

For this repo, you typically do not need redirect URIs because the frontend uses the Google JS button callback flow instead of a redirect-based OAuth flow.

How to know the exact origin:
- open your frontend in the browser
- run `window.location.origin` in DevTools
- use exactly that value in Authorized JavaScript origins

### Step 4. Copy the Web Client ID into the app

After creating the Web client, copy its `Client ID`.

Put it in:

`frontend/.env`

```env
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

`backend/.env`

```env
GOOGLE_CLIENT_IDS=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

### Step 5. Restart frontend and backend

After editing env files, restart:
- the frontend Vite server
- the backend Node server

### Step 6. Test the web Google button

Open Login or Register.

Expected behavior:
- the Google button renders
- a new Google account can create a DogScanAI account
- if the Google email matches an existing password account, the backend links them automatically
- the backend returns `google_auth_status` such as:
  - `created_new`
  - `linked_existing`
  - `existing_linked`

Troubleshooting:

- `Google sign-in is not configured yet.`
  - frontend env missing or Vite not restarted

- `GOOGLE_AUTH_NOT_CONFIGURED`
  - backend env missing or backend not restarted

- origin / popup errors
  - wrong Authorized JavaScript origin

## Kotlin Android / Mobile Google Setup

DogScanAI mobile should call the Node backend, not the Flask service directly.

### Base API URL for Android

Android emulator:

```text
http://10.0.2.2:5000
```

Real Android device on same Wi-Fi:

```text
http://<your_pc_ipv4>:5000
```

Examples:

- emulator: `http://10.0.2.2:5000`
- real device: `http://192.168.0.22:5000`

### Step 1. Create the Android OAuth client

In the same Google Cloud project:
- create another client
- choose `Android`

What to put:

- Package name:
  - your Android app's `applicationId`

- SHA-1 certificate fingerprint:
  - usually your debug SHA-1 for local development

How to find the package name:

Open the Android project and look in:
- `app/build.gradle`
- or `app/build.gradle.kts`

Example:

```kotlin
applicationId = "com.example.dogscanai"
```

How to find SHA-1:

In Android Studio:
- `View` -> `Tool Windows` -> `Gradle`
- `app` -> `Tasks` -> `android` -> `signingReport`

Or from the Android project root:

```powershell
gradlew signingReport
```

Copy the `SHA1` for the `debug` variant while developing.

For release builds later, also register the release or Play App Signing SHA-1.

### Step 2. What the Kotlin app should use

Even on Android, when the app is sending a Google ID token to your backend, the usual setup is to request the token for your server using the Web client ID.

So in Android, the important client ID you usually place in code is the Web client ID:

```xml
<string name="server_client_id">YOUR_WEB_CLIENT_ID.apps.googleusercontent.com</string>
```

The Android client still matters for Google project configuration and signing identity, but the backend ID token flow typically uses the Web client ID as the requested audience.

### Step 3. Mobile auth flow

Current backend endpoints:

- `GET /api/auth/policy`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Token style:
- store the returned JWT
- send it on protected requests as:

```http
Authorization: Bearer <token>
```

### Password login

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Password registration

Registration now requires policy acceptance.

First call:

```http
GET /api/auth/policy
```

Then show the rules to the user and submit:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "myusername",
  "policy_key": "registration_scan_policy",
  "policy_version": "2026-03-22",
  "accept_terms": true
}
```

### Google login / registration from Kotlin

1. Sign in with Google in Android
2. Get the Google ID token
3. Send it to:

```http
POST /api/auth/google
```

Body:

```json
{
  "id_token": "GOOGLE_ID_TOKEN"
}
```

Possible outcomes:

- new Google account:
  - backend may require policy acceptance first
- existing password account with same email:
  - backend auto-links Google to that account
- already-linked Google account:
  - backend signs in directly

If the backend returns:

```json
{
  "code": "TERMS_ACCEPTANCE_REQUIRED",
  "policy_key": "registration_scan_policy",
  "policy_version": "2026-03-22"
}
```

then:

1. call `GET /api/auth/policy`
2. show policy text in the Android UI
3. retry `POST /api/auth/google` with:

```json
{
  "id_token": "GOOGLE_ID_TOKEN",
  "policy_key": "registration_scan_policy",
  "policy_version": "2026-03-22",
  "accept_terms": true
}
```

### Auth responses

Successful auth responses can include:

- `token`
- `user`
- `auth_providers`
- `google_auth_status`
- `google_auth_message`

Examples of `google_auth_status`:

- `created_new`
- `linked_existing`
- `existing_linked`

### Suggested Android handling

- if `linked_existing`:
  - show a success message like "Google sign-in was linked to your existing account."

- if `created_new`:
  - show normal account-created success

- if `ACCOUNT_BANNED`:
  - show the ban reason and end date

- if `PASSWORD_LOGIN_UNAVAILABLE`:
  - the account is Google-only and should use Google sign-in

## Current Important API Surface

Auth:
- `GET /api/auth/policy`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

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
- `POST /api/admin/users/:id/kick`
- `POST /api/admin/users/:id/ban`
- `POST /api/admin/users/:id/unban`
- `GET /api/admin/contributions`
- `GET /api/admin/contributions/:id`
- `POST /api/admin/contributions/:id/approve`
- `POST /api/admin/contributions/:id/reject`
- `GET /api/admin/contributors/leaderboard`

Profile:
- `GET /api/profile`
- `PUT /api/profile/username`
- `PUT /api/profile/email`
- `PUT /api/profile/password`

Contributors:
- `GET /api/contributors/leaderboard`
- `GET /api/contributors/my-stats`

## Role Bootstrapping

Promote an existing user to admin:

```sql
UPDATE users
SET is_admin = TRUE
WHERE email = '<admin-email>';
```

Grant superadmin:

```sql
UPDATE users
SET is_admin = TRUE, is_superadmin = TRUE
WHERE email = '<superadmin-email>';
```

## Troubleshooting

- `404` on a route you just added:
  - restart the backend server

- Google button says not configured:
  - check `frontend/.env`
  - make sure `VITE_GOOGLE_CLIENT_ID` is present
  - restart Vite

- Backend says `GOOGLE_AUTH_NOT_CONFIGURED`:
  - check `backend/.env`
  - make sure `GOOGLE_CLIENT_IDS` is present
  - restart backend

- Another device cannot reach your frontend:
  - run Vite with `--host 0.0.0.0`
  - use your own LAN IP, not your friend's IP

- Password reset link points to the wrong machine:
  - update `FRONTEND_URL`
  - update `RESET_PASSWORD_URL`
  - use either your own `localhost` or your own LAN IP

- Mobile emulator cannot reach backend:
  - use `http://10.0.2.2:5000`, not `localhost`

- Fresh DB missing auth/provider/policy tables:
  - you skipped one or more `20260322_*` migrations

## Security Note

Do not commit real secrets, database passwords, SMTP passwords, or production tokens into Git.

Google OAuth client IDs are public identifiers, but keep all other secrets private.

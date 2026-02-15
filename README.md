# LinkVault

CS69202 DesignLab Assignment: a full stack web application that allows users to upload text or files and share them securely with others using a generated link.

## Overview

LinkVault lets users:
- Share text or files via generated links.
- Set expiry time and view/download limits.
- Protect links with a password.
- Use it as a guest (no login required).
- Register/login to track created links in a dashboard.

The stack is:
- `frontend`: React + Vite + Tailwind
- `backend`: Node.js + Express + SQLite + Multer + bcrypt

## Features

### Core Vault Features
- Create text links and file links.
- Optional password per link (stored as bcrypt hash).
- Expiry date support.
- View/download limit support.
- One-time access mode.
- Manual link deletion.

### Authentication (Optional)
- Register and login with email/password.
- Session token-based auth (`Bearer <token>`).
- Logout endpoint.
- Guest flow remains fully supported.

### Dashboard
- Logged-in users can view their own generated links.
- Shows link type, status, views/downloads, expiry, creation time.
- Keeps expired/limit-reached records for history.

### Cleanup Job
- Runs every 60 seconds.
- Removes expired/over-limit file blobs from disk.
- Preserves DB record for dashboard history.

## Project Structure

```text
linkvault/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── uploads/
│   ├── index.js
│   ├── package.json
│   └── linkvault.db
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── ViewContent.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Prerequisites

- Node.js 18+ recommended
- npm

## Setup & Run

### 1. Install dependencies

```bash
cd backend
npm install

cd frontend
npm install
```

### 2. Start backend

```bash
cd backend
npm run dev
```

Backend runs at: `http://localhost:5000`

### 3. Start frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:5173`

## How It Works

### Guest User
- Can create links and open them.
- Can use password-protected links.
- No dashboard access.

### Logged-in User
- Can do everything guest can.
- New links are associated with that user.
- Can view own links on `/dashboard`.

### Password-Protected Links
- Password is hashed with `bcrypt` and stored in `vault_items.password_hash`.
- Access endpoints require correct `x-link-password` header when link is protected.
- Login status does **not** bypass link password.

## API Reference

Base URL: `http://localhost:5000`

### Auth
- `POST /api/auth/register`
  - body: `{ "email": "...", "password": "..." }`
- `POST /api/auth/login`
  - body: `{ "email": "...", "password": "..." }`
- `GET /api/auth/me`
  - header: `Authorization: Bearer <token>`
- `POST /api/auth/logout`
  - header: `Authorization: Bearer <token>`

### Vault
- `POST /api/upload`
  - multipart fields:
    - `type`: `text` or `file`
    - `text` (if `type=text`)
    - `file` (if `type=file`)
    - `expiryDate`
    - `maxViews`
    - `isOneTime`
    - `password` (optional)
  - optional header: `Authorization: Bearer <token>`

- `GET /api/content/:id`
  - optional header: `x-link-password`

- `GET /api/download/:id`
  - optional header: `x-link-password`

- `DELETE /api/delete/:id`
  - optional header: `x-link-password`

- `GET /api/my-links`
  - header: `Authorization: Bearer <token>`

## Database Schema

SQLite DB: `backend/linkvault.db`

### `users`
- `id` (TEXT, PK)
- `email` (TEXT, UNIQUE)
- `password_hash` (TEXT)
- `created_at`

### `sessions`
- `token` (TEXT, PK)
- `user_id` (TEXT, FK -> users.id)
- `created_at`

### `vault_items`
- `id` (TEXT, PK)
- `type` (TEXT)
- `content` (TEXT, nullable for cleaned file blobs)
- `file_name` (TEXT)
- `password_hash` (TEXT, nullable)
- `owner_user_id` (TEXT, nullable FK -> users.id)
- `expiry_at`
- `max_views`
- `current_views`
- `created_at`

## Security Notes

- Passwords are never stored in plain text.
- Link passwords are hashed with bcrypt.
- User auth is token-based using session tokens in DB.
- File upload types are restricted and file size is limited.

## Build

Frontend production build:

```bash
cd frontend
npm run build
```

## Known Defaults

- Backend port: `5000`
- Frontend port: `5173`
- File size limit: `5MB`
- Cleanup interval: `60 seconds`

## Design Decisions

1. Guest-first sharing with optional accounts
- Core upload/retrieval flows do not require login.
- Logged-in users get dashboard ownership and tracking.

2. Password protection at link level
- Link passwords are hashed with bcrypt (`password_hash`) and never stored in plaintext.
- Password checks are enforced independently from account login.

3. Usage semantics by content type
- Text link accesses increment on `GET /api/content/:id`.
- File accesses increment only on successful `GET /api/download/:id`.

4. Soft cleanup for expired/consumed files
- Background job runs every 60 seconds.
- For file links, expired or limit-reached files are removed from disk.
- DB row is retained for dashboard history by setting `content = NULL`.

5. Simple session persistence
- Tokens are random IDs stored in `sessions` table.
- Frontend persists token in `localStorage`.

## Assumptions and Limitations

1. Local-development defaults
- Backend and frontend API URLs are hardcoded to localhost values in frontend code.
- Backend listens on port `5000` directly.

2. Limited production hardening
- No rate limiting, CAPTCHA, or abuse controls.
- No CSRF protections needed for current token-header pattern, but broader hardening is not implemented.

3. Session model
- Session tokens do not have explicit expiry.
- A token remains valid until manual logout or database reset.

4. File handling constraints
- Max upload size is 5 MB.
- Allowed MIME types are restricted (images, PDF, ZIP, TXT, DOC, DOCX).

5. Database path consistency
- Current code opens SQLite via relative path in `backend/config/database.js` (`./linkvault.db`).
- Any `.env` DB path value is currently not used by active server code.

6. Architecture scope
- API logic is implemented directly in `backend/index.js`.
- `backend/routes` and `backend/controllers` include older modular code not used by the running server entrypoint.

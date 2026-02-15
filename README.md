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

- Upload **either text or a file** per link
- Secure, hard-to-guess shareable URLs
- Optional expiry time
- Optional password-protected links
- Optional view/download limits
- One-time access links
- Guest usage without login
- Authenticated dashboard for link history
- Background cleanup of expired content
  
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

## API OVERVIEW

Base URL: `http://localhost:5000`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Link & Content APIs
- `POST /api/upload`
  - Creates a new text or file link with optional expiry, password and access limits.
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
  - Retrieves shared text content.

- `GET /api/download/:id`
  - Downloads shared file content.

- `DELETE /api/delete/:id`
  - Deletes a link and associated content.

- `GET /api/my-links`
  - Returns link history for authenticated users.

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


## Design Decisions

1. Link-based access control
- Content is accessible strictly through generated URLs, avoiding public listing or search.

2. Guest-first approach
- Core functionality works without authentication; accounts are optional for tracking links.

3. Password protection at link level
- Link passwords are hashed and validated independently of user authentication.

4. SQLite for persistence
- Chosen for simplicity, portability, and ease of setup for local development.

5. Asynchronous cleanup job
- Expiry enforcement is separated from request handling to keep APIs responsive.

## Assumptions and Limitations

1. The application targets local or single-node deployment.

2. File storage is local (no external object storage).

3. No rate limiting or abuse prevention is implemented.

4. Session tokens do not expire automatically.

5. Advanced production hardening is out of scope.


# Readify Backend

Express + MongoDB API for Readify.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `backend/.env` from `backend/.env.example`.

3. Set required environment variables:

```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
JWT_SECRET=<long-random-secret>
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173,http://localhost:5174,http://localhost:4173
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:4173
```

Use `FRONTEND_URLS` or `CORS_ORIGINS` for every deployed frontend origin that should be allowed to send credentialed requests. Do not use wildcard Vercel domains in production.

4. Start the API:

```bash
npm run dev
```

## Admin Setup

Create or reset an admin account with:

```bash
npm run reset:admin -- admin@example.com strong-password
```

Normal user registration is handled by `POST /api/auth/register`. Admin creation through `/api/admin/register` requires an authenticated admin token.

## Health Check

`GET /health` returns service uptime and MongoDB connection state.

- `200`: API is running and MongoDB is connected.
- `503`: API is running but MongoDB is not connected yet.

Example response:

```json
{
  "success": true,
  "service": "Readify API",
  "database": {
    "status": "connected",
    "readyState": 1
  }
}
```

## Core API

- `POST /api/auth/register` - register a user.
- `POST /api/auth/login` - login and receive a JWT token.
- `GET /api/auth/me` - get the current authenticated user.
- `GET /api/books` - list books.
- `GET /api/books/:id` - get one book and increment open count.
- `POST /api/books` - admin-only book upload.
- `PUT /api/books/:id` - admin-only book update.
- `DELETE /api/books/:id` - admin-only book delete.
- `POST /api/progress` - save reading progress.
- `GET /api/progress` - list progress for the authenticated user.
- `POST /api/analytics/visit` - record one frontend page visit.
- `GET /api/analytics/admin` - admin-only analytics overview.

Book uploads support `title`, `author`, `category`, `description`, `tags`, `language`, `difficulty`, `thumbnail`, and `file/fileUrl`.

## Deployment Notes

- Set `NODE_ENV=production`.
- Set `JWT_SECRET` to a high-entropy secret, not the example value.
- Set `MONGODB_URI` or `MONGO_URI` to your production database.
- Set `BACKEND_URL` to the public backend origin so uploaded media URLs resolve correctly.
- Set `FRONTEND_URLS` or `CORS_ORIGINS` to explicit frontend origins only.
- Configure the hosting health check to call `/health`.

## Dependency Notes

No backend package was identified as safe to remove from `package.json`. If `npm ls` shows extraneous packages locally, clean `node_modules` and reinstall with `npm install`.

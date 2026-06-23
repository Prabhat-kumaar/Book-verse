# Book-verse

Book-verse is a MERN reading app with a React/Vite frontend, Express/MongoDB backend, PDF/EPUB reader, admin panel, analytics, authentication, and book uploads.

## Local Development

Install dependencies separately:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create `backend/.env` from `backend/.env.example`, then start both apps:

```bash
cd backend
npm run dev

cd ../frontend
npm run dev
```

## Environment Variables

Backend:

- `PORT` - API port, defaults to `5000`.
- `NODE_ENV` - `development` or `production`.
- `MONGODB_URI` or `MONGO_URI` - MongoDB connection string.
- `MONGODB_URI_DIRECT` - optional direct MongoDB connection string fallback.
- `JWT_SECRET` - long random JWT signing secret.
- `BACKEND_URL` - public backend origin for generated upload URLs.
- `FRONTEND_URL`, `FRONTEND_URLS`, or `CORS_ORIGINS` - explicit frontend origins allowed by CORS.

Frontend:

- `VITE_API_URL` - public backend origin, for example `https://api.example.com`.
- `VITE_API_WITH_CREDENTIALS` - set to `true` only when cookie credentials are intentionally used.
- `PRERENDER_TOKEN` - Prerender.io token used by the Vercel serverless prerender proxy for crawler requests.

## Admin Setup

Bootstrap an admin user from the backend:

```bash
cd backend
npm run reset:admin -- admin@example.com strong-password
```

## Health Check

The backend exposes:

```bash
GET /health
```

It returns API uptime and MongoDB connection state. Use this route for deployment health checks.

## Deployment

- Deploy backend and frontend separately.
- Set production secrets in the host dashboard, not in committed files.
- Add every frontend deployment URL to `FRONTEND_URLS` or `CORS_ORIGINS`.
- Set frontend `VITE_API_URL` to the public backend URL.
- Rotate any credentials that were previously committed or shared.

## Dependency Cleanup

`depcheck` did not identify a backend dependency that is safe to remove. The frontend may report local `node_modules` extraneous packages; clean them by deleting `node_modules` and running `npm install`. Keep reader dependencies such as `epubjs` and `pdfjs-dist`, because they power EPUB/PDF reading.

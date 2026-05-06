# Tashi Brakes

Marketing and e-commerce website for Tashi Brakes, featuring a customer storefront and a comprehensive admin backend for managing inventory, orders, QR codes, sales teams, and POS operations.

## Run & Operate

- **Dev**: `npm run dev` — starts Vite (port 5000) + Express API (port 3001) concurrently
- **Build**: `npm run build`
- **Production**: `npm start` — Express serves static dist + API on port 5000
- **Typecheck**: `npm run typecheck`

Required secrets:
- `FIREBASE_SERVICE_ACCOUNT` — Firebase Admin SDK service account JSON string
- `SESSION_SECRET` — HMAC secret for admin session tokens

Optional:
- `FIREBASE_STORAGE_BUCKET` — defaults to `<project_id>.appspot.com`
- `CORS_ORIGINS` — comma-separated extra allowed CORS origins

## Stack

- **Frontend**: React 19, Vite 7, TypeScript, Tailwind CSS 4, Framer Motion, React Router 7
- **Backend**: Node.js, Express 5
- **Database/Storage**: Firebase Firestore + Firebase Storage (via firebase-admin)
- **Auth**: Custom HMAC-signed session cookies (no external auth provider)

## Where things live

- `src/` — React frontend
  - `src/pages/` — Route components (public + admin)
  - `src/components/` — Reusable UI components
  - `src/lib/` — Frontend utilities, API fetch helper, cart context
- `server/` — Express backend
  - `server/routes/` — Modular API route handlers
  - `server/lib/firebase.js` — Firebase Admin init & helpers
  - `server/lib/auth.js` — Session signing/verification middleware
- `public/` — Static assets (logos, videos)

## Architecture decisions

- Dev uses Vite proxy (`/api` → port 3001); prod uses Express to serve both static files and API on port 5000
- Admin auth uses custom HMAC-signed session cookies (bcryptjs for password hashing, no JWT library)
- Firebase Firestore is the sole database; no SQL/Postgres used despite runtime Postgres secrets being present
- Replit `.replit.dev`/`.replit.app`/`.repl.co` origins are whitelisted automatically in the CORS middleware

## Product

- Public storefront: product catalogue, cart, wholesale & website order submission
- Admin panel: order management, user/team management, QR code generation, commission tracking, POS (sales, stock, customers), ad/ticker/region settings

## User preferences

_Populate as you learn them._

## Gotchas

- `FIREBASE_SERVICE_ACCOUNT` must be a valid JSON string — the server exits immediately if missing or malformed
- Vite proxy target defaults to `http://127.0.0.1:3001`; set `VITE_API_URL` to override

## Pointers

- Workflows skill: `.local/skills/workflows/SKILL.md`
- Environment secrets skill: `.local/skills/environment-secrets/SKILL.md`

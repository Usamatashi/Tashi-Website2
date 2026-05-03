# Tashi Website

Marketing site for Tashi Brakes — React + Vite + Tailwind v4 SPA, with a small
Express backend that reads product data from the same Firebase (Cloud Firestore)
database used by the Tashi mobile app.

## Stack
- **Frontend:** React 19 + TypeScript, Vite 7, Tailwind CSS v4, React Router 7,
  Framer Motion, lucide-react.
- **Backend:** Node + Express, `firebase-admin` reading Cloud Firestore.

## Project layout
```
src/
├── App.tsx               # Router (separates public site from /admin/* shell)
├── main.tsx              # Entry point
├── index.css             # Tailwind entry (defines .input class)
├── components/
│   ├── AdminLayout.tsx   # Admin shell: sidebar, top bar, permission gating
│   └── admin/ui.tsx      # Shared admin UI primitives
├── lib/
│   ├── admin.ts          # Type-safe client for ALL ~50 admin endpoints + helpers
│   └── ...
└── pages/                # Route components
   ├── Admin*.tsx         # 14 admin pages (Dashboard + 12 ports + Login)
   └── ...
public/                   # Static assets
server/
├── index.js              # Thin entry: mounts route modules, path aliases
├── lib/                  # firebase, auth, helpers, storage
└── routes/               # 13 modules: website-orders, admin-auth, products,
                          # users, qrcodes, claims, payments, commission, ads,
                          # ticker, regions, admin-settings,
                          # admin-user-settings, whatsapp-contacts
```

## Firebase integration
- Uses the `FIREBASE_SERVICE_ACCOUNT` secret (full service account JSON).
- Reads from the `products` and `users` Firestore collections; writes to
  `orders`.
- Public endpoints in `server/index.js`:
  - `GET /api/health` — liveness check
  - `GET /api/products/public` — normalized product list. The mapper accepts
    common field-name variants (e.g. `salesPrice`/`price`, `productNumber`/`sku`,
    `vehicleManufacturer`/`vehicle`/`make`, `imageUrl`/`image`/`photoUrl`).
  - `POST /api/orders` — create a website order (`source: "website"`).
  - `GET /api/orders/:id` — fetch a single order (used by the confirmation page).
- Products updated in the Tashi mobile app are reflected on the website
  automatically because both read from the same Firestore database.

## Admin panel
The admin section ports the 12 admin screens from the Tashi mobile app to the
website, styled in the website design language and connected to the same
Firestore database. Skipped on purpose: Vertex AI embeddings/identify and push
notifications.

- Routes (rendered without the public Header/Footer, behind `AdminLayout`):
  - `/admin/login` — phone + password login.
  - `/admin` — dashboard with live counts and revenue.
  - `/admin/orders` — two tabs: **Retail** (website orders, `source: "website"`)
    and **Wholesale** (mobile-app orders placed by salesmen — same `orders`
    collection, items in `orderItems`, statuses pending/confirmed/dispatched/
    cancelled).
  - `/admin/orders/:orderId` — retail order detail.
  - `/admin/orders/wholesale/:docId` — wholesale order detail with item
    breakdown, retailer + salesman info, and status update buttons.
  - `/admin/products` — product CRUD with image and diagram upload.
  - `/admin/claims` — claims list and detail (verify QR / mark missing /
    mark received).
  - `/admin/payments` — payment history + retailer outstanding balances +
    record/verify payment.
  - `/admin/commission` and `/admin/commission/salesman/:salesmanId` —
    leaderboard, monthly totals, per-salesman drill-down + approve commission.
  - `/admin/qr-codes` — generate unguessable QR ids for products, render
    preview, download PNG (via api.qrserver.com).
  - `/admin/ads` — banner CRUD, multipart upload (images/videos up to 50 MB).
  - `/admin/ticker` — scrolling-message CRUD (≤200 chars).
  - `/admin/users` — user CRUD with role + region.
  - `/admin/regions` — region CRUD.
  - `/admin/whatsapp` — per-role WhatsApp contact numbers.
  - `/admin/super-config` — super-admin only: per-admin permission toggles +
    global defaults.
- Sidebar entries hide when the corresponding `adminUserSettings` flag is
  off for that admin (super_admin sees everything).
- Auth uses the **same `users` collection as the Tashi mobile app**: phone
  number is normalized (digits only) and matched against `users.phone`, then
  `bcryptjs.compare` is used against the stored `passwordHash` (`$2b$10$` /
  `$2b$12$`). Only roles `admin` and `super_admin` may sign in.
- Sessions: HMAC-signed (HS256 over `SESSION_SECRET`) cookie `tashi_admin`,
  HttpOnly + SameSite=Lax (Secure in prod), 7-day TTL. Payload contains
  `{ uid, role, name, phone, exp }`.
- Admin endpoints (all require the cookie except `login`):
  - `POST /api/admin/login` — `{ phone, password }`
  - `POST /api/admin/logout`
  - `GET  /api/admin/me`
  - `GET  /api/admin/orders?status=…` — website orders, newest first.
  - `GET  /api/admin/orders/:id`
  - `PATCH /api/admin/orders/:id` — `{ status }`; also writes
    `updatedAt` (server timestamp) and `updatedBy: { uid, name }`.
  - `GET  /api/admin/stats` — totals + revenue (excludes cancelled orders).
- The unused `ADMIN_PASSWORD` secret may be safely removed.

## Replit setup
- Workflow `Start application` runs `npm run dev` which uses `concurrently` to
  start Vite (port `5000`, host `0.0.0.0`, `allowedHosts: true`) and the Express
  API (port `8080`, host `127.0.0.1`).
- Vite proxies `/api/*` to `http://localhost:8080` in dev.
- Deployment is configured as `autoscale`:
  - Build: `npm run build` (Vite emits to `dist/`)
  - Run: `npm run start` (Express in production serves both the API and the
    built `dist/` static files on `0.0.0.0:$PORT`).

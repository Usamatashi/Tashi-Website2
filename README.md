# Tashi Website

Marketing site for Tashi Brakes — built with React + Vite + Tailwind.

## Local development

```bash
pnpm install   # or: npm install
pnpm dev       # http://localhost:5173
```

The dev server proxies `/api/*` to `http://localhost:8080` by default.
Override with `VITE_API_URL` if your API runs elsewhere:

```bash
VITE_API_URL=https://api.tashi.example.com pnpm dev
```

## Production build

```bash
pnpm build
pnpm preview
```

The static site is emitted to `dist/`. Deploy the `dist/` folder to any
static host (Vercel, Netlify, Cloudflare Pages, etc.).

## Project layout

```
src/
├── App.tsx          # Router
├── main.tsx         # Entry point
├── index.css        # Tailwind entry
├── components/      # Shared UI components
├── lib/             # Utilities
└── pages/           # Route components
public/              # Static assets served at /
```

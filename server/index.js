import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./lib/firebase.js";
import websiteOrdersRouter from "./routes/website-orders.js";
import wholesaleOrdersRouter from "./routes/wholesale-orders.js";
import adminAuthRouter from "./routes/admin-auth.js";
import productsRouter from "./routes/products.js";
import usersRouter from "./routes/users.js";
import qrcodesRouter from "./routes/qrcodes.js";
import claimsRouter from "./routes/claims.js";
import paymentsRouter from "./routes/payments.js";
import commissionRouter from "./routes/commission.js";
import adsRouter from "./routes/ads.js";
import tickerRouter from "./routes/ticker.js";
import regionsRouter from "./routes/regions.js";
import adminSettingsRouter from "./routes/admin-settings.js";
import adminUserSettingsRouter from "./routes/admin-user-settings.js";
import whatsappContactsRouter from "./routes/whatsapp-contacts.js";
import teamRouter from "./routes/team.js";
import posRouter from "./routes/pos.js";
import stockRouter from "./routes/stock.js";
import posCustomersRouter from "./routes/pos-customers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const ALLOWED_ORIGINS = [
  "https://tashibrakes.com",
  "https://www.tashibrakes.com",
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map(o => o.trim()) : []),
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "60mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Public + website-side
app.use("/api/products", productsRouter);
app.use("/api", websiteOrdersRouter);
app.use("/api", wholesaleOrdersRouter);

// Admin auth
app.use("/api/admin", adminAuthRouter);

// Admin: kept old paths for AdminOrders.tsx compat
app.use("/api/admin/orders", (req, _res, next) => { req.url = `/admin/website-orders${req.url}`; next(); }, websiteOrdersRouter);
app.get("/api/admin/stats", (req, res, next) => { req.url = "/admin/website-stats"; next(); }, websiteOrdersRouter);

// Admin resource routers
app.use("/api/admin/users", usersRouter);
app.use("/api/admin/qr-codes", qrcodesRouter);
app.use("/api/admin/claims", claimsRouter);
app.use("/api/admin/payments", paymentsRouter);
app.use("/api/admin/commission", commissionRouter);
app.use("/api/admin/ads", adsRouter);
app.use("/api/admin/ticker", tickerRouter);
app.use("/api/admin/regions", regionsRouter);
app.use("/api/admin/admin-settings", adminSettingsRouter);
app.use("/api/admin/admin-user-settings", adminUserSettingsRouter);
app.use("/api/admin/whatsapp-contacts", whatsappContactsRouter);
app.use("/api/admin/team", teamRouter);
app.use("/api/admin/pos/sales", posRouter);
app.use("/api/admin/pos/stock", stockRouter);
app.use("/api/admin/pos/customers", posCustomersRouter);

const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const distDir = path.resolve(__dirname, "..", "dist");
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

const port = Number(process.env.PORT ?? (isProd ? 5000 : 3001));
const host = isProd ? "0.0.0.0" : "127.0.0.1";

app.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`);
});

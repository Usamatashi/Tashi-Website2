import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./lib/firebase.js";
import authRouter from "./routes/auth.js";
import websiteOrdersRouter from "./routes/website-orders.js";
import wholesaleOrdersRouter from "./routes/wholesale-orders.js";
import productsRouter from "./routes/products.js";
import adsRouter from "./routes/ads.js";
import tickerRouter from "./routes/ticker.js";
import regionsRouter from "./routes/regions.js";
import careersRouter from "./routes/careers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const ALLOWED_ORIGINS = [
  "https://tashibrakes.com",
  "https://www.tashibrakes.com",
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map(o => o.trim()) : []),
];

function isReplitOrigin(origin) {
  if (!origin) return false;
  return origin.endsWith(".replit.dev") || origin.endsWith(".replit.app") || origin.endsWith(".repl.co");
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || isReplitOrigin(origin))) {
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

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api", websiteOrdersRouter);
app.use("/api", wholesaleOrdersRouter);
app.use("/api/ads", adsRouter);
app.use("/api/ticker", tickerRouter);
app.use("/api/regions", regionsRouter);
app.use("/api/careers", careersRouter);

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

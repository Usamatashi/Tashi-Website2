import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../lib/firebase.js";
import {
  signSession,
  verifySession,
  parseCookies,
  setCustomerCookie,
  clearCustomerCookie,
  requireCustomer,
  CUSTOMER_COOKIE,
  SESSION_TTL_MS,
} from "../lib/customer-auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!name?.trim()) return res.status(400).json({ error: "Name is required." });
  if (!email?.trim()) return res.status(400).json({ error: "Email is required." });
  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db
    .collection("customers")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (!existing.empty)
    return res.status(409).json({ error: "An account with this email already exists." });

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  const ref = await db.collection("customers").add({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  const payload = {
    uid: ref.id,
    name: name.trim(),
    email: normalizedEmail,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const token = signSession(payload);
  setCustomerCookie(res, token, SESSION_TTL_MS);

  return res.status(201).json({ uid: ref.id, name: name.trim(), email: normalizedEmail });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email?.trim()) return res.status(400).json({ error: "Email is required." });
  if (!password) return res.status(400).json({ error: "Password is required." });

  const normalizedEmail = email.trim().toLowerCase();

  const snap = await db
    .collection("customers")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (snap.empty)
    return res.status(401).json({ error: "Incorrect email or password." });

  const doc = snap.docs[0];
  const data = doc.data();
  const match = await bcrypt.compare(password, data.passwordHash);

  if (!match)
    return res.status(401).json({ error: "Incorrect email or password." });

  const payload = {
    uid: doc.id,
    name: data.name,
    email: data.email,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const token = signSession(payload);
  setCustomerCookie(res, token, SESSION_TTL_MS);

  return res.json({ uid: doc.id, name: data.name, email: data.email });
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies[CUSTOMER_COOKIE];
  const session = verifySession(token);
  if (!session) return res.status(401).json({ error: "Not logged in" });
  return res.json({ uid: session.uid, name: session.name, email: session.email });
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  clearCustomerCookie(res);
  return res.json({ ok: true });
});

export default router;

import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "./admin-auth.js";

const router = Router();
router.use(requireAdmin);

// ── List customers ────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const snap = await db.collection("pos_customers").orderBy("name").get();
    const customers = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toISOString(d.data().createdAt),
      lastPurchaseAt: toISOString(d.data().lastPurchaseAt),
    }));
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create customer ───────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, city, address } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });

    const id = await nextId("pos_customers");
    const data = {
      id,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      city: city?.trim() || null,
      address: address?.trim() || null,
      totalPurchases: 0,
      createdAt: new Date(),
      lastPurchaseAt: null,
    };
    await db.collection("pos_customers").doc(String(id)).set(data);
    res.status(201).json({ ...data, id: String(id), createdAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update customer ───────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, email, city, address } = req.body;
    const ref = db.collection("pos_customers").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (email !== undefined) updates.email = email?.trim() || null;
    if (city !== undefined) updates.city = city?.trim() || null;
    if (address !== undefined) updates.address = address?.trim() || null;

    await ref.update(updates);
    const updated = (await ref.get()).data();
    res.json({ id: req.params.id, ...updated, createdAt: toISOString(updated.createdAt) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete customer ───────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await db.collection("pos_customers").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Customer purchase history ─────────────────────────────────────────────
router.get("/:id/sales", async (req, res) => {
  try {
    const snap = await db.collection("pos_sales")
      .where("customerId", "==", req.params.id)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const sales = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toISOString(d.data().createdAt),
    }));
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

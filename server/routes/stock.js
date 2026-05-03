import { Router } from "express";
import { db, toISOString } from "../lib/firebase.js";
import { requireAdmin } from "./admin-auth.js";

const router = Router();
router.use(requireAdmin);

// ── List stock ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const snap = await db.collection("pos_stock").orderBy("productName").get();
    const stock = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      updatedAt: toISOString(d.data().updatedAt),
    }));
    res.json(stock);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Set / upsert stock for a product ─────────────────────────────────────
router.put("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { productName, sku, quantity, costPrice, reorderLevel } = req.body;

    const ref = db.collection("pos_stock").doc(productId);
    const existing = await ref.get();

    const data = {
      productId: Number(productId),
      productName: productName || existing.data()?.productName || "",
      sku: sku || existing.data()?.sku || "",
      quantity: quantity !== undefined ? Number(quantity) : (existing.data()?.quantity || 0),
      costPrice: costPrice !== undefined ? Number(costPrice) : (existing.data()?.costPrice || 0),
      reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : (existing.data()?.reorderLevel || 5),
      updatedAt: new Date(),
    };

    await ref.set(data, { merge: true });
    res.json({ id: productId, ...data, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Adjust stock (relative change) ───────────────────────────────────────
router.post("/:productId/adjust", async (req, res) => {
  try {
    const { productId } = req.params;
    const { change, reason } = req.body;
    if (change === undefined) return res.status(400).json({ error: "change required" });

    const ref = db.collection("pos_stock").doc(productId);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Stock record not found" });

    const current = doc.data().quantity || 0;
    const newQty = Math.max(0, current + Number(change));
    await ref.update({ quantity: newQty, updatedAt: new Date() });

    // Log adjustment
    await db.collection("pos_stock_history").add({
      productId: Number(productId),
      productName: doc.data().productName,
      change: Number(change),
      quantityBefore: current,
      quantityAfter: newQty,
      reason: reason || null,
      createdAt: new Date(),
    });

    res.json({ productId: Number(productId), quantityBefore: current, quantityAfter: newQty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get stock history for a product ──────────────────────────────────────
router.get("/:productId/history", async (req, res) => {
  try {
    const snap = await db.collection("pos_stock_history")
      .where("productId", "==", Number(req.params.productId))
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const history = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toISOString(d.data().createdAt),
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk sync products into stock (initial setup) ─────────────────────────
router.post("/sync-products", async (req, res) => {
  try {
    const { products } = req.body;
    if (!products?.length) return res.status(400).json({ error: "products array required" });

    const batch = db.batch();
    for (const p of products) {
      const ref = db.collection("pos_stock").doc(String(p.id));
      const existing = await ref.get();
      if (!existing.exists) {
        batch.set(ref, {
          productId: p.id,
          productName: p.name,
          sku: p.productNumber || "",
          quantity: 0,
          costPrice: 0,
          reorderLevel: 5,
          updatedAt: new Date(),
        });
      } else {
        batch.update(ref, {
          productName: p.name,
          sku: p.productNumber || existing.data().sku || "",
        });
      }
    }
    await batch.commit();
    res.json({ ok: true, synced: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

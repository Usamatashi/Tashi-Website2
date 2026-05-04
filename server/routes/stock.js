import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

router.get("/", async (_req, res) => {
  try {
    const snap = await db.collection("pos_stock").orderBy("productName").get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), updatedAt: toISOString(d.data().updatedAt) }));
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { productId, productName, sku, quantity, minQuantity, costPrice, sellingPrice } = req.body;
    if (!productId || !productName) return res.status(400).json({ error: "productId and productName are required" });
    const existing = await db.collection("pos_stock").where("productId", "==", Number(productId)).limit(1).get();
    if (!existing.empty) return res.status(400).json({ error: "Stock entry already exists for this product" });
    const id = await nextId("pos_stock");
    const item = {
      id, productId: Number(productId), productName, sku: sku || null,
      quantity: Number(quantity || 0), minQuantity: Number(minQuantity || 5),
      costPrice: costPrice ? Number(costPrice) : null,
      sellingPrice: sellingPrice ? Number(sellingPrice) : null,
      updatedAt: new Date(),
    };
    await db.collection("pos_stock").doc(String(id)).set(item);
    res.status(201).json({ ...item, updatedAt: toISOString(item.updatedAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const ref = db.collection("pos_stock").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Stock item not found" });
    const { quantity, minQuantity, costPrice, sellingPrice } = req.body;
    const updates = { updatedAt: new Date() };
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (minQuantity !== undefined) updates.minQuantity = Number(minQuantity);
    if (costPrice !== undefined) updates.costPrice = costPrice ? Number(costPrice) : null;
    if (sellingPrice !== undefined) updates.sellingPrice = sellingPrice ? Number(sellingPrice) : null;
    await ref.update(updates);
    const updated = { ...doc.data(), ...updates };
    res.json({ id: doc.id, ...updated, updatedAt: toISOString(updated.updatedAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/adjust", async (req, res) => {
  try {
    const ref = db.collection("pos_stock").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Stock item not found" });
    const { adjustment, reason } = req.body;
    if (!adjustment || isNaN(Number(adjustment))) return res.status(400).json({ error: "adjustment is required" });
    const current = doc.data().quantity || 0;
    const newQty = Math.max(0, current + Number(adjustment));
    await ref.update({ quantity: newQty, updatedAt: new Date() });
    const histId = await nextId("pos_stock_history");
    await db.collection("pos_stock_history").doc(String(histId)).set({
      id: histId, stockId: req.params.id, productId: doc.data().productId,
      productName: doc.data().productName, adjustment: Number(adjustment),
      quantityBefore: current, quantityAfter: newQty,
      reason: reason || null, createdBy: req.admin.userId ?? null, createdAt: new Date(),
    });
    res.json({ id: doc.id, ...doc.data(), quantity: newQty, updatedAt: toISOString(new Date()) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = db.collection("pos_stock").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Stock item not found" });
    await ref.delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

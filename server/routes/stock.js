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

// Sync stock from all existing purchases (backfill)
router.post("/sync-from-purchases", async (req, res) => {
  try {
    const purchasesSnap = await db.collection("purchases").get();
    const returnsSnap = await db.collection("purchase_returns").get();

    // Build a net qty map keyed by productName (lowercased) and sku
    const netMap = new Map(); // key -> { productName, sku, qty, unitCost }

    for (const doc of purchasesSnap.docs) {
      const data = doc.data();
      for (const item of (data.items || [])) {
        const key = item.sku ? `sku:${item.sku}` : `name:${(item.productName || "").toLowerCase()}`;
        const existing = netMap.get(key) || { productName: item.productName, sku: item.sku || null, qty: 0, unitCost: item.unitCost || 0 };
        existing.qty += Number(item.qty) || 0;
        existing.unitCost = item.unitCost || existing.unitCost;
        netMap.set(key, existing);
      }
    }

    for (const doc of returnsSnap.docs) {
      const data = doc.data();
      for (const item of (data.items || [])) {
        const key = item.sku ? `sku:${item.sku}` : `name:${(item.productName || "").toLowerCase()}`;
        const existing = netMap.get(key);
        if (existing) {
          existing.qty = Math.max(0, existing.qty - (Number(item.qty) || 0));
          netMap.set(key, existing);
        }
      }
    }

    const stockCol = db.collection("pos_stock");
    let created = 0;
    let updated = 0;

    for (const [, entry] of netMap) {
      if (!entry.productName || entry.qty <= 0) continue;

      // Try to find existing stock entry
      let existingSnap = null;
      if (entry.sku) {
        const bySku = await stockCol.where("sku", "==", entry.sku).limit(1).get();
        if (!bySku.empty) existingSnap = bySku.docs[0];
      }
      if (!existingSnap) {
        const byName = await stockCol.where("productName", "==", entry.productName).limit(1).get();
        if (!byName.empty) existingSnap = byName.docs[0];
      }

      if (existingSnap) {
        const updates = { quantity: entry.qty, updatedAt: new Date() };
        if (entry.unitCost) updates.costPrice = entry.unitCost;
        await existingSnap.ref.update(updates);
        updated++;
      } else {
        const stockId = await nextId("pos_stock");
        const stockProductId = await nextId("pos_stock_product");
        await stockCol.doc(String(stockId)).set({
          id: stockId,
          productId: stockProductId,
          productName: entry.productName,
          sku: entry.sku || null,
          quantity: entry.qty,
          minQuantity: 5,
          costPrice: entry.unitCost || null,
          sellingPrice: null,
          updatedAt: new Date(),
        });
        created++;
      }
    }

    res.json({ ok: true, created, updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

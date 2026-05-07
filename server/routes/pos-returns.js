import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

function padNum(n, len = 6) { return String(n).padStart(len, "0"); }

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const snap = await db.collection("pos_returns").orderBy("createdAt", "desc").limit(limit).get();
    const returns = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toISOString(d.data().createdAt),
    }));
    res.json(returns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { saleId, saleNumber, customerId, customerName, items, totalRefund, reason, paymentMethod } = req.body;
    if (!saleId) return res.status(400).json({ error: "saleId is required" });
    if (!items?.length) return res.status(400).json({ error: "At least one item is required" });

    const saleRef = db.collection("pos_sales").doc(String(saleId));
    const saleDoc = await saleRef.get();
    if (!saleDoc.exists) return res.status(404).json({ error: "Original sale not found" });

    const id = await nextId("pos_returns");
    const returnNumber = `RET-${padNum(id)}`;

    const returnRecord = {
      id,
      returnNumber,
      saleId: String(saleId),
      saleNumber: saleNumber || null,
      customerId: customerId || null,
      customerName: customerName || "Walk-in",
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku || "",
        qty: Number(i.qty),
        unitPrice: Number(i.unitPrice),
        discountPct: Number(i.discountPct || 0),
        lineTotal: Number(i.lineTotal),
      })),
      totalRefund: Number(totalRefund || 0),
      reason: reason || null,
      paymentMethod: paymentMethod || "cash",
      processedBy: req.admin.userId ?? null,
      createdAt: new Date(),
    };

    await db.collection("pos_returns").doc(String(id)).set(returnRecord);

    for (const item of items) {
      if (!item.productId) continue;
      const stockSnap = await db.collection("pos_stock")
        .where("productId", "==", Number(item.productId))
        .limit(1)
        .get();
      if (!stockSnap.empty) {
        const stockRef = stockSnap.docs[0].ref;
        const curr = stockSnap.docs[0].data().quantity || 0;
        await stockRef.update({ quantity: curr + Number(item.qty) });
      }
    }

    if (customerId) {
      const custRef = db.collection("pos_customers").doc(String(customerId));
      const custDoc = await custRef.get();
      if (custDoc.exists) {
        const currentTotal = custDoc.data().totalPurchases || 0;
        await custRef.update({
          totalPurchases: Math.max(0, currentTotal - Number(totalRefund || 0)),
        });
      }
    }

    res.status(201).json({ ...returnRecord, createdAt: toISOString(returnRecord.createdAt) });
  } catch (err) {
    console.error("Sales return error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

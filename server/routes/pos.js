import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

function padNum(n, len = 6) { return String(n).padStart(len, "0"); }

router.get("/stats", async (_req, res) => {
  try {
    const snap = await db.collection("pos_sales").get();
    let totalRevenue = 0, todayRevenue = 0, todayCount = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    snap.forEach((d) => {
      const s = d.data();
      totalRevenue += s.total || 0;
      const ct = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
      if (ct >= today) { todayRevenue += s.total || 0; todayCount++; }
    });
    res.json({ totalRevenue, todayRevenue, todayCount, totalSales: snap.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const snap = await db.collection("pos_sales").orderBy("createdAt", "desc").limit(limit).get();
    const sales = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISOString(d.data().createdAt) }));
    res.json(sales);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { customerId, customerName, items, subtotal, discountAmount, discountPct, total, paymentMethod, cashReceived, changeGiven, notes } = req.body;
    if (!items?.length) return res.status(400).json({ error: "Items are required" });
    if (total === undefined) return res.status(400).json({ error: "Total is required" });
    const id = await nextId("pos_sales");
    const saleNumber = `POS-${padNum(id)}`;
    const sale = {
      id, saleNumber,
      customerId: customerId || null, customerName: customerName || "Walk-in",
      items: items.map((i) => ({ ...i, qty: Number(i.qty), unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) })),
      subtotal: Number(subtotal || 0), discountAmount: Number(discountAmount || 0),
      discountPct: Number(discountPct || 0), total: Number(total),
      paymentMethod: paymentMethod || "cash",
      cashReceived: cashReceived != null ? Number(cashReceived) : null,
      changeGiven: changeGiven != null ? Number(changeGiven) : null,
      notes: notes || null,
      createdBy: req.admin.userId ?? null,
      createdAt: new Date(),
    };
    await db.collection("pos_sales").doc(String(id)).set(sale);
    if (customerId) {
      // Try pos_customers first (consumers); fall back to users (mechanics/retailers)
      const posRef = db.collection("pos_customers").doc(String(customerId));
      const posDoc = await posRef.get();
      if (posDoc.exists) {
        await posRef.update({ totalPurchases: (posDoc.data().totalPurchases || 0) + sale.total, lastPurchaseAt: new Date() });
      } else {
        const userRef = db.collection("users").doc(String(customerId));
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          await userRef.update({ totalPurchases: (userDoc.data().totalPurchases || 0) + sale.total, lastPurchaseAt: new Date() });
        }
      }
    }
    for (const item of items) {
      if (!item.productId) continue;
      const stockSnap = await db.collection("pos_stock").where("productId", "==", Number(item.productId)).limit(1).get();
      if (!stockSnap.empty) {
        const stockRef = stockSnap.docs[0].ref;
        const curr = stockSnap.docs[0].data().quantity || 0;
        await stockRef.update({ quantity: Math.max(0, curr - Number(item.qty)) });
      }
    }
    res.status(201).json({ ...sale, createdAt: toISOString(sale.createdAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

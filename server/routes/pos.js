import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "./admin-auth.js";

const router = Router();
router.use(requireAdmin);

// ── List sales ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    let q = db.collection("pos_sales").orderBy("createdAt", "desc");
    if (req.query.limit) q = q.limit(Number(req.query.limit));
    const snap = await q.get();
    const sales = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISOString(d.data().createdAt) }));
    res.json({ sales, count: sales.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Daily / period stats ──────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [todaySnap, allSnap] = await Promise.all([
      db.collection("pos_sales")
        .where("createdAt", ">=", todayStart)
        .where("createdAt", "<", todayEnd)
        .get(),
      db.collection("pos_sales").get(),
    ]);

    const sumSales = (docs) =>
      docs.reduce((acc, d) => {
        const data = d.data();
        return {
          revenue: acc.revenue + (data.total || 0),
          count: acc.count + 1,
        };
      }, { revenue: 0, count: 0 });

    const today = sumSales(todaySnap.docs);
    const all = sumSales(allSnap.docs);

    // Monthly breakdown (last 6 months)
    const monthMap = {};
    for (const d of allSnap.docs) {
      const data = d.data();
      const dt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { revenue: 0, count: 0 };
      monthMap[key].revenue += data.total || 0;
      monthMap[key].count += 1;
    }
    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, ...v }));

    // Top products
    const productMap = {};
    for (const d of allSnap.docs) {
      for (const item of (d.data().items || [])) {
        const key = item.productName || "Unknown";
        if (!productMap[key]) productMap[key] = { qty: 0, revenue: 0 };
        productMap[key].qty += item.qty || 0;
        productMap[key].revenue += item.lineTotal || 0;
      }
    }
    const topProducts = Object.entries(productMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(([name, v]) => ({ name, ...v }));

    res.json({ today, all, monthly, topProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get single sale ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("pos_sales").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json({ id: doc.id, ...doc.data(), createdAt: toISOString(doc.data().createdAt) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create sale ───────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { customerId, customerName, items, subtotal, discountAmount, discountPct,
            total, paymentMethod, cashReceived, changeGiven, notes } = req.body;

    if (!items?.length) return res.status(400).json({ error: "Items required" });
    if (!total && total !== 0) return res.status(400).json({ error: "Total required" });

    const saleNum = await nextId("pos_sales");
    const saleNumber = `POS-${String(saleNum).padStart(4, "0")}`;

    const docRef = db.collection("pos_sales").doc(String(saleNum));
    const soldBy = req.admin || {};
    const data = {
      id: saleNum, saleNumber,
      customerId: customerId || null,
      customerName: customerName || "Walk-in",
      items: items || [],
      subtotal: subtotal || 0,
      discountAmount: discountAmount || 0,
      discountPct: discountPct || 0,
      total: total || 0,
      paymentMethod: paymentMethod || "cash",
      cashReceived: cashReceived || null,
      changeGiven: changeGiven || null,
      soldById: soldBy.id || null,
      soldByName: soldBy.name || null,
      notes: notes || null,
      createdAt: new Date(),
    };
    await docRef.set(data);

    // Deduct stock
    const batch = db.batch();
    for (const item of items) {
      if (item.productId) {
        const stockRef = db.collection("pos_stock").doc(String(item.productId));
        const stockDoc = await stockRef.get();
        if (stockDoc.exists) {
          const cur = stockDoc.data().quantity || 0;
          batch.update(stockRef, { quantity: Math.max(0, cur - (item.qty || 0)), updatedAt: new Date() });
        }
      }
    }
    await batch.commit();

    // Update customer total purchases
    if (customerId) {
      const custRef = db.collection("pos_customers").doc(String(customerId));
      const custDoc = await custRef.get();
      if (custDoc.exists) {
        await custRef.update({
          totalPurchases: (custDoc.data().totalPurchases || 0) + (total || 0),
          lastPurchaseAt: new Date(),
        });
      }
    }

    res.status(201).json({ id: String(saleNum), ...data, createdAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

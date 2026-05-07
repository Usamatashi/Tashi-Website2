import { Router } from "express";
import { db, toISOString, chunkArray } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

function toNum(v, d = 0) { const n = Number(v); return isNaN(n) ? d : n; }

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

async function fetchPOSSales(fromDate, toDate) {
  const snap = await db.collection("pos_sales").orderBy("createdAt", "desc").get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      const ct = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0);
      return {
        id: d.id,
        type: "pos",
        ref: data.saleNumber || `POS-${d.id}`,
        customer: data.customerName || "Walk-in",
        customerId: data.customerId || null,
        amount: toNum(data.total),
        createdAt: ct,
        paymentMethod: data.paymentMethod || "cash",
        status: null,
        items: (data.items || []).map((i) => ({
          productName: i.productName || "",
          qty: toNum(i.qty),
          unitPrice: toNum(i.unitPrice),
          discountPct: toNum(i.discountPct),
          lineTotal: toNum(i.lineTotal),
          sku: i.sku || "",
          productId: i.productId,
          discountPct_pos: toNum(i.discountPct),
        })),
        raw: data,
      };
    })
    .filter((s) => s.createdAt >= fromDate && s.createdAt <= toDate);
}

async function fetchWholesaleOrders(fromDate, toDate) {
  const snap = await db.collection("orders").get();
  const orders = snap.docs
    .filter((d) => d.data().source !== "website")
    .map((d) => {
      const data = d.data();
      const ct = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0);
      return { docId: d.id, data, createdAt: ct };
    })
    .filter((o) => o.createdAt >= fromDate && o.createdAt <= toDate);

  if (!orders.length) return [];

  const retailerIds = [...new Set(orders.map((o) => o.data.retailerId).filter(Boolean))];
  const userDocs = retailerIds.length
    ? await db.getAll(...retailerIds.map((id) => db.collection("users").doc(String(id))))
    : [];
  const usersMap = new Map();
  userDocs.forEach((d) => { if (d.exists) usersMap.set(parseInt(d.id), d.data()); });

  const numericIds = orders.map((o) => o.data.id).filter((x) => typeof x === "number");
  const itemsMap = {};
  if (numericIds.length) {
    for (const batch of chunkArray(numericIds, 30)) {
      const iSnap = await db.collection("orderItems").where("orderId", "in", batch).get();
      iSnap.forEach((d) => {
        const item = d.data();
        if (!itemsMap[item.orderId]) itemsMap[item.orderId] = [];
        const totalValue = toNum(item.quantity) * toNum(item.unitPrice);
        const discountPct = toNum(item.discountPercent);
        itemsMap[item.orderId].push({
          productName: item.productName || "—",
          qty: toNum(item.quantity),
          unitPrice: toNum(item.unitPrice),
          discountPct,
          lineTotal: Math.round(totalValue * (1 - discountPct / 100)),
          sku: "",
          productId: item.productId,
        });
      });
    }
  }

  return orders.map(({ docId, data: o, createdAt }) => {
    const retailer = usersMap.get(o.retailerId);
    const billDiscountPct = toNum(o.billDiscountPercent);
    let items = itemsMap[o.id] || [];
    if (!items.length && o.productId && o.quantity) {
      const totalValue = toNum(o.quantity) * toNum(o.salesPrice);
      items = [{ productName: o.productName || "—", qty: toNum(o.quantity), unitPrice: toNum(o.salesPrice), discountPct: 0, lineTotal: totalValue, sku: "", productId: o.productId }];
    }
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const amount = Math.round(subtotal * (1 - billDiscountPct / 100));

    return {
      id: docId,
      type: "wholesale",
      ref: `WS-${String(o.id || docId).padStart(6, "0")}`,
      customer: retailer?.name || "Unknown Retailer",
      customerId: String(o.retailerId || ""),
      amount,
      createdAt,
      paymentMethod: "wholesale",
      status: o.status || "pending",
      items,
    };
  });
}

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const fromDate = parseDate(req.query.from) || defaultFrom;
    const toDate = parseDate(req.query.to)
      ? (() => { const d = parseDate(req.query.to); d.setHours(23, 59, 59, 999); return d; })()
      : defaultTo;
    const channel = req.query.channel || "all";
    const customerSearch = req.query.customer ? String(req.query.customer).trim().toLowerCase() : "";
    const productSearch = req.query.product ? String(req.query.product).trim().toLowerCase() : "";

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [rawPOS, rawWS] = await Promise.all([
      channel !== "wholesale" ? fetchPOSSales(fromDate, toDate) : Promise.resolve([]),
      channel !== "pos" ? fetchWholesaleOrders(fromDate, toDate) : Promise.resolve([]),
    ]);

    let allSales = [...rawPOS, ...rawWS].sort((a, b) => b.createdAt - a.createdAt);

    if (customerSearch) {
      allSales = allSales.filter((s) => s.customer.toLowerCase().includes(customerSearch));
    }
    if (productSearch) {
      allSales = allSales.filter((s) =>
        s.items.some((i) => (i.productName || "").toLowerCase().includes(productSearch))
      );
    }

    const totalRevenue = allSales.reduce((s, x) => s + x.amount, 0);
    const posRevenue = allSales.filter((x) => x.type === "pos").reduce((s, x) => s + x.amount, 0);
    const wsRevenue = allSales.filter((x) => x.type === "wholesale").reduce((s, x) => s + x.amount, 0);

    const todayAll = [...rawPOS, ...rawWS].filter((s) => s.createdAt >= todayStart && s.createdAt <= todayEnd);
    const todayRevenue = todayAll.reduce((s, x) => s + x.amount, 0);
    const todayPOSRevenue = todayAll.filter((x) => x.type === "pos").reduce((s, x) => s + x.amount, 0);
    const todayWSRevenue = todayAll.filter((x) => x.type === "wholesale").reduce((s, x) => s + x.amount, 0);

    const chartMap = {};
    for (const s of allSales) {
      const day = s.createdAt.toISOString().slice(0, 10);
      if (!chartMap[day]) chartMap[day] = { date: day, pos: 0, wholesale: 0, total: 0 };
      if (s.type === "pos") chartMap[day].pos += s.amount;
      else chartMap[day].wholesale += s.amount;
      chartMap[day].total += s.amount;
    }
    const chartData = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));

    const productMap = {};
    for (const s of allSales) {
      for (const item of s.items) {
        const name = item.productName || "—";
        if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
        productMap[name].qty += toNum(item.qty);
        productMap[name].revenue += toNum(item.lineTotal);
      }
    }
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    res.json({
      stats: { totalRevenue, posRevenue, wsRevenue, todayRevenue, todayPOSRevenue, todayWSRevenue, totalCount: allSales.length },
      chartData,
      topProducts,
      transactions: allSales.map((s) => ({
        id: s.id,
        type: s.type,
        ref: s.ref,
        customer: s.customer,
        customerId: s.customerId,
        amount: s.amount,
        createdAt: s.createdAt.toISOString(),
        paymentMethod: s.paymentMethod,
        status: s.status,
        itemCount: s.items.length,
        items: s.items,
        raw: s.type === "pos" ? s.raw : undefined,
      })),
    });
  } catch (err) {
    console.error("sales-analytics:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

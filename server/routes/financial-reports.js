import { Router } from "express";
import { db } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

function toNum(v, d = 0) { const n = Number(v); return isNaN(n) ? d : n; }

function endOfDay(str) {
  if (!str) return null;
  const d = new Date(str);
  d.setHours(23, 59, 59, 999);
  return d;
}

function inRange(date, from, to) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to   && date > to)   return false;
  return true;
}

// ── P&L ──────────────────────────────────────────────────────────────────────
router.get("/pl", async (req, res) => {
  try {
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate   = req.query.to   ? endOfDay(req.query.to)  : endOfDay(new Date().toISOString().slice(0, 10));

    const [posSalesSnap, ordersSnap, posReturnsSnap, expensesSnap, purchasesSnap, purReturnSnap, journalSnap, stockSnap] = await Promise.all([
      db.collection("pos_sales").get(),
      db.collection("orders").get(),
      db.collection("pos_returns").get(),
      db.collection("expenses").get(),
      db.collection("purchases").get(),
      db.collection("purchase_returns").get(),
      db.collection("journal_entries").where("status", "==", "posted").get(),
      db.collection("pos_stock").get(),
    ]);

    // Revenue
    let posRevenue = 0;
    for (const d of posSalesSnap.docs) {
      const s = d.data();
      const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
      if (inRange(date, fromDate, toDate)) posRevenue += toNum(s.total);
    }

    let wsRevenue = 0;
    for (const d of ordersSnap.docs) {
      const o = d.data();
      if (o.source === "website") continue;
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
      if (inRange(date, fromDate, toDate)) wsRevenue += toNum(o.total || o.subtotal);
    }

    let salesReturns = 0;
    for (const d of posReturnsSnap.docs) {
      const r = d.data();
      const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
      if (inRange(date, fromDate, toDate)) salesReturns += toNum(r.totalRefund);
    }

    // Build cost-price lookup from stock: productId → costPrice
    const costByProductId = {};
    stockSnap.forEach((d) => {
      const s = d.data();
      if (s.productId != null) costByProductId[String(s.productId)] = toNum(s.costPrice || 0);
    });

    // COGS (accrual basis) — cost of goods ACTUALLY SOLD in the period
    // Dr COGS / Cr Inventory: recognised when the sale occurs, not when purchased
    let cogs = 0;
    for (const d of posSalesSnap.docs) {
      const s = d.data();
      const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
      if (!inRange(date, fromDate, toDate)) continue;
      for (const item of (s.items || [])) {
        const cost = costByProductId[String(item.productId ?? "")] || 0;
        cogs += toNum(item.qty) * cost;
      }
    }

    // Cost of goods returned by customers (reverses COGS, restores inventory)
    let cogsReturned = 0;
    for (const d of posReturnsSnap.docs) {
      const r = d.data();
      const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
      if (!inRange(date, fromDate, toDate)) continue;
      for (const item of (r.items || [])) {
        const cost = costByProductId[String(item.productId ?? "")] || 0;
        cogsReturned += toNum(item.qty || item.quantity) * cost;
      }
    }

    // Purchases add to Inventory (asset) — listed separately for transparency
    let purchasesInPeriod = 0;
    for (const d of purchasesSnap.docs) {
      const p = d.data();
      const date = p.date ? new Date(p.date) : null;
      if (inRange(date, fromDate, toDate)) purchasesInPeriod += toNum(p.totalAmount);
    }
    let purchaseReturns = 0;
    for (const d of purReturnSnap.docs) {
      const r = d.data();
      const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
      if (inRange(date, fromDate, toDate)) purchaseReturns += toNum(r.totalReturn);
    }

    // Expenses by category
    const expenseByCategory = {};
    let totalExpenses = 0;
    for (const d of expensesSnap.docs) {
      const e = d.data();
      const date = e.date ? new Date(e.date) : null;
      if (!inRange(date, fromDate, toDate)) continue;
      const cat = e.category || "General";
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + toNum(e.amount);
      totalExpenses += toNum(e.amount);
    }

    // Journal revenue/expense lines
    let journalRevenue = 0, journalExpenses = 0;
    for (const d of journalSnap.docs) {
      const j = d.data();
      const date = j.date ? new Date(j.date) : null;
      if (!inRange(date, fromDate, toDate)) continue;
      for (const line of (j.lines || [])) {
        const code = line.accountCode || "";
        const codeNum = parseInt(code);
        if (codeNum >= 4000 && codeNum < 5000) {
          journalRevenue += (line.credit - line.debit);
        }
        if (codeNum >= 5000) {
          journalExpenses += (line.debit - line.credit);
        }
      }
    }

    const grossRevenue = posRevenue + wsRevenue;
    const netRevenue   = grossRevenue - salesReturns;
    // Net COGS = cost of goods sold − cost of goods returned by customers
    const netCOGS      = Math.max(0, cogs - cogsReturned);
    const grossProfit  = netRevenue - netCOGS;
    const totalOpEx    = totalExpenses + Math.max(0, journalExpenses);
    const netProfit    = grossProfit - totalOpEx + journalRevenue;

    res.json({
      period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      revenue: {
        posRevenue,
        wsRevenue,
        grossRevenue,
        salesReturns,
        netRevenue,
        journalRevenue,
      },
      cogs: {
        costOfGoodsSold: cogs,
        costOfGoodsReturned: cogsReturned,
        netCOGS,
        // Purchases in period shown separately (they go to Inventory, not COGS directly)
        purchasesInPeriod,
        purchaseReturns,
      },
      grossProfit,
      expenses: {
        byCategory: expenseByCategory,
        total: totalExpenses,
        journalExpenses: Math.max(0, journalExpenses),
        totalOpEx,
      },
      netProfit,
    });
  } catch (err) {
    console.error("financial-reports/pl:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Balance Sheet ─────────────────────────────────────────────────────────────
router.get("/balance-sheet", async (req, res) => {
  try {
    const asOf = req.query.date ? endOfDay(req.query.date) : endOfDay(new Date().toISOString().slice(0, 10));

    const [posSalesSnap, posReturnsSnap, expensesSnap, purchasesSnap, purReturnSnap, journalSnap, stockSnap, ordersSnap] = await Promise.all([
      db.collection("pos_sales").get(),
      db.collection("pos_returns").get(),
      db.collection("expenses").get(),
      db.collection("purchases").get(),
      db.collection("purchase_returns").get(),
      db.collection("journal_entries").where("status", "==", "posted").get(),
      db.collection("pos_stock").get(),
      db.collection("orders").get(),
    ]);

    // Cash (net of all transactions up to asOf)
    let cash = 0;
    for (const d of posSalesSnap.docs) {
      const s = d.data();
      const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt || 0);
      if (date <= asOf) cash += toNum(s.total);
    }
    for (const d of posReturnsSnap.docs) {
      const r = d.data();
      const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || 0);
      if (date <= asOf) cash -= toNum(r.totalRefund);
    }
    for (const d of expensesSnap.docs) {
      const e = d.data();
      if (e.isCredit) continue;
      const date = e.date ? new Date(e.date) : null;
      if (date && date <= asOf) cash -= toNum(e.amount);
    }
    for (const d of purchasesSnap.docs) {
      const p = d.data();
      const date = p.date ? new Date(p.date) : null;
      if (date && date <= asOf) cash -= toNum(p.amountPaid);
    }

    // Inventory value (from stock)
    let inventoryValue = 0;
    stockSnap.forEach((d) => {
      const s = d.data();
      inventoryValue += toNum(s.quantity) * toNum(s.costPrice || s.price || 0);
    });

    // Accounts Payable (unpaid/partial purchases)
    let accountsPayable = 0;
    for (const d of purchasesSnap.docs) {
      const p = d.data();
      const date = p.date ? new Date(p.date) : null;
      if (!date || date > asOf) continue;
      const outstanding = toNum(p.totalAmount) - toNum(p.amountPaid);
      if (outstanding > 0) accountsPayable += outstanding;
    }

    // Credit expenses payable
    let creditExpensesPayable = 0;
    for (const d of expensesSnap.docs) {
      const e = d.data();
      if (!e.isCredit) continue;
      const date = e.date ? new Date(e.date) : null;
      if (date && date <= asOf) creditExpensesPayable += toNum(e.amount);
    }

    // Accounts Receivable (wholesale orders not marked delivered)
    let accountsReceivable = 0;
    for (const d of ordersSnap.docs) {
      const o = d.data();
      if (o.source === "website") continue;
      if (o.status === "delivered" || o.status === "cancelled") continue;
      const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
      if (date <= asOf) accountsReceivable += toNum(o.total || o.subtotal);
    }

    // Journal adjustments for asset/liability accounts
    let journalCashAdj = 0, journalARAdj = 0, journalAPAdj = 0, journalEquityAdj = 0;
    for (const d of journalSnap.docs) {
      const j = d.data();
      const date = j.date ? new Date(j.date) : null;
      if (!date || date > asOf) continue;
      for (const line of (j.lines || [])) {
        const code = line.accountCode || "";
        const codeNum = parseInt(code);
        const net = (line.debit || 0) - (line.credit || 0);
        if (code === "1000" || code === "1010") journalCashAdj += net;
        if (codeNum === 1100) journalARAdj += net;
        if (codeNum === 2000) journalAPAdj += net;
        if (codeNum >= 3000 && codeNum < 4000) journalEquityAdj += net;
      }
    }

    const totalCash = Math.max(0, cash + journalCashAdj);
    const totalAR   = Math.max(0, accountsReceivable + journalARAdj);
    const totalAP   = Math.max(0, accountsPayable - journalAPAdj);

    const totalCurrentAssets    = totalCash + totalAR + inventoryValue;
    const totalAssets            = totalCurrentAssets;
    const totalCurrentLiabilities = totalAP + creditExpensesPayable;
    const totalLiabilities       = totalCurrentLiabilities;
    const equity                 = totalAssets - totalLiabilities + journalEquityAdj;

    res.json({
      asOf: asOf.toISOString().slice(0, 10),
      assets: {
        current: {
          cash: totalCash,
          accountsReceivable: totalAR,
          inventory: inventoryValue,
          total: totalCurrentAssets,
        },
        total: totalAssets,
      },
      liabilities: {
        current: {
          accountsPayable: totalAP,
          creditExpenses: creditExpensesPayable,
          total: totalCurrentLiabilities,
        },
        total: totalLiabilities,
      },
      equity: {
        retainedEarnings: equity,
        total: equity,
      },
      checkBalance: Math.abs(totalAssets - (totalLiabilities + equity)) < 1,
    });
  } catch (err) {
    console.error("financial-reports/balance-sheet:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Trial Balance ─────────────────────────────────────────────────────────────
router.get("/trial-balance", async (req, res) => {
  try {
    const asOf = req.query.date ? endOfDay(req.query.date) : endOfDay(new Date().toISOString().slice(0, 10));

    const [accountsSnap, journalSnap] = await Promise.all([
      db.collection("accounts").orderBy("code").get(),
      db.collection("journal_entries").where("status", "==", "posted").get(),
    ]);

    const balances = {};
    accountsSnap.forEach((d) => {
      balances[d.id] = { id: d.id, code: d.data().code, name: d.data().name, type: d.data().type, debit: 0, credit: 0 };
    });

    for (const d of journalSnap.docs) {
      const j = d.data();
      const date = j.date ? new Date(j.date) : null;
      if (!date || date > asOf) continue;
      for (const line of (j.lines || [])) {
        if (balances[line.accountId]) {
          balances[line.accountId].debit  += toNum(line.debit);
          balances[line.accountId].credit += toNum(line.credit);
        }
      }
    }

    const rows = Object.values(balances).filter((b) => b.debit > 0 || b.credit > 0);
    const totalDebit  = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    res.json({
      asOf: asOf.toISOString().slice(0, 10),
      rows,
      totalDebit,
      totalCredit,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    });
  } catch (err) {
    console.error("financial-reports/trial-balance:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

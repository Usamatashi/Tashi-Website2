import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash in Hand",        type: "asset",     subtype: "current_asset",   parentCode: null },
  { code: "1010", name: "Bank Account",         type: "asset",     subtype: "current_asset",   parentCode: null },
  { code: "1100", name: "Accounts Receivable",  type: "asset",     subtype: "current_asset",   parentCode: null },
  { code: "1200", name: "Inventory",            type: "asset",     subtype: "current_asset",   parentCode: null },
  { code: "1300", name: "Prepaid Expenses",     type: "asset",     subtype: "current_asset",   parentCode: null },
  { code: "1500", name: "Fixed Assets",         type: "asset",     subtype: "non_current_asset", parentCode: null },
  { code: "1510", name: "Accumulated Depreciation", type: "asset", subtype: "non_current_asset", parentCode: null },
  { code: "2000", name: "Accounts Payable",     type: "liability", subtype: "current_liability", parentCode: null },
  { code: "2100", name: "Short-term Loans",     type: "liability", subtype: "current_liability", parentCode: null },
  { code: "2200", name: "Accrued Expenses",     type: "liability", subtype: "current_liability", parentCode: null },
  { code: "2500", name: "Long-term Loans",      type: "liability", subtype: "non_current_liability", parentCode: null },
  { code: "3000", name: "Owner's Capital",      type: "equity",    subtype: "equity",           parentCode: null },
  { code: "3100", name: "Retained Earnings",    type: "equity",    subtype: "equity",           parentCode: null },
  { code: "3200", name: "Drawings",             type: "equity",    subtype: "equity",           parentCode: null },
  { code: "4000", name: "Sales Revenue (POS)",  type: "revenue",   subtype: "operating_revenue", parentCode: null },
  { code: "4100", name: "Wholesale Revenue",    type: "revenue",   subtype: "operating_revenue", parentCode: null },
  { code: "4200", name: "Other Income",         type: "revenue",   subtype: "other_revenue",    parentCode: null },
  { code: "4900", name: "Sales Returns",        type: "revenue",   subtype: "contra_revenue",   parentCode: null },
  { code: "5000", name: "Cost of Goods Sold",   type: "expense",   subtype: "cogs",             parentCode: null },
  { code: "5100", name: "Salaries & Wages",     type: "expense",   subtype: "operating_expense", parentCode: null },
  { code: "5200", name: "Rent Expense",         type: "expense",   subtype: "operating_expense", parentCode: null },
  { code: "5300", name: "Utilities Expense",    type: "expense",   subtype: "operating_expense", parentCode: null },
  { code: "5400", name: "Transport Expense",    type: "expense",   subtype: "operating_expense", parentCode: null },
  { code: "5500", name: "Marketing Expense",    type: "expense",   subtype: "operating_expense", parentCode: null },
  { code: "5600", name: "Depreciation Expense", type: "expense",   subtype: "operating_expense", parentCode: null },
  { code: "5700", name: "Bank Charges",         type: "expense",   subtype: "operating_expense", parentCode: null },
  { code: "5900", name: "General Expenses",     type: "expense",   subtype: "operating_expense", parentCode: null },
];

router.get("/", async (_req, res) => {
  try {
    const snap = await db.collection("accounts").orderBy("code").get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISOString(d.data().createdAt) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/seed", async (_req, res) => {
  try {
    const snap = await db.collection("accounts").limit(1).get();
    if (!snap.empty) return res.json({ message: "Already seeded", count: 0 });
    const batch = db.batch();
    for (const a of DEFAULT_ACCOUNTS) {
      const id = await nextId("accounts");
      const ref = db.collection("accounts").doc(String(id));
      batch.set(ref, { ...a, id: String(id), isActive: true, description: "", createdAt: new Date() });
    }
    await batch.commit();
    const all = await db.collection("accounts").orderBy("code").get();
    res.json({ message: "Seeded", count: DEFAULT_ACCOUNTS.length, accounts: all.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISOString(d.data().createdAt) })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { code, name, type, subtype, parentId, description } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: "Account code is required" });
    if (!name?.trim()) return res.status(400).json({ error: "Account name is required" });
    if (!type) return res.status(400).json({ error: "Account type is required" });
    const dup = await db.collection("accounts").where("code", "==", code.trim()).limit(1).get();
    if (!dup.empty) return res.status(400).json({ error: "Account code already exists" });
    const id = await nextId("accounts");
    const account = { id: String(id), code: code.trim(), name: name.trim(), type, subtype: subtype || "", parentId: parentId || null, description: description || "", isActive: true, createdAt: new Date() };
    await db.collection("accounts").doc(String(id)).set(account);
    res.status(201).json({ ...account, createdAt: toISOString(account.createdAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const ref = db.collection("accounts").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Account not found" });
    const { code, name, type, subtype, parentId, description, isActive } = req.body;
    if (code && code !== doc.data().code) {
      const dup = await db.collection("accounts").where("code", "==", code.trim()).limit(1).get();
      if (!dup.empty) return res.status(400).json({ error: "Account code already exists" });
    }
    const updates = {};
    if (code !== undefined) updates.code = code.trim();
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if (subtype !== undefined) updates.subtype = subtype;
    if (parentId !== undefined) updates.parentId = parentId || null;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;
    await ref.update(updates);
    const updated = { ...doc.data(), ...updates };
    res.json({ id: doc.id, ...updated, createdAt: toISOString(updated.createdAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = db.collection("accounts").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Account not found" });
    const used = await db.collection("journal_lines").where("accountId", "==", req.params.id).limit(1).get();
    if (!used.empty) return res.status(400).json({ error: "Cannot delete: account has journal entries" });
    await ref.delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

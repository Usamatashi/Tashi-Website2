import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

function toNum(v, d = 0) { const n = Number(v); return isNaN(n) ? d : n; }
function sanitize(v, max = 500) { if (typeof v !== "string") return ""; return v.trim().slice(0, max); }
function padNum(n, len = 6) { return String(n).padStart(len, "0"); }

const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Marketing", "Office Supplies",
  "Travel", "Maintenance", "Insurance", "Miscellaneous", "Other",
];

router.get("/categories", (_req, res) => res.json(EXPENSE_CATEGORIES));

router.get("/", async (req, res) => {
  try {
    let snap;
    try { snap = await db.collection("expenses").orderBy("date", "desc").get(); }
    catch { snap = await db.collection("expenses").get(); }
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISOString(d.data().createdAt) }));
    if (req.query.from) items = items.filter((e) => e.date >= req.query.from);
    if (req.query.to) items = items.filter((e) => e.date <= req.query.to);
    if (req.query.category) items = items.filter((e) => e.category === req.query.category);
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { category, amount, description, date, supplierId, supplierName, paymentMethod, notes } = req.body;
    if (!sanitize(category)) return res.status(400).json({ error: "Category is required" });
    if (!amount || toNum(amount) <= 0) return res.status(400).json({ error: "Amount must be positive" });
    if (!sanitize(date)) return res.status(400).json({ error: "Date is required" });
    const id = await nextId("expenses");
    const expenseNumber = `EXP-${padNum(id)}`;
    const doc = {
      id, expenseNumber,
      category: sanitize(category, 100),
      amount: toNum(amount),
      description: sanitize(description, 1000),
      date: sanitize(date, 20),
      supplierId: supplierId ? String(supplierId) : null,
      supplierName: sanitize(supplierName, 200),
      paymentMethod: sanitize(paymentMethod, 50) || "cash",
      notes: sanitize(notes, 1000),
      recordedBy: req.admin?.userId ?? null,
      createdAt: new Date(),
    };
    await db.collection("expenses").doc(String(id)).set(doc);
    res.status(201).json({ ...doc, createdAt: toISOString(doc.createdAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const ref = db.collection("expenses").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Expense not found" });
    const { category, amount, description, date, supplierId, supplierName, paymentMethod, notes } = req.body;
    const update = {};
    if (category !== undefined) update.category = sanitize(category, 100);
    if (amount !== undefined) update.amount = toNum(amount);
    if (description !== undefined) update.description = sanitize(description, 1000);
    if (date !== undefined) update.date = sanitize(date, 20);
    if (supplierId !== undefined) update.supplierId = supplierId ? String(supplierId) : null;
    if (supplierName !== undefined) update.supplierName = sanitize(supplierName, 200);
    if (paymentMethod !== undefined) update.paymentMethod = sanitize(paymentMethod, 50);
    if (notes !== undefined) update.notes = sanitize(notes, 1000);
    await ref.update(update);
    const d = (await ref.get()).data();
    res.json({ id: req.params.id, ...d, createdAt: toISOString(d.createdAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = db.collection("expenses").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Expense not found" });
    await ref.delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

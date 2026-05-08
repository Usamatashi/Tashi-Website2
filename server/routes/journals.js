import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

function serializeEntry(id, data) {
  return {
    id,
    ...data,
    createdAt: toISOString(data.createdAt),
    postedAt: toISOString(data.postedAt),
    voidedAt: toISOString(data.voidedAt),
  };
}

router.get("/", async (req, res) => {
  try {
    const { from, to, status } = req.query;
    let q = db.collection("journal_entries").orderBy("date", "desc");
    if (status) q = q.where("status", "==", status);
    const snap = await q.get();
    let entries = snap.docs.map((d) => serializeEntry(d.id, d.data()));
    if (from) entries = entries.filter((e) => e.date >= from);
    if (to)   entries = entries.filter((e) => e.date <= to);
    res.json(entries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("journal_entries").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Entry not found" });
    res.json(serializeEntry(doc.id, doc.data()));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { date, description, reference, lines } = req.body;
    if (!date) return res.status(400).json({ error: "Date is required" });
    if (!lines?.length || lines.length < 2) return res.status(400).json({ error: "At least 2 lines required" });
    const totalDebit  = lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) return res.status(400).json({ error: `Entry not balanced — debits (${totalDebit}) ≠ credits (${totalCredit})` });
    if (totalDebit === 0) return res.status(400).json({ error: "Entry amounts cannot be zero" });
    const id = await nextId("journal_entries");
    const ref = `JV-${String(id).padStart(6, "0")}`;
    const entry = {
      id: String(id), reference: reference || ref, date, description: description || "",
      lines: lines.map((l) => ({
        accountId: l.accountId, accountCode: l.accountCode || "", accountName: l.accountName || "",
        debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || "",
      })),
      totalDebit, totalCredit,
      status: "draft",
      createdAt: new Date(), createdBy: req.admin?.userId ?? null,
      postedAt: null, postedBy: null,
      voidedAt: null, voidedBy: null, voidReason: null,
    };
    await db.collection("journal_entries").doc(String(id)).set(entry);
    res.status(201).json(serializeEntry(String(id), entry));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id/post", async (req, res) => {
  try {
    const ref = db.collection("journal_entries").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Entry not found" });
    if (doc.data().status !== "draft") return res.status(400).json({ error: "Only draft entries can be posted" });
    await ref.update({ status: "posted", postedAt: new Date(), postedBy: req.admin?.userId ?? null });
    res.json(serializeEntry(doc.id, { ...doc.data(), status: "posted", postedAt: new Date(), postedBy: req.admin?.userId ?? null }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id/void", async (req, res) => {
  try {
    const ref = db.collection("journal_entries").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Entry not found" });
    if (doc.data().status === "void") return res.status(400).json({ error: "Entry is already void" });
    const { reason } = req.body;
    await ref.update({ status: "void", voidedAt: new Date(), voidedBy: req.admin?.userId ?? null, voidReason: reason || "" });
    res.json(serializeEntry(doc.id, { ...doc.data(), status: "void", voidedAt: new Date(), voidedBy: req.admin?.userId ?? null, voidReason: reason || "" }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const ref = db.collection("journal_entries").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Entry not found" });
    if (doc.data().status !== "draft") return res.status(400).json({ error: "Only draft entries can be edited" });
    const { date, description, reference, lines } = req.body;
    if (lines) {
      const totalDebit  = lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0);
      const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) return res.status(400).json({ error: `Entry not balanced — debits ≠ credits` });
    }
    const updates = {};
    if (date !== undefined) updates.date = date;
    if (description !== undefined) updates.description = description;
    if (reference !== undefined) updates.reference = reference;
    if (lines !== undefined) {
      updates.lines = lines.map((l) => ({
        accountId: l.accountId, accountCode: l.accountCode || "", accountName: l.accountName || "",
        debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || "",
      }));
      updates.totalDebit  = updates.lines.reduce((s, l) => s + l.debit,  0);
      updates.totalCredit = updates.lines.reduce((s, l) => s + l.credit, 0);
    }
    await ref.update(updates);
    const updated = { ...doc.data(), ...updates };
    res.json(serializeEntry(doc.id, updated));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = db.collection("journal_entries").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Entry not found" });
    if (doc.data().status === "posted") return res.status(400).json({ error: "Posted entries cannot be deleted — void them instead" });
    await ref.delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

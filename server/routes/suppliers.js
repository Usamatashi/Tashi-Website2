import { Router } from "express";
import { db, toISOString, nextId } from "../lib/firebase.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

function sanitize(v, max = 500) { if (typeof v !== "string") return ""; return v.trim().slice(0, max); }

router.get("/", async (_req, res) => {
  try {
    let snap;
    try { snap = await db.collection("suppliers").orderBy("createdAt", "desc").get(); }
    catch { snap = await db.collection("suppliers").get(); }
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISOString(d.data().createdAt) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, phone, email, address, city, notes } = req.body;
    if (!sanitize(name)) return res.status(400).json({ error: "Name is required" });
    const id = await nextId("suppliers");
    const doc = {
      id, name: sanitize(name, 200), phone: sanitize(phone, 40),
      email: sanitize(email, 200), address: sanitize(address, 500),
      city: sanitize(city, 100), notes: sanitize(notes, 1000),
      createdAt: new Date(),
    };
    await db.collection("suppliers").doc(String(id)).set(doc);
    res.status(201).json({ ...doc, createdAt: toISOString(doc.createdAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  try {
    const ref = db.collection("suppliers").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Supplier not found" });
    const { name, phone, email, address, city, notes } = req.body;
    const update = {};
    if (name !== undefined) update.name = sanitize(name, 200);
    if (phone !== undefined) update.phone = sanitize(phone, 40);
    if (email !== undefined) update.email = sanitize(email, 200);
    if (address !== undefined) update.address = sanitize(address, 500);
    if (city !== undefined) update.city = sanitize(city, 100);
    if (notes !== undefined) update.notes = sanitize(notes, 1000);
    await ref.update(update);
    const d = (await ref.get()).data();
    res.json({ id: req.params.id, ...d, createdAt: toISOString(d.createdAt) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = db.collection("suppliers").doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: "Supplier not found" });
    await ref.delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;

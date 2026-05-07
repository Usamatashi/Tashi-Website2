import { useEffect, useState } from "react";
import { Truck, Plus, Pencil, Trash2, Phone, Mail, MapPin } from "lucide-react";
import {
  adminListSuppliers, adminCreateSupplier, adminUpdateSupplier, adminDeleteSupplier,
  type Supplier,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty, Modal, Btn, Field, ErrorBanner } from "@/components/admin/ui";

type Form = { name: string; phone: string; email: string; address: string; city: string; notes: string };
const emptyForm = (): Form => ({ name: "", phone: "", email: "", address: "", city: "", notes: "" });

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminListSuppliers().then(setSuppliers).finally(() => setLoading(false));
  }, []);

  function openCreate() { setEditItem(null); setForm(emptyForm()); setErr(null); setShowForm(true); }
  function openEdit(s: Supplier) {
    setEditItem(s);
    setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", city: s.city || "", notes: s.notes || "" });
    setErr(null);
    setShowForm(true);
  }

  async function handleSave() {
    setErr(null);
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setSaving(true);
    try {
      if (editItem) {
        const updated = await adminUpdateSupplier(editItem.id, form);
        setSuppliers((s) => s.map((x) => x.id === editItem.id ? updated : x));
      } else {
        const created = await adminCreateSupplier(form);
        setSuppliers((s) => [created, ...s]);
      }
      setShowForm(false);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    await adminDeleteSupplier(s.id);
    setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
  }

  if (loading) return <PageShell><Loading /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} supplier${suppliers.length !== 1 ? "s" : ""}`}
        actions={<Btn onClick={openCreate}><Plus className="h-4 w-4" />Add Supplier</Btn>} />

      {suppliers.length === 0 ? (
        <Empty icon={Truck} title="No suppliers yet" hint='Click "Add Supplier" to get started.' />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 flex-shrink-0">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(s)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-ink-900">{s.name}</div>
                <div className="mt-2 space-y-1">
                  {s.phone && <div className="flex items-center gap-1.5 text-xs text-ink-500"><Phone className="h-3 w-3" />{s.phone}</div>}
                  {s.email && <div className="flex items-center gap-1.5 text-xs text-ink-500"><Mail className="h-3 w-3" />{s.email}</div>}
                  {(s.city || s.address) && <div className="flex items-center gap-1.5 text-xs text-ink-500"><MapPin className="h-3 w-3" />{[s.city, s.address].filter(Boolean).join(", ")}</div>}
                </div>
                {s.notes && <p className="mt-2 text-xs text-ink-400 italic">{s.notes}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? "Edit Supplier" : "Add Supplier"}
        footer={<><Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn><Btn onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn></>}>
        <div className="space-y-4">
          <ErrorBanner message={err} />
          <Field label="Supplier Name *">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Company or person name"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 xxx"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="supplier@email.com"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Karachi"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </Field>
            <Field label="Address">
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address"
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notes"
              className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          </Field>
        </div>
      </Modal>
    </PageShell>
  );
}

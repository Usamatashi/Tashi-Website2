import { useEffect, useState } from "react";
import { Users, Plus, Edit2, Trash2, Search, Phone, MapPin, ShoppingBag } from "lucide-react";
import {
  adminListPOSCustomers, adminCreatePOSCustomer, adminUpdatePOSCustomer,
  adminDeletePOSCustomer, formatPrice, formatDate, type POSCustomer,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty, Modal, Btn, Field, ErrorBanner } from "@/components/admin/ui";

export default function AdminPOSCustomers() {
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<POSCustomer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setCustomers(await adminListPOSCustomers()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", city: "", address: "" });
    setErr(null);
    setShowForm(true);
  }

  function openEdit(c: POSCustomer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", city: c.city || "", address: c.address || "" });
    setErr(null);
    setShowForm(true);
  }

  async function handleSave() {
    setErr(null); setSaving(true);
    try {
      if (!form.name.trim()) { setErr("Name is required"); return; }
      if (editing) await adminUpdatePOSCustomer(editing.id, form);
      else await adminCreatePOSCustomer(form);
      await load();
      setShowForm(false);
    } catch (e: unknown) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return;
    await adminDeletePOSCustomer(id);
    setCustomers((p) => p.filter((c) => c.id !== id));
  }

  const filtered = customers.filter(
    (c) =>
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.city?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <PageShell><Loading /></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title="POS Customers"
        subtitle="Manage your retail customer database."
        actions={
          <Btn onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Customer
          </Btn>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Customers</div>
          <div className="mt-2 font-display text-2xl font-bold text-ink-900">{customers.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Revenue</div>
          <div className="mt-2 font-display text-2xl font-bold text-ink-900">
            {formatPrice(customers.reduce((a, c) => a + (c.totalPurchases || 0), 0))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Top Customer</div>
          <div className="mt-2 font-display text-lg font-bold text-ink-900 truncate">
            {customers.sort((a, b) => b.totalPurchases - a.totalPurchases)[0]?.name || "—"}
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-ink-200 px-5 py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="w-full rounded-md border border-ink-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Search name, phone or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty icon={Users} title="No customers yet" hint='Add your first customer to get started.' />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3 text-right">Total Purchases</th>
                  <th className="px-4 py-3">Last Purchase</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-ink-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-ink-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {c.phone ? (
                        <span className="flex items-center gap-1 text-ink-600">
                          <Phone className="h-3 w-3" />{c.phone}
                        </span>
                      ) : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.city ? (
                        <span className="flex items-center gap-1 text-ink-600">
                          <MapPin className="h-3 w-3" />{c.city}
                        </span>
                      ) : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 font-semibold text-ink-900">
                        <ShoppingBag className="h-3.5 w-3.5 text-brand-400" />
                        {formatPrice(c.totalPurchases || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{formatDate(c.lastPurchaseAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="rounded-md p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Customer" : "Add Customer"}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Create"}</Btn>
          </>
        }
      >
        <ErrorBanner message={err} />
        <div className="space-y-4">
          <Field label="Full name *">
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Customer name"
            />
          </Field>
          <Field label="Phone">
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="03xx-xxxxxxx"
            />
          </Field>
          <Field label="City">
            <input
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              placeholder="City"
            />
          </Field>
          <Field label="Address">
            <textarea
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              rows={2}
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Optional address"
            />
          </Field>
        </div>
      </Modal>
    </PageShell>
  );
}

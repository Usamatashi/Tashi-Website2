import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown, Package } from "lucide-react";
import {
  adminListProducts, adminListStock, adminCreateStock, adminUpdateStock,
  adminAdjustStock, adminDeleteStock,
  formatPrice, formatDate,
  type AdminProduct, type StockItem,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty, Modal, Btn, Field, ErrorBanner } from "@/components/admin/ui";

export default function AdminStock() {
  const [products, setProducts]   = useState<AdminProduct[]>([]);
  const [stock, setStock]         = useState<StockItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState<string | null>(null);

  const [showAdd, setShowAdd]     = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [selected, setSelected]  = useState<StockItem | null>(null);

  const [addForm, setAddForm]     = useState({ productId: "", quantity: "0", minQuantity: "5", costPrice: "", sellingPrice: "" });
  const [editForm, setEditForm]   = useState({ quantity: "0", minQuantity: "5", costPrice: "", sellingPrice: "" });
  const [adjustForm, setAdjustForm] = useState({ adjustment: "", reason: "" });
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [prods, stk] = await Promise.all([adminListProducts(), adminListStock()]);
      setProducts(prods);
      setStock(stk);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const stockedIds = new Set(stock.map((s) => s.productId));
  const unstockedProducts = products.filter((p) => !stockedIds.has(p.id));

  function openAdd() {
    setAddForm({ productId: "", quantity: "0", minQuantity: "5", costPrice: "", sellingPrice: "" });
    setFormErr(null); setShowAdd(true);
  }
  function openEdit(item: StockItem) {
    setSelected(item);
    setEditForm({ quantity: String(item.quantity), minQuantity: String(item.minQuantity), costPrice: item.costPrice ? String(item.costPrice) : "", sellingPrice: item.sellingPrice ? String(item.sellingPrice) : "" });
    setFormErr(null); setShowEdit(true);
  }
  function openAdjust(item: StockItem) {
    setSelected(item); setAdjustForm({ adjustment: "", reason: "" }); setFormErr(null); setShowAdjust(true);
  }

  async function handleAdd() {
    setFormErr(null); setSaving(true);
    try {
      const p = products.find((x) => x.id === Number(addForm.productId));
      if (!p) { setFormErr("Select a product"); setSaving(false); return; }
      const item = await adminCreateStock({
        productId: p.id, productName: p.name, sku: p.productNumber || undefined,
        quantity: Number(addForm.quantity), minQuantity: Number(addForm.minQuantity),
        costPrice: addForm.costPrice ? Number(addForm.costPrice) : undefined,
        sellingPrice: addForm.sellingPrice ? Number(addForm.sellingPrice) : undefined,
      });
      setStock((prev) => [...prev, item].sort((a, b) => a.productName.localeCompare(b.productName)));
      setShowAdd(false);
    } catch (e: unknown) { setFormErr((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!selected) return;
    setFormErr(null); setSaving(true);
    try {
      const updated = await adminUpdateStock(selected.id, {
        quantity: Number(editForm.quantity), minQuantity: Number(editForm.minQuantity),
        costPrice: editForm.costPrice ? Number(editForm.costPrice) : undefined,
        sellingPrice: editForm.sellingPrice ? Number(editForm.sellingPrice) : undefined,
      });
      setStock((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setShowEdit(false);
    } catch (e: unknown) { setFormErr((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleAdjust() {
    if (!selected || !adjustForm.adjustment) return;
    setFormErr(null); setSaving(true);
    try {
      const updated = await adminAdjustStock(selected.id, Number(adjustForm.adjustment), adjustForm.reason || undefined);
      setStock((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      setShowAdjust(false);
    } catch (e: unknown) { setFormErr((e as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this stock entry?")) return;
    await adminDeleteStock(id);
    setStock((prev) => prev.filter((s) => s.id !== id));
  }

  const lowStock = stock.filter((s) => s.quantity <= s.minQuantity);
  const totalValue = stock.reduce((a, s) => a + (s.quantity * (s.costPrice || 0)), 0);

  if (loading) return <PageShell><Loading /></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title="Stock Management"
        subtitle={`${stock.length} products tracked · ${lowStock.length} low stock`}
        actions={<Btn onClick={openAdd}><Plus className="h-4 w-4" /> Add Product</Btn>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Items</div>
          <div className="mt-2 font-display text-2xl font-bold text-ink-900">{stock.length}</div>
        </div>
        <div className={`rounded-2xl border p-5 shadow-sm ${lowStock.length ? "border-amber-200 bg-amber-50" : "border-ink-200 bg-white"}`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-amber-700">{lowStock.length}</div>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Stock Value</div>
          <div className="mt-2 font-display text-2xl font-bold text-ink-900">{formatPrice(totalValue)}</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Low stock:</strong> {lowStock.map((s) => s.productName).join(", ")}
        </div>
      )}

      <Card>
        {stock.length === 0 ? (
          <Empty icon={Package} title="No stock entries" hint='Click "Add Product" to start tracking inventory.' />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-center">Min Qty</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {stock.map((item) => {
                  const isLow = item.quantity <= item.minQuantity;
                  return (
                    <tr key={item.id} className={`transition-colors hover:bg-ink-50 ${isLow ? "bg-amber-50/40" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink-800">{item.productName}</div>
                        {item.sku && <div className="font-mono text-[11px] text-ink-400">{item.sku}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.quantity === 0 ? "bg-red-100 text-red-700" : isLow ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-ink-500">{item.minQuantity}</td>
                      <td className="px-4 py-3 text-right text-ink-600">{item.costPrice ? formatPrice(item.costPrice) : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink-900">{item.sellingPrice ? formatPrice(item.sellingPrice) : "—"}</td>
                      <td className="px-4 py-3 text-ink-400 text-xs">{formatDate(item.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openAdjust(item)} title="Adjust qty" className="rounded-md p-1.5 text-ink-500 hover:bg-brand-50 hover:text-brand-600">
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(item)} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="rounded-md p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Product to Stock"
        footer={<><Btn variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Btn><Btn onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Add"}</Btn></>}>
        <ErrorBanner message={formErr} />
        <div className="space-y-4">
          <Field label="Product *">
            <select className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={addForm.productId} onChange={(e) => setAddForm((p) => ({ ...p, productId: e.target.value }))}>
              <option value="">Select product…</option>
              {unstockedProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Initial Qty">
              <input type="number" min="0" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={addForm.quantity} onChange={(e) => setAddForm((p) => ({ ...p, quantity: e.target.value }))} />
            </Field>
            <Field label="Min Qty (alert)">
              <input type="number" min="0" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={addForm.minQuantity} onChange={(e) => setAddForm((p) => ({ ...p, minQuantity: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost Price">
              <input type="number" min="0" placeholder="Optional" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={addForm.costPrice} onChange={(e) => setAddForm((p) => ({ ...p, costPrice: e.target.value }))} />
            </Field>
            <Field label="Selling Price">
              <input type="number" min="0" placeholder="Optional" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={addForm.sellingPrice} onChange={(e) => setAddForm((p) => ({ ...p, sellingPrice: e.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit Stock: ${selected?.productName}`}
        footer={<><Btn variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Btn><Btn onClick={handleEdit} disabled={saving}>{saving ? "Saving…" : "Update"}</Btn></>}>
        <ErrorBanner message={formErr} />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Current Qty">
              <input type="number" min="0" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={editForm.quantity} onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))} />
            </Field>
            <Field label="Min Qty (alert)">
              <input type="number" min="0" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={editForm.minQuantity} onChange={(e) => setEditForm((p) => ({ ...p, minQuantity: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost Price">
              <input type="number" min="0" placeholder="Optional" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={editForm.costPrice} onChange={(e) => setEditForm((p) => ({ ...p, costPrice: e.target.value }))} />
            </Field>
            <Field label="Selling Price">
              <input type="number" min="0" placeholder="Optional" className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={editForm.sellingPrice} onChange={(e) => setEditForm((p) => ({ ...p, sellingPrice: e.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal open={showAdjust} onClose={() => setShowAdjust(false)} title={`Adjust: ${selected?.productName} (current: ${selected?.quantity})`}
        footer={<><Btn variant="secondary" onClick={() => setShowAdjust(false)}>Cancel</Btn><Btn onClick={handleAdjust} disabled={saving}>{saving ? "Saving…" : "Apply"}</Btn></>}>
        <ErrorBanner message={formErr} />
        <div className="space-y-4">
          <Field label="Adjustment (use negative to remove)">
            <input type="number" autoFocus className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="e.g. +10 or -5" value={adjustForm.adjustment}
              onChange={(e) => setAdjustForm((p) => ({ ...p, adjustment: e.target.value }))} />
          </Field>
          {adjustForm.adjustment && !isNaN(Number(adjustForm.adjustment)) && (
            <div className={`rounded-lg px-3 py-2 text-sm font-medium ${Number(adjustForm.adjustment) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              New quantity: {Math.max(0, (selected?.quantity || 0) + Number(adjustForm.adjustment))}
            </div>
          )}
          <Field label="Reason (optional)">
            <input className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="e.g. Stock received, damaged goods…" value={adjustForm.reason}
              onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))} />
          </Field>
        </div>
      </Modal>
    </PageShell>
  );
}

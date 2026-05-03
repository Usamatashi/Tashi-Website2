import { useEffect, useState } from "react";
import { Package, AlertTriangle, Search, Edit2, Plus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import {
  adminListStock, adminAdjustStock, adminSetStock, adminSyncStock,
  adminListProducts, formatPrice, type StockItem,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty, Modal, Btn, Field, ErrorBanner } from "@/components/admin/ui";

type AdjustMode = "add" | "remove" | "set";

export default function AdminStock() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "zero">("all");
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustMode>("add");
  const [adjustValue, setAdjustValue] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await adminListStock();
      setStock(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const products = await adminListProducts();
      await adminSyncStock(products.map((p) => ({ id: p.id, name: p.name, productNumber: p.productNumber })));
      await load();
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave() {
    if (!editItem) return;
    setErr(null); setSaving(true);
    try {
      const val = Number(adjustValue);
      if (isNaN(val)) { setErr("Enter a valid number"); return; }

      if (adjustMode === "set") {
        await adminSetStock(editItem.productId, {
          quantity: val,
          costPrice: costPrice ? Number(costPrice) : editItem.costPrice,
          reorderLevel: reorderLevel ? Number(reorderLevel) : editItem.reorderLevel,
        });
      } else {
        const change = adjustMode === "remove" ? -Math.abs(val) : Math.abs(val);
        await adminAdjustStock(editItem.productId, change, reason || undefined);
      }
      await load();
      setEditItem(null);
    } catch (e: unknown) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = stock
    .filter((s) => {
      if (filter === "zero") return s.quantity === 0;
      if (filter === "low") return s.quantity > 0 && s.quantity <= s.reorderLevel;
      return true;
    })
    .filter((s) =>
      search === "" ||
      s.productName.toLowerCase().includes(search.toLowerCase()) ||
      s.sku?.toLowerCase().includes(search.toLowerCase()),
    );

  const totalValue = stock.reduce((acc, s) => acc + (s.quantity * s.costPrice), 0);
  const zeroCount = stock.filter((s) => s.quantity === 0).length;
  const lowCount = stock.filter((s) => s.quantity > 0 && s.quantity <= s.reorderLevel).length;

  if (loading) return <PageShell><Loading /></PageShell>;

  return (
    <PageShell>
      <PageHeader
        title="Stock Management"
        subtitle="Monitor and adjust inventory levels."
        actions={
          <Btn variant="secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Products"}
          </Btn>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Stock Value</div>
          <div className="mt-2 font-display text-2xl font-bold text-ink-900">{formatPrice(totalValue)}</div>
          <div className="mt-1 text-xs text-ink-400">{stock.length} products tracked</div>
        </Card>
        <Card className="cursor-pointer p-5 hover:bg-amber-50 transition-colors" onClick={() => setFilter("low")}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Low Stock</div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-amber-700">{lowCount}</div>
          <div className="mt-1 text-xs text-amber-500">Below reorder level</div>
        </Card>
        <Card className="cursor-pointer p-5 hover:bg-red-50 transition-colors" onClick={() => setFilter("zero")}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-600">Out of Stock</div>
            <Package className="h-5 w-5 text-red-500" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-red-700">{zeroCount}</div>
          <div className="mt-1 text-xs text-red-400">Zero quantity</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 px-5 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="w-full rounded-md border border-ink-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Search product or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-md border border-ink-200 overflow-hidden text-sm">
            {(["all", "low", "zero"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 font-medium capitalize transition-colors ${filter === f ? "bg-brand-500 text-white" : "text-ink-600 hover:bg-ink-50"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Empty icon={Package} title="No stock records" hint='Click "Sync Products" to import products.' />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Stock Value</th>
                  <th className="px-4 py-3 text-center">Reorder At</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((item) => {
                  const isZero = item.quantity === 0;
                  const isLow = !isZero && item.quantity <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="hover:bg-ink-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-ink-800">{item.productName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-500">{item.sku || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex h-8 w-12 items-center justify-center rounded-md font-bold text-base ${
                          isZero ? "bg-red-50 text-red-700" : isLow ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-ink-600">{item.costPrice ? formatPrice(item.costPrice) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink-900">{formatPrice(item.quantity * item.costPrice)}</td>
                      <td className="px-4 py-3 text-center text-ink-500">{item.reorderLevel}</td>
                      <td className="px-4 py-3 text-center text-xs font-semibold">
                        {isZero
                          ? <span className="text-red-600">Out of stock</span>
                          : isLow
                          ? <span className="text-amber-600">Low</span>
                          : <span className="text-emerald-600">In stock</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setEditItem(item); setAdjustValue(""); setCostPrice(String(item.costPrice || "")); setReorderLevel(String(item.reorderLevel || 5)); setReason(""); setErr(null); setAdjustMode("add"); }}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-ink-200 bg-ink-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-ink-700">Totals</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-ink-900">{formatPrice(totalValue)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Adjust Stock — ${editItem?.productName}`}
        footer={
          <>
            <Btn variant="secondary" onClick={() => setEditItem(null)}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
          </>
        }
      >
        <ErrorBanner message={err} />
        <div className="space-y-4">
          <div className="rounded-lg bg-ink-50 px-4 py-3 text-sm">
            Current quantity: <span className="font-bold text-ink-900">{editItem?.quantity}</span>
          </div>

          <Field label="Adjustment type">
            <div className="mt-1 flex rounded-md border border-ink-200 overflow-hidden text-sm">
              {([["add", "Add Stock"], ["remove", "Remove Stock"], ["set", "Set Exact"]] as [AdjustMode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setAdjustMode(m)}
                  className={`flex-1 py-2 font-medium transition-colors ${adjustMode === m ? "bg-brand-500 text-white" : "text-ink-600 hover:bg-ink-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label={adjustMode === "set" ? "New quantity" : "Quantity"}>
            <div className="mt-1 flex items-center gap-2">
              {adjustMode === "add" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {adjustMode === "remove" && <TrendingDown className="h-4 w-4 text-red-500" />}
              {adjustMode === "set" && <Plus className="h-4 w-4 text-blue-500" />}
              <input
                type="number"
                min="0"
                className="flex-1 rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                placeholder="0"
              />
            </div>
          </Field>

          <Field label="Cost price (Rs.)">
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label="Reorder level">
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              placeholder="5"
            />
          </Field>

          {adjustMode !== "set" && (
            <Field label="Reason (optional)">
              <input
                className="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Stock received, damaged goods…"
              />
            </Field>
          )}
        </div>
      </Modal>
    </PageShell>
  );
}

import { useEffect, useState } from "react";
import { ShoppingBag, TrendingUp, Calendar, CreditCard, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { adminListPOSSales, adminGetPOSSaleStats, adminCreatePOSReturn, formatPrice, formatDate, type POSSale, type POSSaleStats, type POSReturnItem } from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty, Modal, Btn, Field, ErrorBanner } from "@/components/admin/ui";

const PAYMENT_COLORS: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  card: "bg-blue-100 text-blue-700",
  easypaisa: "bg-violet-100 text-violet-700",
  jazzcash: "bg-red-100 text-red-700",
};

export default function AdminPOSSales() {
  const [sales, setSales]       = useState<POSSale[]>([]);
  const [stats, setStats]       = useState<POSSaleStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [returnSale, setReturnSale] = useState<POSSale | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, st] = await Promise.all([adminListPOSSales(100), adminGetPOSSaleStats()]);
        setSales(s);
        setStats(st);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <PageShell><Loading /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="POS Sales History" subtitle="All point-of-sale transactions" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue", value: formatPrice(stats?.totalRevenue || 0), icon: TrendingUp, color: "text-brand-600" },
          { label: "Today Revenue", value: formatPrice(stats?.todayRevenue || 0), icon: Calendar, color: "text-emerald-600" },
          { label: "Today Sales", value: String(stats?.todayCount || 0), icon: ShoppingBag, color: "text-blue-600" },
          { label: "Total Sales", value: String(stats?.totalSales || 0), icon: CreditCard, color: "text-violet-600" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">{card.label}</div>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="mt-2 font-display text-2xl font-bold text-ink-900">{card.value}</div>
            </div>
          );
        })}
      </div>

      <Card>
        {sales.length === 0 ? (
          <Empty icon={ShoppingBag} title="No sales yet" hint="Sales from the POS terminal will appear here." />
        ) : (
          <div className="divide-y divide-ink-100">
            {sales.map((sale) => (
              <div key={sale.id}>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-ink-50 transition-colors"
                  onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-600">{sale.saleNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${PAYMENT_COLORS[sale.paymentMethod] || "bg-ink-100 text-ink-600"}`}>
                        {sale.paymentMethod}
                      </span>
                    </div>
                    <div className="text-ink-500 text-xs">{sale.customerName} · {formatDate(sale.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-ink-900">{formatPrice(sale.total)}</div>
                    <div className="text-[11px] text-ink-400">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</div>
                  </div>
                  {expanded === sale.id ? <ChevronDown className="h-4 w-4 text-ink-400" /> : <ChevronRight className="h-4 w-4 text-ink-400" />}
                </button>
                {expanded === sale.id && (
                  <div className="border-t border-ink-100 bg-ink-50 px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                          <th className="pb-2">Product</th>
                          <th className="pb-2 text-center">Qty</th>
                          <th className="pb-2 text-right">Unit</th>
                          <th className="pb-2 text-right">Disc%</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200">
                        {sale.items.map((item, i) => (
                          <tr key={i}>
                            <td className="py-1.5 text-ink-700">{item.productName}</td>
                            <td className="py-1.5 text-center text-ink-500">{item.qty}</td>
                            <td className="py-1.5 text-right text-ink-500">{formatPrice(item.unitPrice)}</td>
                            <td className="py-1.5 text-right text-ink-500">{item.discountPct || 0}%</td>
                            <td className="py-1.5 text-right font-semibold text-ink-800">{formatPrice(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 space-y-1 border-t border-ink-200 pt-2 text-xs">
                      <div className="flex justify-between text-ink-500"><span>Subtotal</span><span>{formatPrice(sale.subtotal)}</span></div>
                      {sale.discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Discount ({sale.discountPct}%)</span><span>-{formatPrice(sale.discountAmount)}</span></div>}
                      <div className="flex justify-between font-bold text-ink-900"><span>Total</span><span>{formatPrice(sale.total)}</span></div>
                      {sale.paymentMethod === "cash" && sale.cashReceived != null && (
                        <>
                          <div className="flex justify-between text-ink-500"><span>Cash</span><span>{formatPrice(sale.cashReceived)}</span></div>
                          <div className="flex justify-between text-emerald-700"><span>Change</span><span>{formatPrice(sale.changeGiven || 0)}</span></div>
                        </>
                      )}
                      {sale.notes && <div className="mt-1 text-ink-400 italic">Note: {sale.notes}</div>}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); setReturnSale(sale); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Process Return
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      {returnSale && (
        <ReturnModal sale={returnSale} onClose={() => setReturnSale(null)} />
      )}
    </PageShell>
  );
}

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "easypaisa", label: "Easypaisa" },
  { key: "jazzcash", label: "JazzCash" },
];

function ReturnModal({ sale, onClose }: { sale: POSSale; onClose: () => void }) {
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>(
    Object.fromEntries(sale.items.map((_, i) => [i, 0]))
  );
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(sale.paymentMethod);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const returnItems: POSReturnItem[] = sale.items
    .map((item, i) => {
      const qty = returnQtys[i] || 0;
      if (qty <= 0) return null;
      const lineTotal = item.unitPrice * qty * (1 - (item.discountPct || 0) / 100);
      return { ...item, qty, lineTotal };
    })
    .filter(Boolean) as POSReturnItem[];

  const totalRefund = returnItems.reduce((a, i) => a + i.lineTotal, 0);

  async function submit() {
    if (returnItems.length === 0) { setError("Select at least one item to return"); return; }
    setSaving(true); setError(null);
    try {
      const result = await adminCreatePOSReturn({
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        customerId: sale.customerId,
        customerName: sale.customerName,
        items: returnItems,
        totalRefund,
        reason: reason.trim() || null,
        paymentMethod,
      });
      setDone(result.returnNumber);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Modal open onClose={onClose} title="Return Processed">
        <div className="py-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <RotateCcw className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-ink-900">Return Successful</div>
          <div className="font-mono text-sm font-semibold text-emerald-700">{done}</div>
          <div className="text-sm text-ink-500">
            Refund of <span className="font-bold text-ink-800">{formatPrice(totalRefund)}</span> processed via <span className="capitalize font-medium">{paymentMethod}</span>.
            Stock has been restocked automatically.
          </div>
        </div>
        <div className="flex justify-center">
          <Btn onClick={onClose}>Close</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Process Return — ${sale.saleNumber}`}
      wide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving || returnItems.length === 0}>
            {saving ? "Processing…" : `Refund ${formatPrice(totalRefund)}`}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <ErrorBanner message={error} />

        <div className="text-xs text-ink-500 mb-1">
          Customer: <span className="font-semibold text-ink-800">{sale.customerName}</span>
        </div>

        <div className="rounded-xl border border-ink-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2 text-center">Sold</th>
                <th className="px-4 py-2 text-center">Return Qty</th>
                <th className="px-4 py-2 text-right">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {sale.items.map((item, i) => {
                const qty = returnQtys[i] || 0;
                const lineRefund = item.unitPrice * qty * (1 - (item.discountPct || 0) / 100);
                return (
                  <tr key={i} className={qty > 0 ? "bg-red-50" : ""}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink-800">{item.productName}</div>
                      <div className="text-[11px] text-ink-400">{item.sku}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-ink-500">{item.qty}</td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={item.qty}
                        value={qty}
                        onChange={(e) => setReturnQtys((prev) => ({ ...prev, [i]: Math.min(item.qty, Math.max(0, parseInt(e.target.value) || 0)) }))}
                        className="w-16 rounded-md border border-ink-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-red-300"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                      {qty > 0 ? `-${formatPrice(lineRefund)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-ink-50">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-sm font-bold text-ink-900">Total Refund</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-red-600">{formatPrice(totalRefund)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <Field label="Refund via">
          <div className="grid grid-cols-4 gap-1">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.key} type="button" onClick={() => setPaymentMethod(m.key)}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${paymentMethod === m.key ? "bg-brand-500 text-white shadow-sm" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Reason (optional)">
          <input
            className="input"
            placeholder="e.g. Defective product, wrong item…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

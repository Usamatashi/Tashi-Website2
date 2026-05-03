import { useEffect, useState } from "react";
import { Receipt, Search, Eye, Printer, TrendingUp, ShoppingCart, Calendar } from "lucide-react";
import {
  adminListPOSSales, adminGetPOSStats, formatPrice, formatDate,
  type POSSale, type POSStats,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Pill, Modal, Btn } from "@/components/admin/ui";

export default function AdminPOSSales() {
  const [sales, setSales] = useState<POSSale[]>([]);
  const [stats, setStats] = useState<POSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<POSSale | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, st] = await Promise.all([adminListPOSSales(), adminGetPOSStats()]);
        setSales(s.sales);
        setStats(st);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = sales.filter((s) =>
    search === "" ||
    s.saleNumber?.toLowerCase().includes(search.toLowerCase()) ||
    (s.customerName || "").toLowerCase().includes(search.toLowerCase()),
  );

  const pmColor: Record<string, "emerald" | "blue" | "indigo" | "amber"> = {
    cash: "emerald", card: "blue", easypaisa: "indigo", jazzcash: "amber",
  };

  if (loading) return <PageShell><Loading /></PageShell>;

  return (
    <PageShell>
      <PageHeader title="POS Sales" subtitle="All point-of-sale transactions." />

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingCart} label="Today's sales" value={stats.today.count} sub={formatPrice(stats.today.revenue)} color="bg-brand-500" />
          <StatCard icon={TrendingUp} label="Total sales" value={stats.all.count} sub={formatPrice(stats.all.revenue)} color="bg-emerald-500" />
          <StatCard icon={Receipt} label="Top product" value={stats.topProducts[0]?.name ?? "—"} sub={stats.topProducts[0] ? formatPrice(stats.topProducts[0].revenue) : ""} color="bg-blue-500" />
          <StatCard icon={Calendar} label="Monthly trend" value={stats.monthly.length > 0 ? formatPrice(stats.monthly[stats.monthly.length - 1]?.revenue ?? 0) : "—"} sub="This month" color="bg-violet-500" />
        </div>
      )}

      {stats && stats.monthly.length > 0 && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 font-display text-base font-bold text-ink-900">Monthly Revenue</h2>
          <div className="flex items-end gap-2 h-32">
            {stats.monthly.map((m) => {
              const max = Math.max(...stats.monthly.map((x) => x.revenue), 1);
              const h = Math.max(4, Math.round((m.revenue / max) * 100));
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-[10px] font-semibold text-ink-600">{formatPrice(m.revenue).replace("Rs. ", "")}</div>
                  <div className="w-full rounded-t-md bg-brand-500" style={{ height: `${h}%` }} />
                  <div className="text-[9px] text-ink-400">{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="border-b border-ink-200 px-5 py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              className="w-full rounded-md border border-ink-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Search by sale # or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-ink-400">No sales found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3">Sale #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((sale) => (
                  <tr key={sale.id} className="hover:bg-ink-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-ink-700">{sale.saleNumber}</td>
                    <td className="px-4 py-3 text-ink-800">{sale.customerName || "Walk-in"}</td>
                    <td className="px-4 py-3 text-ink-600">{sale.items?.length ?? 0} item(s)</td>
                    <td className="px-4 py-3">
                      <Pill tone={pmColor[sale.paymentMethod] ?? "neutral"}>
                        {sale.paymentMethod}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink-900">{formatPrice(sale.total)}</td>
                    <td className="px-4 py-3 text-ink-500">{formatDate(sale.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(sale)}
                        className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Sale ${selected?.saleNumber}`} wide
        footer={
          <>
            <Btn variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Btn>
            <Btn onClick={() => setSelected(null)}>Close</Btn>
          </>
        }
      >
        {selected && <SaleDetail sale={selected} />}
      </Modal>
    </PageShell>
  );
}

function SaleDetail({ sale }: { sale: POSSale }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-ink-50 p-4">
        <Info label="Sale #" value={sale.saleNumber} />
        <Info label="Date" value={formatDate(sale.createdAt)} />
        <Info label="Customer" value={sale.customerName || "Walk-in"} />
        <Info label="Payment" value={sale.paymentMethod} />
        {sale.cashReceived != null && <Info label="Cash received" value={formatPrice(sale.cashReceived)} />}
        {sale.changeGiven != null && <Info label="Change" value={formatPrice(sale.changeGiven)} />}
        {sale.soldByName && <Info label="Sold by" value={sale.soldByName} />}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-ink-200 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            <th className="pb-2 text-left">Product</th>
            <th className="pb-2 text-right">Qty</th>
            <th className="pb-2 text-right">Unit Price</th>
            <th className="pb-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {sale.items.map((item, i) => (
            <tr key={i}>
              <td className="py-2 text-ink-800">{item.productName}</td>
              <td className="py-2 text-right text-ink-600">{item.qty}</td>
              <td className="py-2 text-right text-ink-600">{formatPrice(item.unitPrice)}</td>
              <td className="py-2 text-right font-semibold text-ink-900">{formatPrice(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-1 rounded-xl bg-ink-50 p-4 text-right">
        <div className="text-ink-500">Subtotal: <span className="font-medium text-ink-800">{formatPrice(sale.subtotal)}</span></div>
        {sale.discountAmount > 0 && (
          <div className="text-red-600">Discount ({sale.discountPct}%): -{formatPrice(sale.discountAmount)}</div>
        )}
        <div className="text-lg font-bold text-ink-900">Total: {formatPrice(sale.total)}</div>
      </div>
      {sale.notes && <p className="text-ink-500 italic">Note: {sale.notes}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="font-medium text-ink-800">{value}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color} text-white`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-xl font-bold text-ink-900 truncate">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
    </Card>
  );
}

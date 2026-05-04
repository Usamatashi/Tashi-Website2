import { useEffect, useState } from "react";
import { ShoppingBag, TrendingUp, Calendar, CreditCard, ChevronDown, ChevronRight } from "lucide-react";
import { adminListPOSSales, adminGetPOSSaleStats, formatPrice, formatDate, type POSSale, type POSSaleStats } from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty } from "@/components/admin/ui";

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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageShell>
  );
}

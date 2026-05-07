import { useEffect, useState } from "react";
import { RotateCcw, ChevronDown, ChevronRight, PackageX } from "lucide-react";
import { adminListPOSReturns, formatPrice, formatDate, type POSReturn } from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty } from "@/components/admin/ui";

const REFUND_COLORS: Record<string, string> = {
  cash: "bg-emerald-100 text-emerald-700",
  card: "bg-blue-100 text-blue-700",
  easypaisa: "bg-violet-100 text-violet-700",
  jazzcash: "bg-red-100 text-red-700",
};

export default function AdminPOSReturns() {
  const [returns, setReturns] = useState<POSReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setReturns(await adminListPOSReturns(100));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageShell><Loading /></PageShell>;

  const totalRefunded = returns.reduce((a, r) => a + r.totalRefund, 0);

  return (
    <PageShell>
      <PageHeader title="Sales Returns" subtitle={`${returns.length} total returns`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Returns</div>
          <div className="mt-2 font-display text-2xl font-bold text-ink-900">{returns.length}</div>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Refunded</div>
          <div className="mt-2 font-display text-2xl font-bold text-red-600">{formatPrice(totalRefunded)}</div>
        </div>
      </div>

      <Card>
        {returns.length === 0 ? (
          <Empty icon={PackageX} title="No returns yet" hint="Processed sales returns will appear here." />
        ) : (
          <div className="divide-y divide-ink-100">
            {returns.map((ret) => (
              <div key={ret.id}>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-ink-50 transition-colors"
                  onClick={() => setExpanded(expanded === ret.id ? null : ret.id)}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-red-600">{ret.returnNumber}</span>
                      <span className="text-[10px] text-ink-400">← {ret.saleNumber || ret.saleId}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${REFUND_COLORS[ret.paymentMethod] || "bg-ink-100 text-ink-600"}`}>
                        {ret.paymentMethod}
                      </span>
                    </div>
                    <div className="text-ink-500 text-xs">{ret.customerName} · {formatDate(ret.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">-{formatPrice(ret.totalRefund)}</div>
                    <div className="text-[11px] text-ink-400">{ret.items.length} item{ret.items.length !== 1 ? "s" : ""}</div>
                  </div>
                  {expanded === ret.id ? <ChevronDown className="h-4 w-4 text-ink-400" /> : <ChevronRight className="h-4 w-4 text-ink-400" />}
                </button>

                {expanded === ret.id && (
                  <div className="border-t border-ink-100 bg-ink-50 px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                          <th className="pb-2">Product</th>
                          <th className="pb-2 text-center">Qty</th>
                          <th className="pb-2 text-right">Unit</th>
                          <th className="pb-2 text-right">Refund</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-200">
                        {ret.items.map((item, i) => (
                          <tr key={i}>
                            <td className="py-1.5 text-ink-700">{item.productName}</td>
                            <td className="py-1.5 text-center text-ink-500">{item.qty}</td>
                            <td className="py-1.5 text-right text-ink-500">{formatPrice(item.unitPrice)}</td>
                            <td className="py-1.5 text-right font-semibold text-red-600">-{formatPrice(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 space-y-1 border-t border-ink-200 pt-2 text-xs">
                      <div className="flex justify-between font-bold text-ink-900">
                        <span>Total Refunded</span>
                        <span className="text-red-600">-{formatPrice(ret.totalRefund)}</span>
                      </div>
                      {ret.reason && (
                        <div className="mt-1 text-ink-400 italic">Reason: {ret.reason}</div>
                      )}
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

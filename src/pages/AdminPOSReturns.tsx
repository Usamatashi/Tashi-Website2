import { useEffect, useState } from "react";
import { RotateCcw, ChevronDown, ChevronRight, PackageX, MonitorSmartphone, Globe, Smartphone } from "lucide-react";
import {
  adminListPOSReturns, adminListWebsiteReturns, adminListWholesaleReturns,
  formatPrice, formatDate,
  type POSReturn, type WebsiteReturn, type WholesaleReturn,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Card, Empty } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Tab = "pos" | "website" | "wholesale";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "pos",       label: "POS",       icon: MonitorSmartphone },
  { key: "website",   label: "Website",   icon: Globe },
  { key: "wholesale", label: "Wholesale", icon: Smartphone },
];

const REFUND_COLORS: Record<string, string> = {
  cash:      "bg-emerald-100 text-emerald-700",
  card:      "bg-blue-100 text-blue-700",
  easypaisa: "bg-violet-100 text-violet-700",
  jazzcash:  "bg-red-100 text-red-700",
  cod:       "bg-amber-100 text-amber-700",
};

// ── Shared row layout ──────────────────────────────────────────────────────
function ReturnRow({
  id, expanded, onToggle,
  number, reference, badge, badgeLabel,
  name, date, total, items, reason,
}: {
  id: string; expanded: boolean; onToggle: () => void;
  number: string; reference: string; badge?: string; badgeLabel?: string;
  name: string; date: string | null; total: number;
  items: { productName: string; qty: number; unitPrice: number; lineTotal: number }[];
  reason?: string | null;
}) {
  return (
    <div>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-ink-50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <RotateCcw className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-red-600">{number}</span>
            <span className="text-[10px] text-ink-400">← {reference}</span>
            {badge && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${REFUND_COLORS[badge] ?? "bg-ink-100 text-ink-600"}`}>
                {badgeLabel ?? badge}
              </span>
            )}
          </div>
          <div className="text-ink-500 text-xs truncate">{name} · {formatDate(date)}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-red-600">-{formatPrice(total)}</div>
          <div className="text-[11px] text-ink-400">{items.length} item{items.length !== 1 ? "s" : ""}</div>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-ink-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-ink-400 flex-shrink-0" />}
      </button>

      {expanded && (
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
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="py-1.5 text-ink-700">{item.productName}</td>
                  <td className="py-1.5 text-center text-ink-500">{item.qty}</td>
                  <td className="py-1.5 text-right text-ink-500">{formatPrice(item.unitPrice)}</td>
                  <td className="py-1.5 text-right font-semibold text-red-600">-{formatPrice(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 border-t border-ink-200 pt-2 text-xs flex justify-between font-bold text-ink-900">
            <span>Total Refunded</span>
            <span className="text-red-600">-{formatPrice(total)}</span>
          </div>
          {reason && <div className="mt-1 text-xs text-ink-400 italic">Reason: {reason}</div>}
        </div>
      )}
    </div>
  );
}

// ── POS tab ────────────────────────────────────────────────────────────────
function POSTab() {
  const [returns, setReturns] = useState<POSReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try { setReturns(await adminListPOSReturns(100)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="py-8 flex justify-center"><Loading /></div>;

  const total = returns.reduce((a, r) => a + r.totalRefund, 0);
  return (
    <>
      <SummaryCards count={returns.length} total={total} />
      <Card>
        {returns.length === 0
          ? <Empty icon={PackageX} title="No POS returns yet" hint="Returns processed at the counter will appear here." />
          : <div className="divide-y divide-ink-100">
              {returns.map((r) => (
                <ReturnRow
                  key={r.id} id={r.id}
                  expanded={expanded === r.id}
                  onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                  number={r.returnNumber}
                  reference={r.saleNumber || r.saleId}
                  badge={r.paymentMethod}
                  name={r.customerName}
                  date={r.createdAt}
                  total={r.totalRefund}
                  items={r.items.map((i) => ({ productName: i.productName, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal }))}
                  reason={r.reason}
                />
              ))}
            </div>
        }
      </Card>
    </>
  );
}

// ── Website tab ────────────────────────────────────────────────────────────
function WebsiteTab() {
  const [returns, setReturns] = useState<WebsiteReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try { setReturns(await adminListWebsiteReturns(100)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="py-8 flex justify-center"><Loading /></div>;

  const total = returns.reduce((a, r) => a + r.totalRefund, 0);
  return (
    <>
      <SummaryCards count={returns.length} total={total} />
      <Card>
        {returns.length === 0
          ? <Empty icon={PackageX} title="No website returns yet" hint="Returns for online orders will appear here." />
          : <div className="divide-y divide-ink-100">
              {returns.map((r) => (
                <ReturnRow
                  key={r.id} id={r.id}
                  expanded={expanded === r.id}
                  onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                  number={r.returnNumber}
                  reference={r.orderId}
                  badge={r.refundMethod}
                  name={r.customerName}
                  date={r.createdAt}
                  total={r.totalRefund}
                  items={r.items}
                  reason={r.reason}
                />
              ))}
            </div>
        }
      </Card>
    </>
  );
}

// ── Wholesale tab ──────────────────────────────────────────────────────────
function WholesaleTab() {
  const [returns, setReturns] = useState<WholesaleReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try { setReturns(await adminListWholesaleReturns(100)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="py-8 flex justify-center"><Loading /></div>;

  const total = returns.reduce((a, r) => a + r.totalRefund, 0);
  return (
    <>
      <SummaryCards count={returns.length} total={total} />
      <Card>
        {returns.length === 0
          ? <Empty icon={PackageX} title="No wholesale returns yet" hint="Returns for wholesale (app) orders will appear here." />
          : <div className="divide-y divide-ink-100">
              {returns.map((r) => (
                <ReturnRow
                  key={r.id} id={r.id}
                  expanded={expanded === r.id}
                  onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                  number={r.returnNumber}
                  reference={r.orderId}
                  name={r.retailerName + (r.salesmanName ? ` · via ${r.salesmanName}` : "")}
                  date={r.createdAt}
                  total={r.totalRefund}
                  items={r.items}
                  reason={r.reason}
                />
              ))}
            </div>
        }
      </Card>
    </>
  );
}

// ── Shared summary banner ──────────────────────────────────────────────────
function SummaryCards({ count, total }: { count: number; total: number }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Returns</div>
        <div className="mt-2 font-display text-2xl font-bold text-ink-900">{count}</div>
      </div>
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-red-400">Total Refunded</div>
        <div className="mt-2 font-display text-2xl font-bold text-red-600">{formatPrice(total)}</div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminPOSReturns() {
  const [tab, setTab] = useState<Tab>("pos");

  return (
    <PageShell>
      <PageHeader title="Sales Returns" subtitle="Returns across all sales channels" />

      <div className="mb-6 flex flex-wrap gap-1.5 rounded-full border border-ink-200 bg-white p-1 shadow-sm w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              tab === key
                ? "bg-brand-500 text-white shadow-sm"
                : "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "pos"       && <POSTab />}
      {tab === "website"   && <WebsiteTab />}
      {tab === "wholesale" && <WholesaleTab />}
    </PageShell>
  );
}

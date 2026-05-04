import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Package, Globe, Smartphone } from "lucide-react";
import {
  adminListOrders, adminListWholesaleOrders,
  formatDate, formatPrice, STATUS_META,
  type AdminOrder, type WholesaleOrder,
} from "@/lib/admin";
import { PageShell, PageHeader, Card, Empty, Loading, Pill } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

const RETAIL_FILTERS = [
  { value: null, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const WHOLESALE_FILTERS = [
  { value: null, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type Tab = "retail" | "wholesale";

export default function AdminOrders() {
  const [tab, setTab] = useState<Tab>("retail");

  return (
    <PageShell>
      <PageHeader
        title="Orders"
        subtitle="Retail orders come from the website. Wholesale orders come from the mobile app."
      />

      <div className="mb-5 flex flex-wrap gap-1.5 rounded-full border border-ink-200 bg-white p-1 shadow-sm w-fit mx-auto">
        <TabBtn active={tab === "retail"} onClick={() => setTab("retail")} icon={Globe}>Retail</TabBtn>
        <TabBtn active={tab === "wholesale"} onClick={() => setTab("wholesale")} icon={Smartphone}>Wholesale</TabBtn>
      </div>

      {tab === "retail" ? <RetailSection /> : <WholesaleSection />}
    </PageShell>
  );
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: { active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-brand-500 text-white shadow-sm" : "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

// ── Retail (website) ───────────────────────────────────────────────────────
function RetailSection() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await adminListOrders(filter ?? undefined);
        if (!cancelled) setOrders(data.orders);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      o.id.toLowerCase().includes(q) ||
      (o.customer.name || "").toLowerCase().includes(q) ||
      (o.customer.phone || "").toLowerCase().includes(q) ||
      (o.delivery.city || "").toLowerCase().includes(q),
    );
  }, [orders, query]);

  return (
    <>
      <Toolbar
        filters={RETAIL_FILTERS as unknown as { value: string | null; label: string }[]}
        active={filter} onFilter={setFilter}
        query={query} onQuery={setQuery}
        placeholder="Search by name, phone, city, ID"
        count={filtered.length}
      />

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty icon={Package} title="No retail orders" hint="Try a different filter or search term." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">City</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Placed</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <div className="mt-0.5 text-[10px] text-ink-400">
                      {o.items.length} item{o.items.length === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{o.customer.name || "—"}</div>
                    <div className="text-xs text-ink-500">{o.customer.phone}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-600 lg:table-cell">{o.delivery.city || "—"}</td>
                  <td className="hidden px-4 py-3 text-ink-500 md:table-cell">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-ink-900">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

// ── Wholesale (mobile app) ─────────────────────────────────────────────────
function WholesaleSection() {
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await adminListWholesaleOrders(filter ?? undefined);
        if (!cancelled) setOrders(data.orders);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      String(o.id).toLowerCase().includes(q) ||
      (o.retailerName || "").toLowerCase().includes(q) ||
      (o.retailerPhone || "").toLowerCase().includes(q) ||
      (o.salesmanName || "").toLowerCase().includes(q),
    );
  }, [orders, query]);

  return (
    <>
      <Toolbar
        filters={WHOLESALE_FILTERS as unknown as { value: string | null; label: string }[]}
        active={filter} onFilter={setFilter}
        query={query} onQuery={setQuery}
        placeholder="Search by retailer, salesman, ID"
        count={filtered.length}
      />

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty icon={Smartphone} title="No wholesale orders" hint="Wholesale orders are placed by salesmen in the mobile app." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Retailer</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">Salesman</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Placed</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((o) => (
                <tr key={o.docId} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/wholesale/${o.docId}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                      #{String(o.id).slice(0, 8)}
                    </Link>
                    <div className="mt-0.5 text-[10px] text-ink-400">{o.itemCount} item{o.itemCount === 1 ? "" : "s"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{o.retailerName || "—"}</div>
                    <div className="text-xs text-ink-500">{o.retailerPhone || "—"}</div>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="text-ink-700">{o.salesmanName || "—"}</div>
                    <div className="text-xs text-ink-500">{o.salesmanPhone || ""}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-500 md:table-cell">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3"><WholesalePill status={o.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-ink-900">{formatPrice(o.finalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function Toolbar({
  filters, active, onFilter, query, onQuery, placeholder, count,
}: {
  filters: { value: string | null; label: string }[];
  active: string | null;
  onFilter: (v: string | null) => void;
  query: string; onQuery: (v: string) => void;
  placeholder: string; count: number;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5 rounded-full border border-ink-200 bg-white p-1 shadow-sm">
        {filters.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => onFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              active === f.value ? "bg-brand-500 text-white shadow-sm" : "text-ink-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-ink-500">{count} order{count === 1 ? "" : "s"}</span>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search" value={query} onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder} className="input pl-9"
          />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.tone} ${meta.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function WholesalePill({ status }: { status: string }) {
  const tone =
    status === "dispatched" ? "indigo" :
    status === "confirmed" ? "blue" :
    status === "cancelled" ? "red" :
    "amber";
  return <Pill tone={tone}>{status}</Pill>;
}

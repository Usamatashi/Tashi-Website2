import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Clock,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Package,
  AlertCircle,
} from "lucide-react";
import {
  adminGetOrder,
  adminUpdateOrderStatus,
  formatDate,
  formatPrice,
  PAYMENT_LABEL,
  STATUS_META,
  type AdminOrder,
} from "@/lib/admin";

const ACTIONS: { status: string; label: string; icon: typeof CheckCircle2; tone: string }[] = [
  { status: "pending", label: "Mark Pending", icon: Clock, tone: "bg-amber-500 hover:bg-amber-600" },
  { status: "confirmed", label: "Confirm Order", icon: CheckCircle2, tone: "bg-blue-500 hover:bg-blue-600" },
  { status: "shipped", label: "Mark Shipped", icon: Truck, tone: "bg-indigo-500 hover:bg-indigo-600" },
  { status: "delivered", label: "Mark Delivered", icon: PackageCheck, tone: "bg-emerald-500 hover:bg-emerald-600" },
  { status: "cancelled", label: "Cancel Order", icon: XCircle, tone: "bg-red-500 hover:bg-red-600" },
];

export default function AdminOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetOrder(orderId);
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load order");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function changeStatus(status: string) {
    if (!orderId || !order) return;
    if (status === "cancelled" && !window.confirm("Cancel this order?")) return;
    setUpdating(status);
    setError(null);
    try {
      const updated = await adminUpdateOrderStatus(orderId, status);
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 font-display text-xl font-bold text-ink-900">
          Order not found
        </h1>
        <p className="mt-2 text-sm text-ink-500">{error}</p>
        <Link
          to="/admin/orders"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[order.status] ?? STATUS_META.pending;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-mono text-xs font-semibold uppercase tracking-widest text-ink-400">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            {order.customer.name || "—"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-sm font-semibold ring-1 ${statusMeta.tone} ${statusMeta.ring}`}
        >
          <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
          {statusMeta.label}
        </span>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Update status
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {ACTIONS.map((a) => {
            const isCurrent = order.status === a.status;
            return (
              <button
                key={a.status}
                type="button"
                onClick={() => changeStatus(a.status)}
                disabled={isCurrent || updating !== null}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-ink-300"
                    : updating === a.status
                      ? "bg-ink-400"
                      : a.tone
                }`}
              >
                {updating === a.status ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <a.icon className="h-3.5 w-3.5" />
                )}
                {isCurrent ? `Currently ${a.label.toLowerCase().replace("mark ", "").replace(" order", "")}` : a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-base font-bold text-ink-900">
              Items ({order.items.length})
            </h2>
            <ul className="mt-4 divide-y divide-ink-100">
              {order.items.map((i) => (
                <li
                  key={i.productId}
                  className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-400">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                      {i.sku}
                    </div>
                    <div className="font-medium text-ink-900">{i.productName}</div>
                    <div className="mt-0.5 text-xs text-ink-500">
                      {i.quantity} × {formatPrice(i.unitPrice)}
                    </div>
                  </div>
                  <div className="font-semibold text-ink-900">
                    {formatPrice(i.lineTotal)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <InfoCard title="Customer">
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-brand-500" />
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="hover:text-brand-700"
                  >
                    {order.customer.phone}
                  </a>
                </li>
                {order.customer.email && (
                  <li className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-brand-500" />
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="hover:text-brand-700"
                    >
                      {order.customer.email}
                    </a>
                  </li>
                )}
              </ul>
            </InfoCard>

            <InfoCard title="Delivery">
              <div className="flex items-start gap-2 text-sm text-ink-700">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
                <div>
                  <div>{order.delivery.address}</div>
                  <div>
                    {order.delivery.city}
                    {order.delivery.postalCode
                      ? ` — ${order.delivery.postalCode}`
                      : ""}
                  </div>
                  {order.delivery.notes && (
                    <div className="mt-1 text-xs text-ink-500">
                      Notes: {order.delivery.notes}
                    </div>
                  )}
                </div>
              </div>
            </InfoCard>
          </div>
        </div>

        <aside className="h-fit space-y-3 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-base font-bold text-ink-900">Summary</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Payment">
              <span className="font-medium text-ink-900">
                {PAYMENT_LABEL[order.payment.method || ""] ??
                  order.payment.method ??
                  "—"}
              </span>
            </Row>
            <Row label="Subtotal">{formatPrice(order.subtotal)}</Row>
            <div className="my-2 border-t border-ink-100" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink-900">Total</span>
              <span className="font-display text-2xl font-bold text-ink-900">
                {formatPrice(order.total)}
              </span>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{children}</dd>
    </div>
  );
}

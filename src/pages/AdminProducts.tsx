import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { removeBackground } from "@imgly/background-removal";
import {
  adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  fileToBase64, formatPrice, type AdminProduct,
} from "@/lib/admin";
import { PageHeader, PageShell, Loading, Empty, Btn, Modal, Field, ErrorBanner, Card } from "@/components/admin/ui";

async function fileToBase64WithBgRemoval(file: File): Promise<string> {
  const blob = await removeBackground(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const DEFAULT_CATEGORIES = ["disc_pad", "drum_shoe", "shoe_lining", "other"];

export default function AdminProducts() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function reload() {
    setLoading(true);
    try { setItems(await adminListProducts()); } finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of items) if (p.category) seen.add(p.category);
    const fromProducts = Array.from(seen);
    const merged = [...new Set([...DEFAULT_CATEGORIES, ...fromProducts])];
    return merged;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) =>
      (!category || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || (p.productNumber || "").toLowerCase().includes(q) || (p.vehicleManufacturer || "").toLowerCase().includes(q)),
    );
  }, [items, query, category]);

  async function remove(id: number) {
    if (!confirm("Delete this product?")) return;
    await adminDeleteProduct(id);
    reload();
  }

  return (
    <PageShell>
      <PageHeader
        title="Products"
        subtitle={`${items.length} total`}
        actions={<Btn onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New product</Btn>}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search name / SKU / vehicle" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-full border border-ink-200 bg-white p-1 shadow-sm">
          <Tag active={category === null} onClick={() => setCategory(null)}>All</Tag>
          {categories.map((c) => (
            <Tag key={c} active={category === c} onClick={() => setCategory(c)}>{labelFor(c)}</Tag>
          ))}
        </div>
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty icon={Package} title="No products" hint="Add your first product to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex aspect-square items-center justify-center bg-ink-50">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-ink-300" />
                )}
              </div>
              <div className="p-4">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-brand-600">{labelFor(p.category)}</div>
                <h3 className="mt-1 line-clamp-2 font-semibold text-ink-900">{p.name}</h3>
                <div className="mt-1 text-sm text-ink-500">
                  {p.productNumber || "—"} · {p.vehicleManufacturer || "—"}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg font-bold text-ink-900">{formatPrice(p.salesPrice)}</div>
                    {p.websitePrice != null && (
                      <div className="text-xs text-brand-600 font-semibold">Web: {formatPrice(p.websitePrice)}</div>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-emerald-700">{p.points} pts</div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Btn variant="secondary" className="flex-1" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /> Edit</Btn>
                  <Btn variant="danger" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showNew && (
        <ProductForm
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); reload(); }}
        />
      )}
      {editing && (
        <ProductForm
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </PageShell>
  );
}

function Tag({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active ? "bg-brand-500 text-white shadow-sm" : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
      }`}
    >{children}</button>
  );
}

function labelFor(c: string) {
  return ({
    disc_pad: "Disc Pad",
    drum_shoe: "Drum Shoe",
    shoe_lining: "Shoe Lining",
    other: "Other",
  } as Record<string, string>)[c] || c;
}

function ProductForm({
  existing, onClose, onSaved,
}: { existing?: AdminProduct; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [points, setPoints] = useState(String(existing?.points ?? 0));
  const [salesPrice, setSalesPrice] = useState(String(existing?.salesPrice ?? 0));
  const [websitePrice, setWebsitePrice] = useState(existing?.websitePrice != null ? String(existing.websitePrice) : "");
  const [category, setCategory] = useState(existing?.category ?? "other");
  const [productNumber, setProductNumber] = useState(existing?.productNumber ?? "");
  const [vehicleManufacturer, setVehicleManufacturer] = useState(existing?.vehicleManufacturer ?? "");
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [diagramBase64, setDiagramBase64] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickImage(f: File | undefined) {
    if (!f) return;
    setRemovingBg(true);
    try {
      setImageBase64(await fileToBase64WithBgRemoval(f));
    } catch {
      setImageBase64(await fileToBase64(f));
    } finally {
      setRemovingBg(false);
    }
  }

  async function onPick(f: File | undefined, setter: (v: string | undefined) => void) {
    if (!f) return;
    setter(await fileToBase64(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body = {
        name, points: Number(points), salesPrice: Number(salesPrice),
        websitePrice: websitePrice.trim() !== "" ? Number(websitePrice) : null,
        category,
        productNumber: productNumber || null, vehicleManufacturer: vehicleManufacturer || null,
        ...(imageBase64 !== undefined ? { imageBase64 } : {}),
        ...(diagramBase64 !== undefined ? { diagramBase64 } : {}),
      };
      if (existing) await adminUpdateProduct(existing.id, body);
      else await adminCreateProduct(body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? "Edit product" : "New product"}
      wide
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={(e) => submit(e as unknown as React.FormEvent)} disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Create"}
          </Btn>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <ErrorBanner message={error} />
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Points"><input className="input" type="number" value={points} onChange={(e) => setPoints(e.target.value)} required /></Field>
          <Field label="App price (Rs)"><input className="input" type="number" value={salesPrice} onChange={(e) => setSalesPrice(e.target.value)} /></Field>
        </div>
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-700">Website pricing</div>
          <Field label="Website price (Rs) — leave blank to use app price">
            <input
              className="input"
              type="number"
              placeholder={salesPrice ? `Default: ${salesPrice} (same as app)` : "Same as app price"}
              value={websitePrice}
              onChange={(e) => setWebsitePrice(e.target.value)}
              min={0}
            />
          </Field>
          {websitePrice.trim() !== "" && Number(websitePrice) !== Number(salesPrice) && (
            <p className="text-xs text-brand-600">
              App price: Rs. {Number(salesPrice).toLocaleString()} · Website price: Rs. {Number(websitePrice).toLocaleString()}
            </p>
          )}
        </div>
        <Field label="Category">
          <input
            className="input"
            list="category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. disc_pad, drum_shoe, or custom…"
          />
          <datalist id="category-options">
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{labelFor(c)}</option>
            ))}
          </datalist>
        </Field>
        {category !== "other" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product number"><input className="input" value={productNumber} onChange={(e) => setProductNumber(e.target.value)} /></Field>
            <Field label="Vehicle"><input className="input" value={vehicleManufacturer} onChange={(e) => setVehicleManufacturer(e.target.value)} /></Field>
          </div>
        )}
        <Field label="Product image">
          <input type="file" accept="image/*" disabled={removingBg} onChange={(e) => onPickImage(e.target.files?.[0])} />
          {removingBg && (
            <div className="mt-2 flex items-center gap-2 text-sm text-ink-500">
              <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
              Removing background…
            </div>
          )}
          {imageBase64 && !removingBg && (
            <img src={imageBase64} className="mt-2 h-24 w-24 rounded-lg object-contain bg-ink-50 border border-ink-100 p-1" />
          )}
        </Field>
        <Field label="Diagram (optional)">
          <input type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0], setDiagramBase64)} />
          {diagramBase64 && <img src={diagramBase64} className="mt-2 h-24 w-24 rounded-lg object-cover" />}
        </Field>
      </form>
    </Modal>
  );
}

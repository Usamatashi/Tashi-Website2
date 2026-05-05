import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Printer, Search, ChevronLeft, RefreshCw, CheckSquare, Square,
  RectangleHorizontal, Maximize2,
} from "lucide-react";
import { adminListQRCodes, type QRCode } from "@/lib/admin";
import { cn } from "@/lib/utils";

interface LabelSettings {
  width: number;
  height: number;
  shape: "rect" | "rounded";
  radius: number;
  columns: number;
  colGap: number;
  rowGap: number;
  pageMarginH: number;
  pageMarginV: number;
  showCode: boolean;
  fontSize: number;
  qrPadding: number;
}

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: "38 × 25 mm", w: 38, h: 25 },
  { label: "40 × 30 mm", w: 40, h: 30 },
  { label: "50 × 25 mm", w: 50, h: 25 },
  { label: "50 × 30 mm", w: 50, h: 30 },
  { label: "60 × 40 mm", w: 60, h: 40 },
  { label: "62 × 29 mm", w: 62, h: 29 },
  { label: "100 × 50 mm", w: 100, h: 50 },
];

const DEFAULT: LabelSettings = {
  width: 50,
  height: 30,
  shape: "rounded",
  radius: 4,
  columns: 2,
  colGap: 3,
  rowGap: 3,
  pageMarginH: 10,
  pageMarginV: 10,
  showCode: true,
  fontSize: 7,
  qrPadding: 2,
};

function qrUrl(code: string, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&data=${encodeURIComponent(code)}`;
}

function mmToPx(mm: number, dpi = 96) {
  return (mm / 25.4) * dpi;
}

export default function AdminPrintLabels() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedIds: string[] = (location.state as any)?.selectedIds ?? [];

  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(passedIds));
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  useEffect(() => {
    adminListQRCodes()
      .then((data) => {
        setQrCodes(data);
        if (passedIds.length === 0 && data.length > 0) {
          setSelectedIds(new Set(data.slice(0, 10).map((q) => q.qrNumber)));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return qrCodes;
    return qrCodes.filter(
      (r) => r.qrNumber.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q),
    );
  }, [qrCodes, query]);

  const selected = useMemo(
    () => qrCodes.filter((r) => selectedIds.has(r.qrNumber)),
    [qrCodes, selectedIds],
  );

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((r) => selectedIds.has(r.qrNumber))) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.qrNumber));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(r.qrNumber));
        return next;
      });
    }
  }

  function set<K extends keyof LabelSettings>(key: K, value: LabelSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function applyPreset(idx: number) {
    const p = PRESETS[idx];
    setActivePreset(idx);
    setSettings((s) => ({ ...s, width: p.w, height: p.h }));
  }

  function handlePrint() {
    if (selected.length === 0) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const { width, height, shape, radius, columns, colGap, rowGap,
      pageMarginH, pageMarginV, showCode, fontSize, qrPadding } = settings;

    const labelHtml = selected
      .map((q) => {
        const imgSize = Math.round(mmToPx(Math.min(width, height) - qrPadding * 2, 150));
        return `<div class="label">
          <img src="${qrUrl(q.qrNumber, imgSize * 2)}" alt="${q.qrNumber}" />
          ${showCode ? `<div class="code">${q.qrNumber}</div>` : ""}
        </div>`;
      })
      .join("");

    const borderRadius = shape === "rounded" ? `${radius}mm` : "0";

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>QR Labels — Tashi Brakes</title>
<style>
  @page { margin: 0; size: auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    margin: ${pageMarginV}mm ${pageMarginH}mm;
    font-family: monospace;
    background: white;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(${columns}, ${width}mm);
    column-gap: ${colGap}mm;
    row-gap: ${rowGap}mm;
  }
  .label {
    width: ${width}mm;
    height: ${height}mm;
    border: 0.3mm solid #000;
    border-radius: ${borderRadius};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${qrPadding}mm;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .label img {
    width: 100%;
    flex: 1;
    object-fit: contain;
    min-height: 0;
  }
  .code {
    font-size: ${fontSize}pt;
    text-align: center;
    letter-spacing: 0.02em;
    margin-top: 0.5mm;
    line-height: 1.1;
    word-break: break-all;
  }
</style>
</head>
<body>
<div class="grid">${labelHtml}</div>
<script>
  window.onload = function() {
    // wait for QR images to load
    var imgs = document.querySelectorAll('img');
    var loaded = 0;
    function tryPrint() { loaded++; if (loaded >= imgs.length) window.print(); }
    if (imgs.length === 0) { window.print(); return; }
    imgs.forEach(function(img) {
      if (img.complete) tryPrint();
      else { img.onload = tryPrint; img.onerror = tryPrint; }
    });
  };
<\/script>
</body>
</html>`);
    win.document.close();
  }

  const previewScale = 2.2;
  const pxW = mmToPx(settings.width) * previewScale;
  const pxH = mmToPx(settings.height) * previewScale;
  const previewCount = Math.min(selected.length, settings.columns * 3);
  const previewItems = selected.slice(0, previewCount);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => navigate("/admin/qr-codes")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-100"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-brand-600" />
          <span className="font-semibold text-ink-900">Label Print Studio</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-ink-500">{selected.length} label{selected.length !== 1 ? "s" : ""} selected</span>
          <button
            onClick={handlePrint}
            disabled={selected.length === 0}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors",
              selected.length > 0
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "cursor-not-allowed bg-ink-200 text-ink-400",
            )}
          >
            <Printer className="h-4 w-4" />
            Print Labels
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: QR selector ── */}
        <aside className="flex w-64 flex-shrink-0 flex-col border-r border-ink-200 bg-white">
          <div className="border-b border-ink-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                className="w-full rounded-md border border-ink-200 bg-ink-50 py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                placeholder="Search QR or product…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-1.5">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-900"
            >
              {filtered.length > 0 && filtered.every((r) => selectedIds.has(r.qrNumber))
                ? <CheckSquare className="h-3.5 w-3.5" />
                : <Square className="h-3.5 w-3.5" />}
              {filtered.every((r) => selectedIds.has(r.qrNumber)) ? "Deselect all" : "Select all"}
            </button>
            <span className="text-[10px] text-ink-400">{filtered.length} codes</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-5 w-5 animate-spin text-ink-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-ink-400">No QR codes found</p>
            ) : (
              filtered.map((q) => {
                const on = selectedIds.has(q.qrNumber);
                return (
                  <label
                    key={q.qrNumber}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 border-b border-ink-50 px-3 py-2 hover:bg-brand-50/60",
                      on && "bg-brand-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-brand-500"
                      checked={on}
                      onChange={() => toggleId(q.qrNumber)}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10px] font-semibold text-brand-700">
                        {q.qrNumber}
                      </div>
                      <div className="truncate text-[10px] text-ink-500">{q.productName}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Center: Preview ── */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="border-b border-ink-200 bg-white px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Label Preview</p>
            <p className="text-[11px] text-ink-400 mt-0.5">Approximate — actual print uses exact mm measurements</p>
          </div>

          <div className="flex-1 p-6">
            {previewItems.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-ink-200 text-sm text-ink-400">
                Select QR codes from the left panel to preview
              </div>
            ) : (
              <div
                className="inline-grid rounded-md bg-white p-4 shadow-md"
                style={{
                  gridTemplateColumns: `repeat(${settings.columns}, ${pxW}px)`,
                  gap: `${mmToPx(settings.rowGap) * previewScale}px ${mmToPx(settings.colGap) * previewScale}px`,
                }}
              >
                {previewItems.map((q) => (
                  <div
                    key={q.qrNumber}
                    className="flex flex-col items-center justify-center overflow-hidden border border-ink-300 bg-white"
                    style={{
                      width: pxW,
                      height: pxH,
                      borderRadius: settings.shape === "rounded" ? mmToPx(settings.radius) * previewScale : 0,
                      padding: mmToPx(settings.qrPadding) * previewScale,
                    }}
                  >
                    <img
                      src={qrUrl(q.qrNumber, 200)}
                      alt={q.qrNumber}
                      className="min-h-0 flex-1 object-contain"
                      style={{ width: "100%" }}
                    />
                    {settings.showCode && (
                      <div
                        className="w-full break-all text-center font-mono leading-tight text-ink-800"
                        style={{ fontSize: Math.max(6, settings.fontSize * previewScale * 0.6) }}
                      >
                        {q.qrNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selected.length > previewCount && (
              <p className="mt-3 text-xs text-ink-400">
                + {selected.length - previewCount} more label{selected.length - previewCount !== 1 ? "s" : ""} (not shown in preview)
              </p>
            )}
          </div>
        </div>

        {/* ── Right: Settings ── */}
        <aside className="w-64 flex-shrink-0 overflow-y-auto border-l border-ink-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Label Settings</p>

          {/* Size presets */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold text-ink-600">Size Presets</label>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(i)}
                  className={cn(
                    "rounded border px-1.5 py-1 text-[10px] font-medium transition-colors",
                    activePreset === i
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50/50",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom dimensions */}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink-600">Width (mm)</label>
              <input
                type="number"
                min={10} max={200}
                className="w-full rounded border border-ink-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                value={settings.width}
                onChange={(e) => { setActivePreset(null); set("width", Number(e.target.value)); }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-ink-600">Height (mm)</label>
              <input
                type="number"
                min={10} max={200}
                className="w-full rounded border border-ink-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                value={settings.height}
                onChange={(e) => { setActivePreset(null); set("height", Number(e.target.value)); }}
              />
            </div>
          </div>

          {/* Shape */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold text-ink-600">Sticker Shape</label>
            <div className="flex gap-2">
              <button
                onClick={() => set("shape", "rect")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded border px-2 py-2 text-[11px] font-medium transition-colors",
                  settings.shape === "rect"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-500 hover:border-brand-300",
                )}
              >
                <RectangleHorizontal className="h-3.5 w-3.5" />
                Rectangle
              </button>
              <button
                onClick={() => set("shape", "rounded")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded border px-2 py-2 text-[11px] font-medium transition-colors",
                  settings.shape === "rounded"
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-500 hover:border-brand-300",
                )}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Rounded
              </button>
            </div>

            {settings.shape === "rounded" && (
              <div className="mt-2">
                <label className="mb-1 block text-[11px] text-ink-500">
                  Corner radius — {settings.radius} mm
                </label>
                <input
                  type="range"
                  min={1} max={15} step={1}
                  value={settings.radius}
                  onChange={(e) => set("radius", Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>
            )}
          </div>

          {/* Layout */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold text-ink-600">Layout</label>
            <div className="space-y-2">
              <div>
                <label className="mb-0.5 block text-[10px] text-ink-500">Columns — {settings.columns}</label>
                <input type="range" min={1} max={6} step={1} value={settings.columns}
                  onChange={(e) => set("columns", Number(e.target.value))}
                  className="w-full accent-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-ink-500">Col gap (mm)</label>
                  <input type="number" min={0} max={20} className="w-full rounded border border-ink-200 px-2 py-1 text-xs"
                    value={settings.colGap} onChange={(e) => set("colGap", Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-ink-500">Row gap (mm)</label>
                  <input type="number" min={0} max={20} className="w-full rounded border border-ink-200 px-2 py-1 text-xs"
                    value={settings.rowGap} onChange={(e) => set("rowGap", Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-ink-500">Page margin H (mm)</label>
                  <input type="number" min={0} max={50} className="w-full rounded border border-ink-200 px-2 py-1 text-xs"
                    value={settings.pageMarginH} onChange={(e) => set("pageMarginH", Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-ink-500">Page margin V (mm)</label>
                  <input type="number" min={0} max={50} className="w-full rounded border border-ink-200 px-2 py-1 text-xs"
                    value={settings.pageMarginV} onChange={(e) => set("pageMarginV", Number(e.target.value))} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-semibold text-ink-600">Content</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] text-ink-700 cursor-pointer">
                <input type="checkbox" className="accent-brand-500" checked={settings.showCode}
                  onChange={(e) => set("showCode", e.target.checked)} />
                Show QR number below code
              </label>
              {settings.showCode && (
                <div>
                  <label className="mb-0.5 block text-[10px] text-ink-500">Font size (pt) — {settings.fontSize}</label>
                  <input type="range" min={5} max={14} step={1} value={settings.fontSize}
                    onChange={(e) => set("fontSize", Number(e.target.value))}
                    className="w-full accent-brand-500" />
                </div>
              )}
              <div>
                <label className="mb-0.5 block text-[10px] text-ink-500">QR inner padding (mm) — {settings.qrPadding}</label>
                <input type="range" min={0} max={10} step={0.5} value={settings.qrPadding}
                  onChange={(e) => set("qrPadding", Number(e.target.value))}
                  className="w-full accent-brand-500" />
              </div>
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={selected.length === 0}
            className={cn(
              "mt-2 w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
              selected.length > 0
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "cursor-not-allowed bg-ink-200 text-ink-400",
            )}
          >
            <Printer className="h-4 w-4" />
            Print {selected.length > 0 ? `${selected.length} Label${selected.length !== 1 ? "s" : ""}` : "Labels"}
          </button>
        </aside>
      </div>
    </div>
  );
}

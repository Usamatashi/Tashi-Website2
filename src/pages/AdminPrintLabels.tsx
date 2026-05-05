import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Printer, Search, ChevronLeft, RefreshCw,
  CheckSquare, Square, RectangleHorizontal, Maximize2,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,

} from "lucide-react";
import { adminListQRCodes, type QRCode } from "@/lib/admin";
import { cn } from "@/lib/utils";

interface LabelSettings {
  width: number;    // cm
  height: number;   // cm
  shape: "rect" | "rounded";
  radius: number;   // cm
  showCode: boolean;
  fontSize: number; // pt
  qrPadding: number; // cm
}

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: "3.8 × 2.5 cm", w: 3.8, h: 2.5 },
  { label: "4.0 × 3.0 cm", w: 4.0, h: 3.0 },
  { label: "5.0 × 2.5 cm", w: 5.0, h: 2.5 },
  { label: "5.0 × 3.0 cm", w: 5.0, h: 3.0 },
  { label: "6.0 × 4.0 cm", w: 6.0, h: 4.0 },
  { label: "6.2 × 2.9 cm", w: 6.2, h: 2.9 },
  { label: "10 × 5.0 cm",  w: 10.0, h: 5.0 },
];

const DEFAULT: LabelSettings = {
  width: 5.0,
  height: 3.0,
  shape: "rounded",
  radius: 0.4,
  showCode: false,
  fontSize: 7,
  qrPadding: 0.2,
};

function qrUrl(code: string, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&data=${encodeURIComponent(code)}`;
}

// cm → px for screen preview
function cmToPx(cm: number, dpi = 96) {
  return (cm / 2.54) * dpi;
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
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

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
    const allOn = filtered.every((r) => selectedIds.has(r.qrNumber));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => allOn ? next.delete(r.qrNumber) : next.add(r.qrNumber));
      return next;
    });
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

    const { width, height, shape, radius, showCode, fontSize, qrPadding } = settings;

    // All cm → mm
    const wMm  = width  * 10;
    const hMm  = height * 10;
    const rMm  = radius * 10;
    const pdMm = qrPadding * 10;

    const borderRadius = shape === "rounded" ? `${rMm}mm` : "0";
    const textReserveMm = showCode ? fontSize * 0.35 + 1.5 : 0;
    const qrSideMm = Math.min(wMm - pdMm * 2, hMm - pdMm * 2 - textReserveMm);
    const qrTopMm  = (hMm - qrSideMm - textReserveMm) / 2;
    const qrLeftMm = (wMm - qrSideMm) / 2;

    const sharedLabelCss = `
  .label {
    border: 0.3mm solid #000;
    border-radius: ${borderRadius};
    position: relative;
    display: block;
    overflow: hidden;
    width: ${wMm}mm;
    height: ${hMm}mm;
  }
  .label img {
    position: absolute;
    width: ${qrSideMm}mm;
    height: ${qrSideMm}mm;
    top: ${qrTopMm}mm;
    left: ${qrLeftMm}mm;
    display: block;
  }
  .code {
    position: absolute;
    bottom: ${pdMm}mm;
    left: 0;
    width: ${wMm}mm;
    font-size: ${fontSize}pt;
    text-align: center;
    letter-spacing: 0.02em;
    line-height: 1.1;
    word-break: break-all;
  }`;

    const pageStyle = `
  @page { size: ${wMm}mm ${hMm}mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background: white; }
  .label { page-break-after: always; break-after: page; }
  ${sharedLabelCss}`;

    const bodyHtml = selected.map((q) =>
      `<div class="label">
        <img src="${qrUrl(q.qrNumber, 600)}" alt="${q.qrNumber}" />
        ${showCode ? `<div class="code">${q.qrNumber}</div>` : ""}
      </div>`
    ).join("");

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>QR Labels — Tashi Brakes</title>
<style>${pageStyle}
</style>
</head>
<body>
${bodyHtml}
<script>
  window.onload = function() {
    var imgs = document.querySelectorAll('img'), loaded = 0;
    function tryPrint() { if (++loaded >= imgs.length) window.print(); }
    if (!imgs.length) { window.print(); return; }
    imgs.forEach(function(img) { img.complete ? tryPrint() : (img.onload = img.onerror = tryPrint); });
  };
<\/script>
</body>
</html>`);
    win.document.close();
  }

  const previewScale = 2.5;
  const pxW = cmToPx(settings.width) * previewScale;
  const pxH = cmToPx(settings.height) * previewScale;
  const previewCount = Math.min(selected.length, settings.columns * 3);
  const previewItems = selected.slice(0, previewCount);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-ink-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => navigate("/admin/qr-codes")}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-100"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-brand-600" />
          <span className="font-semibold text-ink-900">Label Print Studio</span>
        </div>

        {/* Panel toggles */}
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setLeftOpen((v) => !v)}
            title={leftOpen ? "Hide QR selector" : "Show QR selector"}
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
          >
            {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setRightOpen((v) => !v)}
            title={rightOpen ? "Hide settings" : "Show settings"}
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
          >
            {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-ink-500">
            {selected.length} label{selected.length !== 1 ? "s" : ""} selected
          </span>
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
            <Printer className="h-4 w-4" /> Print Labels
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: QR selector ── */}
        {leftOpen && (
          <aside className="flex w-64 flex-shrink-0 flex-col border-r border-ink-200 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Select QR Codes
              </span>
              <button onClick={() => setLeftOpen(false)} className="rounded p-0.5 text-ink-400 hover:text-ink-700">
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Search */}
            <div className="border-b border-ink-100 p-2">
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

            {/* Select all */}
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

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="h-5 w-5 animate-spin text-ink-400" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-ink-400">No QR codes found</p>
              ) : filtered.map((q) => {
                const on = selectedIds.has(q.qrNumber);
                return (
                  <label
                    key={q.qrNumber}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 border-b border-ink-50 px-3 py-2 hover:bg-brand-50/60",
                      on && "bg-brand-50",
                    )}
                  >
                    <input type="checkbox" className="mt-0.5 accent-brand-500" checked={on}
                      onChange={() => toggleId(q.qrNumber)} />
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10px] font-semibold text-brand-700">
                        {q.qrNumber}
                      </div>
                      <div className="truncate text-[10px] text-ink-500">{q.productName}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </aside>
        )}

        {/* Collapsed left tab */}
        {!leftOpen && (
          <button
            onClick={() => setLeftOpen(true)}
            className="flex w-8 flex-shrink-0 flex-col items-center justify-center gap-1 border-r border-ink-200 bg-white py-4 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            title="Show QR selector"
          >
            <PanelLeftOpen className="h-4 w-4" />
            <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-medium tracking-wider">
              QR Codes
            </span>
          </button>
        )}

        {/* ── Center: Preview ── */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="border-b border-ink-200 bg-white px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Label Preview</p>
            <p className="text-[11px] text-ink-400 mt-0.5">
              Approximate — actual print uses exact cm measurements
            </p>
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
                  gap: `${cmToPx(settings.rowGap) * previewScale}px ${cmToPx(settings.colGap) * previewScale}px`,
                }}
              >
                {previewItems.map((q) => (
                  <div
                    key={q.qrNumber}
                    className="flex flex-col items-center justify-center overflow-hidden border border-ink-300 bg-white"
                    style={{
                      width: pxW,
                      height: pxH,
                      borderRadius: settings.shape === "rounded"
                        ? cmToPx(settings.radius) * previewScale
                        : 0,
                      padding: cmToPx(settings.qrPadding) * previewScale,
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
                        style={{ fontSize: Math.max(6, settings.fontSize * previewScale * 0.55) }}
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
                + {selected.length - previewCount} more label{selected.length - previewCount !== 1 ? "s" : ""} not shown in preview
              </p>
            )}
          </div>
        </div>

        {/* Collapsed right tab */}
        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="flex w-8 flex-shrink-0 flex-col items-center justify-center gap-1 border-l border-ink-200 bg-white py-4 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            title="Show settings"
          >
            <PanelRightOpen className="h-4 w-4" />
            <span className="[writing-mode:vertical-rl] text-[10px] font-medium tracking-wider">
              Settings
            </span>
          </button>
        )}

        {/* ── Right: Settings ── */}
        {rightOpen && (
          <aside className="w-64 flex-shrink-0 overflow-y-auto border-l border-ink-200 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Label Settings
              </span>
              <button onClick={() => setRightOpen(false)} className="rounded p-0.5 text-ink-400 hover:text-ink-700">
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4">

              {/* Size presets */}
              <div>
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

              {/* Custom dimensions in cm */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink-600">Width (cm)</label>
                  <input
                    type="number" min={1} max={30} step={0.1}
                    className="w-full rounded border border-ink-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                    value={settings.width}
                    onChange={(e) => { setActivePreset(null); set("width", Number(e.target.value)); }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-ink-600">Height (cm)</label>
                  <input
                    type="number" min={1} max={30} step={0.1}
                    className="w-full rounded border border-ink-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                    value={settings.height}
                    onChange={(e) => { setActivePreset(null); set("height", Number(e.target.value)); }}
                  />
                </div>
              </div>

              {/* Shape */}
              <div>
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
                    <RectangleHorizontal className="h-3.5 w-3.5" /> Rectangle
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
                    <Maximize2 className="h-3.5 w-3.5" /> Rounded
                  </button>
                </div>
                {settings.shape === "rounded" && (
                  <div className="mt-2">
                    <label className="mb-1 block text-[11px] text-ink-500">
                      Corner radius — {settings.radius.toFixed(1)} cm
                    </label>
                    <input
                      type="range" min={0.1} max={2} step={0.1}
                      value={settings.radius}
                      onChange={(e) => set("radius", Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-ink-600">Content</label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-700">
                    <input type="checkbox" className="accent-brand-500" checked={settings.showCode}
                      onChange={(e) => set("showCode", e.target.checked)} />
                    Show QR number below code
                  </label>
                  {settings.showCode && (
                    <div>
                      <label className="mb-0.5 block text-[10px] text-ink-500">
                        Font size (pt) — {settings.fontSize}
                      </label>
                      <input type="range" min={5} max={14} step={1} value={settings.fontSize}
                        onChange={(e) => set("fontSize", Number(e.target.value))}
                        className="w-full accent-brand-500" />
                    </div>
                  )}
                  <div>
                    <label className="mb-0.5 block text-[10px] text-ink-500">
                      Inner padding (cm) — {settings.qrPadding.toFixed(1)}
                    </label>
                    <input type="range" min={0} max={1} step={0.05} value={settings.qrPadding}
                      onChange={(e) => set("qrPadding", Number(e.target.value))}
                      className="w-full accent-brand-500" />
                  </div>
                </div>
              </div>

              {/* Print button */}
              <button
                onClick={handlePrint}
                disabled={selected.length === 0}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                  selected.length > 0
                    ? "bg-brand-500 text-white hover:bg-brand-600"
                    : "cursor-not-allowed bg-ink-200 text-ink-400",
                )}
              >
                <Printer className="h-4 w-4" />
                Print {selected.length > 0
                  ? `${selected.length} Label${selected.length !== 1 ? "s" : ""}`
                  : "Labels"}
              </button>

            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Printer, Search, ChevronLeft, RefreshCw,
  CheckSquare, Square, RectangleHorizontal, Maximize2,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  FileDown, Loader2,
} from "lucide-react";
import { adminListQRCodes, type QRCode } from "@/lib/admin";
import { cn } from "@/lib/utils";

interface LabelSettings {
  width: number;      // cm
  height: number;     // cm
  shape: "rect" | "rounded";
  radius: number;     // cm corner radius
  marginH: number;    // cm left/right margin inside sticker
  marginV: number;    // cm top/bottom margin inside sticker
  qrScale: number;    // 0–1, fraction of available space the QR fills
  showBorder: boolean;
  textMode: "none" | "qrNumber" | "productName" | "custom";
  customText: string;
  fontSize: number;   // pt
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
  marginH: 0.15,
  marginV: 0.15,
  qrScale: 0.85,
  showBorder: false,
  textMode: "none",
  customText: "",
  fontSize: 7,
};

const CM_TO_PT = 28.3465; // 1 cm = 28.3465 PDF points

function qrUrl(code: string, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&format=png&data=${encodeURIComponent(code)}`;
}

function cmToPx(cm: number, dpi = 96) {
  return (cm / 2.54) * dpi;
}

export default function AdminPrintLabels() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedIds: string[] = (location.state as any)?.selectedIds ?? [];

  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(passedIds));
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    adminListQRCodes()
      .then((data) => setQrCodes(data))
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

  async function handleGeneratePDF() {
    if (selected.length === 0 || generating) return;
    setGenerating(true);
    try {
      const { PDFDocument, rgb, LineCapStyle } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();

      const { width, height, marginH, marginV, qrScale, showBorder, textMode, customText, fontSize } = settings;

      const wPt  = width  * CM_TO_PT;
      const hPt  = height * CM_TO_PT;
      const mhPt = marginH * CM_TO_PT;
      const mvPt = marginV * CM_TO_PT;

      const hasText = textMode !== "none";
      const textReservePt = hasText ? fontSize * 1.4 + mvPt : 0;

      // Inner area after margins (PDF y=0 is bottom)
      const innerW = wPt - mhPt * 2;
      const innerH = hPt - mvPt * 2 - textReservePt;

      // QR size as a fraction of the smaller inner dimension
      const qrSizePt = Math.min(innerW, innerH) * qrScale;

      // Center QR within the inner area
      const qrX = (wPt - qrSizePt) / 2;
      const qrY = textReservePt + mvPt + (innerH - qrSizePt) / 2;

      for (const q of selected) {
        const page = pdfDoc.addPage([wPt, hPt]);

        if (showBorder) {
          page.drawRectangle({
            x: 1, y: 1,
            width: wPt - 2, height: hPt - 2,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5,
            color: undefined,
          });
        }

        const res = await fetch(qrUrl(q.qrNumber, 600));
        const bytes = await res.arrayBuffer();
        const img = await pdfDoc.embedPng(bytes);
        page.drawImage(img, { x: qrX, y: qrY, width: qrSizePt, height: qrSizePt });

        if (hasText) {
          const label =
            textMode === "qrNumber"    ? q.qrNumber :
            textMode === "productName" ? q.productName :
            customText;
          const charW = fontSize * 0.52;
          const textW = label.length * charW;
          page.drawText(label, {
            x: Math.max(mhPt, (wPt - textW) / 2),
            y: mvPt,
            size: fontSize,
            color: rgb(0, 0, 0),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tashi-labels-${selected.length}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  const previewScale = 2.5;
  const pxW = cmToPx(settings.width) * previewScale;
  const pxH = cmToPx(settings.height) * previewScale;
  const previewItems = selected.slice(0, 8);

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
            onClick={handleGeneratePDF}
            disabled={selected.length === 0 || generating}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors",
              selected.length > 0 && !generating
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "cursor-not-allowed bg-ink-200 text-ink-400",
            )}
          >
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><FileDown className="h-4 w-4" /> Download PDF</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: QR selector ── */}
        {leftOpen && (
          <aside className="flex w-64 flex-shrink-0 flex-col border-r border-ink-200 bg-white">
            <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                Select QR Codes
              </span>
              <button onClick={() => setLeftOpen(false)} className="rounded p-0.5 text-ink-400 hover:text-ink-700">
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>

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
              Screen preview — the downloaded PDF uses exact cm measurements
            </p>
          </div>

          {/* How-to-print instruction */}
          <div className="mx-5 mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-[11px] font-semibold text-blue-800 mb-1">How to print perfectly</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-700">
              <li>Click <strong>Download PDF</strong> — one label per page, exact size</li>
              <li>Open the PDF in <strong>Adobe Acrobat Reader</strong></li>
              <li>File → Print → set Size to <strong>"Actual size"</strong> (not "Fit" or "Shrink")</li>
              <li>Select your <strong>4BARCODE</strong> printer → Print</li>
            </ol>
          </div>

          <div className="flex-1 p-6">
            {previewItems.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-ink-200 text-sm text-ink-400">
                Select QR codes from the left panel to preview
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {previewItems.map((q) => (
                  <div
                    key={q.qrNumber}
                    className="flex flex-col items-center justify-center overflow-hidden border border-ink-300 bg-white shadow-sm"
                    style={{
                      width: pxW,
                      height: pxH,
                      borderRadius: settings.shape === "rounded"
                        ? cmToPx(settings.radius) * previewScale
                        : 0,
                      padding: cmToPx(settings.marginH) * previewScale,
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

            {selected.length > previewItems.length && (
              <p className="mt-3 text-xs text-ink-400">
                + {selected.length - previewItems.length} more label{selected.length - previewItems.length !== 1 ? "s" : ""} not shown in preview
              </p>
            )}
          </div>
        </div>

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

              {/* Custom dimensions */}
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
                    <label className="mb-0.5 block text-[10px] text-ink-500">
                      Corner radius — {settings.radius.toFixed(1)} cm
                    </label>
                    <input type="range" min={0.1} max={2} step={0.1}
                      value={settings.radius}
                      onChange={(e) => set("radius", Number(e.target.value))}
                      className="w-full accent-brand-500" />
                  </div>
                )}
              </div>

              {/* Spacing */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-ink-600">Spacing</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-ink-500">Left/Right (cm)</label>
                      <input type="number" min={0} max={2} step={0.05}
                        className="w-full rounded border border-ink-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                        value={settings.marginH}
                        onChange={(e) => set("marginH", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-ink-500">Top/Bottom (cm)</label>
                      <input type="number" min={0} max={2} step={0.05}
                        className="w-full rounded border border-ink-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                        value={settings.marginV}
                        onChange={(e) => set("marginV", Number(e.target.value))} />
                    </div>
                  </div>
                  <p className="text-[9px] text-ink-400">Gap between sticker edge and content</p>
                  <div>
                    <label className="mb-0.5 block text-[10px] text-ink-500">
                      QR code size — {Math.round(settings.qrScale * 100)}%
                    </label>
                    <input type="range" min={0.4} max={1} step={0.05} value={settings.qrScale}
                      onChange={(e) => set("qrScale", Number(e.target.value))}
                      className="w-full accent-brand-500" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-ink-600">Content</label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-700">
                    <input type="checkbox" className="accent-brand-500" checked={settings.showBorder}
                      onChange={(e) => set("showBorder", e.target.checked)} />
                    Print border outline in PDF
                  </label>

                  <div>
                    <label className="mb-1 block text-[10px] text-ink-500">Text below QR code</label>
                    <div className="space-y-1">
                      {(["none", "qrNumber", "productName", "custom"] as const).map((mode) => (
                        <label key={mode} className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-700">
                          <input type="radio" className="accent-brand-500"
                            checked={settings.textMode === mode}
                            onChange={() => set("textMode", mode)} />
                          {mode === "none"        ? "None" :
                           mode === "qrNumber"    ? "QR Number (auto)" :
                           mode === "productName" ? "Product Name (auto)" :
                                                   "Custom text"}
                        </label>
                      ))}
                    </div>
                    {settings.textMode === "custom" && (
                      <input
                        type="text"
                        placeholder="Type text for all labels…"
                        className="mt-2 w-full rounded border border-ink-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                        value={settings.customText}
                        onChange={(e) => set("customText", e.target.value)}
                      />
                    )}
                  </div>

                  {settings.textMode !== "none" && (
                    <div>
                      <label className="mb-0.5 block text-[10px] text-ink-500">
                        Font size (pt) — {settings.fontSize}
                      </label>
                      <input type="range" min={5} max={14} step={1} value={settings.fontSize}
                        onChange={(e) => set("fontSize", Number(e.target.value))}
                        className="w-full accent-brand-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={handleGeneratePDF}
                disabled={selected.length === 0 || generating}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
                  selected.length > 0 && !generating
                    ? "bg-brand-500 text-white hover:bg-brand-600"
                    : "cursor-not-allowed bg-ink-200 text-ink-400",
                )}
              >
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><FileDown className="h-4 w-4" />
                    {selected.length > 0
                      ? `Download ${selected.length} Label${selected.length !== 1 ? "s" : ""} PDF`
                      : "Download PDF"}
                  </>}
              </button>

            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

import { CalendarDays, X, MoveRight } from "lucide-react";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  maxDate?: string;
  className?: string;
}

function formatDisplay(iso: string) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function DateRangeFilter({
  from, to, onFromChange, onToChange, maxDate, className = "",
}: DateRangeFilterProps) {
  const hasValues = from || to;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* From card */}
      <label className={`relative flex flex-col cursor-pointer rounded-2xl border px-4 py-2.5 min-w-[130px] transition-all duration-200 hover:shadow-md group
        ${from
          ? "bg-brand-600 border-brand-600 shadow-md shadow-brand-200"
          : "bg-white border-ink-200 hover:border-brand-300"
        }`}>
        <span className={`text-[9px] font-black uppercase tracking-[0.18em] mb-0.5 transition-colors ${from ? "text-brand-200" : "text-ink-400 group-hover:text-brand-500"}`}>
          From
        </span>
        <span className={`text-sm font-bold leading-tight transition-colors ${from ? "text-white" : "text-ink-400"}`}>
          {from ? formatDisplay(from) : "Pick date"}
        </span>
        <CalendarDays className={`absolute top-2.5 right-3 h-3.5 w-3.5 transition-colors ${from ? "text-brand-300" : "text-ink-300 group-hover:text-brand-400"}`} />
        <input
          type="date"
          value={from}
          max={to || maxDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>

      {/* Connector arrow */}
      <MoveRight className={`h-4 w-4 flex-shrink-0 transition-colors ${from && to ? "text-brand-500" : "text-ink-300"}`} />

      {/* To card */}
      <label className={`relative flex flex-col cursor-pointer rounded-2xl border px-4 py-2.5 min-w-[130px] transition-all duration-200 hover:shadow-md group
        ${to
          ? "bg-brand-600 border-brand-600 shadow-md shadow-brand-200"
          : "bg-white border-ink-200 hover:border-brand-300"
        }`}>
        <span className={`text-[9px] font-black uppercase tracking-[0.18em] mb-0.5 transition-colors ${to ? "text-brand-200" : "text-ink-400 group-hover:text-brand-500"}`}>
          To
        </span>
        <span className={`text-sm font-bold leading-tight transition-colors ${to ? "text-white" : "text-ink-400"}`}>
          {to ? formatDisplay(to) : "Pick date"}
        </span>
        <CalendarDays className={`absolute top-2.5 right-3 h-3.5 w-3.5 transition-colors ${to ? "text-brand-300" : "text-ink-300 group-hover:text-brand-400"}`} />
        <input
          type="date"
          value={to}
          min={from}
          max={maxDate}
          onChange={(e) => onToChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>

      {/* Clear */}
      {hasValues && (
        <button
          onClick={() => { onFromChange(""); onToChange(""); }}
          title="Clear dates"
          className="flex items-center justify-center h-9 w-9 rounded-2xl border border-ink-200 bg-white text-ink-300 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200 hover:shadow-md flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface SingleDateFilterProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  className?: string;
}

export function SingleDateFilter({
  label = "As of", value, onChange, min, max, className = "",
}: SingleDateFilterProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <label className={`relative flex flex-col cursor-pointer rounded-2xl border px-4 py-2.5 min-w-[145px] transition-all duration-200 hover:shadow-md group
        ${value
          ? "bg-brand-600 border-brand-600 shadow-md shadow-brand-200"
          : "bg-white border-ink-200 hover:border-brand-300"
        }`}>
        <span className={`text-[9px] font-black uppercase tracking-[0.18em] mb-0.5 transition-colors ${value ? "text-brand-200" : "text-ink-400 group-hover:text-brand-500"}`}>
          {label}
        </span>
        <span className={`text-sm font-bold leading-tight transition-colors ${value ? "text-white" : "text-ink-400"}`}>
          {value ? formatDisplay(value) : "Pick date"}
        </span>
        <CalendarDays className={`absolute top-2.5 right-3 h-3.5 w-3.5 transition-colors ${value ? "text-brand-300" : "text-ink-300 group-hover:text-brand-400"}`} />
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      {value && (
        <button
          onClick={() => onChange("")}
          title="Clear"
          className="flex items-center justify-center h-9 w-9 rounded-2xl border border-ink-200 bg-white text-ink-300 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200 hover:shadow-md flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface FormDateInputProps {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
}

export function FormDateInput({ value, onChange, min, max, required, className = "" }: FormDateInputProps) {
  return (
    <label className={`relative flex items-center gap-3 cursor-pointer rounded-2xl border px-4 py-2.5 transition-all duration-200 hover:shadow-md group
      ${value
        ? "bg-brand-600 border-brand-600 shadow-sm shadow-brand-200"
        : "bg-white border-ink-200 hover:border-brand-300 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 focus-within:ring-offset-1"
      } ${className}`}>
      <CalendarDays className={`h-4 w-4 flex-shrink-0 transition-colors ${value ? "text-brand-200" : "text-ink-400 group-hover:text-brand-500"}`} />
      <div className="flex flex-col min-w-0">
        <span className={`text-[9px] font-black uppercase tracking-[0.18em] leading-none mb-0.5 ${value ? "text-brand-200" : "text-ink-400"}`}>
          Date
        </span>
        <span className={`text-sm font-bold leading-tight ${value ? "text-white" : "text-ink-400"}`}>
          {value ? formatDisplay(value) : "Pick a date"}
        </span>
      </div>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </label>
  );
}

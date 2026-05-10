import { CalendarDays, X, ArrowRight } from "lucide-react";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  maxDate?: string;
  className?: string;
}

export function DateRangeFilter({
  from, to, onFromChange, onToChange, maxDate, className = "",
}: DateRangeFilterProps) {
  const hasValues = from || to;
  return (
    <div className={`inline-flex items-center rounded-xl overflow-hidden border border-ink-200 bg-white shadow-sm ${className}`}>
      {/* Icon badge */}
      <span className="flex items-center self-stretch px-3 bg-gradient-to-b from-brand-50 to-orange-50 border-r border-ink-200">
        <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
      </span>

      {/* From */}
      <label className="flex items-center gap-1.5 px-3 py-2 cursor-pointer group">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400 group-hover:text-brand-500 transition-colors select-none">
          From
        </span>
        <input
          type="date"
          value={from}
          max={to || maxDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="w-[8rem] bg-transparent text-xs font-semibold text-ink-800 outline-none border-none cursor-pointer appearance-none [color-scheme:light]"
        />
      </label>

      {/* Separator */}
      <ArrowRight className="h-3 w-3 text-ink-300 flex-shrink-0 -mx-0.5" />

      {/* To */}
      <label className="flex items-center gap-1.5 px-3 py-2 cursor-pointer group">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400 group-hover:text-brand-500 transition-colors select-none">
          To
        </span>
        <input
          type="date"
          value={to}
          min={from}
          max={maxDate}
          onChange={(e) => onToChange(e.target.value)}
          className="w-[8rem] bg-transparent text-xs font-semibold text-ink-800 outline-none border-none cursor-pointer appearance-none [color-scheme:light]"
        />
      </label>

      {/* Clear */}
      {hasValues && (
        <button
          onClick={() => { onFromChange(""); onToChange(""); }}
          title="Clear dates"
          className="flex items-center self-stretch px-2.5 border-l border-ink-200 text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors"
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
    <div className={`inline-flex items-center rounded-xl overflow-hidden border border-ink-200 bg-white shadow-sm ${className}`}>
      <span className="flex items-center self-stretch px-3 bg-gradient-to-b from-brand-50 to-orange-50 border-r border-ink-200">
        <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
      </span>
      <label className="flex items-center gap-1.5 px-3 py-2 cursor-pointer group">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400 group-hover:text-brand-500 transition-colors select-none">
          {label}
        </span>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="w-[8rem] bg-transparent text-xs font-semibold text-ink-800 outline-none border-none cursor-pointer appearance-none [color-scheme:light]"
        />
      </label>
      {value && (
        <button
          onClick={() => onChange("")}
          title="Clear"
          className="flex items-center self-stretch px-2.5 border-l border-ink-200 text-ink-300 hover:text-red-500 hover:bg-red-50 transition-colors"
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
    <div className={`relative flex items-center rounded-xl border border-ink-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-brand-300 focus-within:border-brand-400 transition-shadow ${className}`}>
      <span className="flex items-center self-stretch px-3 bg-gradient-to-b from-brand-50 to-orange-50 border-r border-ink-200">
        <CalendarDays className="h-3.5 w-3.5 text-brand-500" />
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm font-medium text-ink-800 bg-transparent outline-none border-none cursor-pointer appearance-none [color-scheme:light]"
      />
    </div>
  );
}

import { CalendarDays, X, ArrowRight, Calendar } from "lucide-react";

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
  const hasFrom = Boolean(from);
  const hasTo = Boolean(to);

  return (
    <div className={`group inline-flex items-center rounded-2xl overflow-hidden border border-ink-200 bg-white shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-200 ${className}`}>
      {/* Icon badge */}
      <span className="flex items-center self-stretch px-3.5 bg-gradient-to-br from-brand-500 to-orange-600 border-r border-brand-400">
        <CalendarDays className="h-4 w-4 text-white drop-shadow-sm" />
      </span>

      {/* From */}
      <label className={`relative flex items-center gap-2 px-3.5 py-2.5 cursor-pointer transition-colors duration-150 ${hasFrom ? "bg-brand-50/60" : "hover:bg-ink-50"}`}>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest select-none transition-colors duration-150 ${hasFrom ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}`}>
          From
        </span>
        <input
          type="date"
          value={from}
          max={to || maxDate}
          onChange={(e) => onFromChange(e.target.value)}
          className={`w-[8.5rem] bg-transparent text-xs font-bold outline-none border-none cursor-pointer appearance-none [color-scheme:light] transition-colors duration-150 ${hasFrom ? "text-brand-700" : "text-ink-700"}`}
        />
        {hasFrom && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-400 to-orange-400 rounded-full" />
        )}
      </label>

      {/* Separator */}
      <span className="flex items-center px-1">
        <ArrowRight className="h-3.5 w-3.5 text-ink-300 flex-shrink-0" />
      </span>

      {/* To */}
      <label className={`relative flex items-center gap-2 px-3.5 py-2.5 cursor-pointer transition-colors duration-150 ${hasTo ? "bg-brand-50/60" : "hover:bg-ink-50"}`}>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest select-none transition-colors duration-150 ${hasTo ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}`}>
          To
        </span>
        <input
          type="date"
          value={to}
          min={from}
          max={maxDate}
          onChange={(e) => onToChange(e.target.value)}
          className={`w-[8.5rem] bg-transparent text-xs font-bold outline-none border-none cursor-pointer appearance-none [color-scheme:light] transition-colors duration-150 ${hasTo ? "text-brand-700" : "text-ink-700"}`}
        />
        {hasTo && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-400 to-orange-400 rounded-full" />
        )}
      </label>

      {/* Clear */}
      {hasValues && (
        <button
          onClick={() => { onFromChange(""); onToChange(""); }}
          title="Clear dates"
          className="flex items-center self-stretch px-3 border-l border-ink-200 text-ink-300 hover:text-white hover:bg-red-500 active:bg-red-600 transition-all duration-150"
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
  const hasValue = Boolean(value);

  return (
    <div className={`group inline-flex items-center rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition-all duration-200 ${hasValue ? "border-brand-300 shadow-brand-100" : "border-ink-200 hover:border-brand-300"} ${className}`}>
      {/* Icon badge */}
      <span className="flex items-center self-stretch px-3.5 bg-gradient-to-br from-brand-500 to-orange-600 border-r border-brand-400">
        <Calendar className="h-4 w-4 text-white drop-shadow-sm" />
      </span>
      <label className={`relative flex items-center gap-2 px-3.5 py-2.5 cursor-pointer transition-colors duration-150 ${hasValue ? "bg-brand-50/60" : "hover:bg-ink-50"}`}>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest select-none transition-colors ${hasValue ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600"}`}>
          {label}
        </span>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={`w-[8.5rem] bg-transparent text-xs font-bold outline-none border-none cursor-pointer appearance-none [color-scheme:light] ${hasValue ? "text-brand-700" : "text-ink-700"}`}
        />
        {hasValue && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-400 to-orange-400 rounded-full" />
        )}
      </label>
      {hasValue && (
        <button
          onClick={() => onChange("")}
          title="Clear"
          className="flex items-center self-stretch px-3 border-l border-ink-200 text-ink-300 hover:text-white hover:bg-red-500 active:bg-red-600 transition-all duration-150"
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
  const hasValue = Boolean(value);

  return (
    <div className={`group relative flex items-center rounded-2xl border bg-white overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-300/60 focus-within:ring-offset-1 focus-within:border-brand-400 hover:border-brand-300 hover:shadow-md ${hasValue ? "border-brand-300 shadow-sm shadow-brand-100/50" : "border-ink-200 shadow-sm"} ${className}`}>
      <span className={`flex items-center self-stretch px-3.5 border-r transition-all duration-200 ${hasValue ? "bg-gradient-to-br from-brand-500 to-orange-600 border-brand-400" : "bg-gradient-to-br from-ink-50 to-ink-100 border-ink-200 group-focus-within:from-brand-500 group-focus-within:to-orange-600 group-focus-within:border-brand-400"}`}>
        <CalendarDays className={`h-4 w-4 drop-shadow-sm transition-colors duration-200 ${hasValue ? "text-white" : "text-ink-400 group-focus-within:text-white"}`} />
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 px-3.5 py-2.5 text-sm font-semibold bg-transparent outline-none border-none cursor-pointer appearance-none [color-scheme:light] transition-colors duration-150 ${hasValue ? "text-brand-700" : "text-ink-700 placeholder:text-ink-300"}`}
      />
      {hasValue && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-400 via-orange-400 to-brand-300" />
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Info } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-hydro-200 bg-white/60 px-3 py-2 text-sm text-hydro-900 " +
  "focus:ring-2 focus:ring-hydro-400 focus:outline-none transition-colors";

interface FormSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, icon, children, className }: FormSectionProps) {
  return (
    <div className={cn("glass rounded-2xl p-6", className)}>
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-lg font-semibold text-hydro-900">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface LabelProps {
  label: string;
  guidance?: string;
  htmlFor?: string;
}

function Label({ label, guidance, htmlFor }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-hydro-700 mb-1">
      {label}
      {guidance && (
        <span className="group relative">
          <Info className="w-3.5 h-3.5 text-hydro-300 cursor-help" />
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-56 p-2 rounded-lg bg-hydro-900 text-white text-xs z-50 shadow-lg">
            {guidance}
          </span>
        </span>
      )}
    </label>
  );
}

interface NumberInputProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  guidance?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function NumberInput({ label, value, onChange, guidance, unit, min, max, step, disabled }: NumberInputProps) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <Label label={label} guidance={guidance} htmlFor={id} />
      <div className="relative">
        <input
          id={id}
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(inputClass, unit && "pr-12", disabled && "opacity-50")}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-hydro-700">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  guidance?: string;
  placeholder?: string;
}

export function TextInput({ label, value, onChange, guidance, placeholder }: TextInputProps) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <Label label={label} guidance={guidance} htmlFor={id} />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

interface BooleanToggleProps {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  guidance?: string;
}

export function BooleanToggle({ label, value, onChange, guidance }: BooleanToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label label={label} guidance={guidance} />
      <button
        type="button"
        role="switch"
        aria-checked={value ?? false}
        aria-label={label}
        onClick={() => onChange(!(value ?? false))}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          value ? "bg-hydro-500" : "bg-hydro-200"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform",
            value ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

interface SelectInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  guidance?: string;
}

export function SelectInput({ label, value, onChange, options, guidance }: SelectInputProps) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <Label label={label} guidance={guidance} htmlFor={id} />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">— Vel —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

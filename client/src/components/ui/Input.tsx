import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string | null;
  helpText?: string | null;
}

/**
 * Reusable Input Component with label validation and error styles.
 */
export default function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  helpText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className={clsx("w-full flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-600 select-none">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={clsx(
          "w-full px-4 py-2.5 bg-white border rounded-xl text-sm placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-slate-200 focus:border-blue-500"
        )}
        {...props}
      />
      {error && (
        <span className="text-[11px] font-semibold text-red-600 mt-0.5 select-none animate-fade-in">
          {error}
        </span>
      )}
      {!error && helpText && (
        <span className="text-[10px] font-medium text-slate-400 mt-0.5 select-none">
          {helpText}
        </span>
      )}
    </div>
  );
}

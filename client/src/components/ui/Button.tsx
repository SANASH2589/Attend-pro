import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
}

/**
 * Reusable Button Component supporting multiple themes, states, and loading states.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/10 hover:shadow-lg hover:shadow-blue-600/20 border border-transparent cursor-pointer",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-sm cursor-pointer",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/10 hover:shadow-lg hover:shadow-red-600/20 border border-transparent cursor-pointer",
    ghost: "bg-transparent hover:bg-blue-50 text-blue-600 border border-transparent cursor-pointer"
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-4.5 py-2.5 text-sm"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(
        baseStyle,
        variants[variant],
        sizes[size],
        loading && "cursor-wait",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

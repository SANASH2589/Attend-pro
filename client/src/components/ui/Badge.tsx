import React from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral';
  className?: string;
}

/**
 * Reusable Pill Badge Component supporting success, warning, danger, and neutral status styles.
 */
export default function Badge({
  children,
  variant = 'neutral',
  className = ''
}: BadgeProps) {
  const variants = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    danger: "bg-red-50 text-red-700 border-red-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    neutral: "bg-slate-100 text-slate-700 border-slate-200"
  };

  return (
    <span className={clsx(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

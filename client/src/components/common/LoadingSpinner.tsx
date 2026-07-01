import React from 'react';
import clsx from 'clsx';

export interface LoadingSpinnerProps {
  fullPage?: boolean;
  className?: string;
}

export default function LoadingSpinner({ fullPage = false, className = "" }: LoadingSpinnerProps) {
  const spinnerElement = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={clsx(
        "animate-spin rounded-full border-4 border-slate-200 border-t-blue-600",
        fullPage ? "w-12 h-12" : "w-8 h-8",
        className
      )} />
      <span className={clsx(
        "font-medium text-slate-400 animate-pulse text-xs uppercase tracking-wider",
        fullPage ? "text-sm" : "text-xs"
      )}>
        Loading...
      </span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm">
        {spinnerElement}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 w-full h-full min-h-[200px]">
      {spinnerElement}
    </div>
  );
}

import React from 'react';
import clsx from 'clsx';

export default function DashboardCard({
  title,
  subtitle,
  actions,
  children,
  className = ""
}) {
  return (
    <div className={clsx(
      "bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col",
      className
    )}>
      {/* Card Header (only renders if title or subtitle or actions are provided) */}
      {(title || subtitle || actions) && (
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
          <div className="space-y-1">
            {title && (
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

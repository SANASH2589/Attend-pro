import React from 'react';
import clsx from 'clsx';

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className = ""
}) {
  return (
    <div className={clsx(
      "p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex items-start justify-between gap-4",
      className
    )}>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          {title}
        </span>
        <h3 className="text-3xl font-bold text-slate-800 tracking-tight">
          {value}
        </h3>
        {description && (
          <p className="text-xs font-medium text-slate-500">
            {description}
          </p>
        )}
        {trend && (
          <span className={clsx(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
            trend.type === 'success' && "bg-emerald-50 text-emerald-600",
            trend.type === 'danger' && "bg-red-50 text-red-600",
            trend.type === 'primary' && "bg-blue-50 text-blue-600",
            trend.type === 'neutral' && "bg-slate-50 text-slate-600"
          )}>
            {trend.text}
          </span>
        )}
      </div>

      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50">
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}

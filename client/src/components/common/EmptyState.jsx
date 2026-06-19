import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = "No records found",
  description = "Get started by adding a new entry or adjust your search filters.",
  icon: Icon = Inbox,
  actionButton
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-slate-200 rounded-2xl max-w-lg mx-auto my-8">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 mb-4 border border-slate-100 transition-colors hover:bg-blue-50 hover:text-blue-500 hover:border-blue-100 duration-300">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionButton && (
        <div className="animate-fade-in">
          {actionButton}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    onClick: () => void;
    label: string;
  };
}

/**
 * Reusable Empty State Placeholder Component with customizable Icon and CTA actions.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 shrink-0" />
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400 font-medium max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {action && (
        <Button 
          onClick={action.onClick}
          variant="primary"
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

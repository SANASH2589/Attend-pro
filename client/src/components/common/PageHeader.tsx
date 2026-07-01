import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Breadcrumb {
  label: string;
  path?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
}

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs = []
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      {/* Title & Info */}
      <div className="space-y-1.5">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
            <Link to="/super-admin/dashboard" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                {crumb.path ? (
                  <Link to={crumb.path} className="hover:text-blue-600 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-500 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Page Actions */}
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

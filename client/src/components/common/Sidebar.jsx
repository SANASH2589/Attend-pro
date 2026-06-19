import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Users, BookOpen } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Logo from './Logo';
import clsx from 'clsx';

export default function Sidebar({ onClose, className = "" }) {
  const { user, role } = useAuth();
  
  const menuItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard
    },
    {
      label: "Student Management",
      path: "/admin/student-management",
      icon: GraduationCap
    },
    {
      label: "Staff Management",
      path: "/admin/staff-management",
      icon: Users
    },
    {
      label: "Class Management",
      path: "/admin/class-management",
      icon: BookOpen
    }
  ];

  // Derive initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className={clsx(
      "w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-lg text-slate-300",
      className
    )}>
      <div className="flex flex-col flex-1">
        {/* Brand/Logo Header */}
        <div className="h-16 px-6 border-b border-slate-800/80 flex items-center shrink-0">
          <Logo className="invert brightness-0" />
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Navigation
            </span>
          </div>
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={idx}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-4.5 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/10"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={clsx("w-5 h-5 transition-transform duration-200 group-hover:scale-105 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-white rounded-l-md" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Account Details (Dynamic) */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0 text-sm select-none">
            {getInitials(user?.name)}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-white truncate">{user?.name || 'Academic User'}</h4>
            <span className="text-[10px] font-medium text-slate-500 truncate block">
              {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff'} &bull; {user?.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

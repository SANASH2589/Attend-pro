import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  History, 
  Link2,
  LogOut,
  Database,
  PanelLeftClose,
  PanelRightOpen,
  MessageSquare
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Logo from './Logo';
import clsx from 'clsx';

export interface SidebarProps {
  onClose?: () => void;
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ onClose, className = "", collapsed = false, onToggle }: SidebarProps) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  
  // Dynamic navigation items based on user role
  const getMenuItems = () => {
    if (role === 'super_admin') {
      // Super Admin: ONLY data management pages
      // NO attendance marking, NO staff attendance, NO daily attendance workflow
      return [
        {
          label: "Dashboard",
          path: "/super-admin/dashboard",
          icon: LayoutDashboard
        },
        {
          label: "Staff Management",
          path: "/super-admin/staff",
          icon: Users
        },
        {
          label: "Students",
          path: "/super-admin/students",
          icon: GraduationCap
        },
        {
          label: "Classes & Batches",
          path: "/super-admin/classes",
          icon: BookOpen
        },
        {
          label: "Assignments",
          path: "/super-admin/assignments",
          icon: Link2
        },
        {
          label: "Database",
          path: "/super-admin/database",
          icon: Database
        },
        {
          label: "Reports",
          path: "/super-admin/reports",
          icon: FileSpreadsheet
        },
        {
          label: "SMS Logs",
          path: "/super-admin/sms-logs",
          icon: MessageSquare
        }
      ];
    } else if (role === 'staff') {
      // Staff: ONLY attendance workflow pages
      // NO staff creation, NO CSV import, NO class creation, NO student management, NO system settings
      return [
        {
          label: "Dashboard",
          path: "/staff/dashboard",
          icon: LayoutDashboard
        },
        {
          label: "History",
          path: "/staff/history",
          icon: History
        },
        {
          label: "Reports",
          path: "/staff/reports",
          icon: FileSpreadsheet
        }
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();

  const handleLogoutClick = async () => {
    const loginPath = role === 'super_admin' ? '/super-admin/login' : '/staff/login';
    try {
      await logout();
      if (onClose) onClose();
      navigate(loginPath, { replace: true });
    } catch (err) {
      console.error('Logout navigation failed:', err);
    }
  };

  // Derive initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside 
      className={clsx(
        "h-full bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-lg text-slate-300",
        collapsed && "sidebar-collapsed",
        className
      )}
      style={{
        width: collapsed ? '88px' : '256px',
        transition: 'width 300ms ease-in-out',
        overflow: 'hidden',
        flexShrink: 0,
        alignItems: collapsed ? 'center' : undefined,
      }}
    >


      <div className="flex flex-col flex-1">
        {/* Brand/Logo Header */}
        {collapsed ? (
          <div
            className="shrink-0 flex flex-col items-center"
            style={{ padding: '16px 0 4px' }}
          >
            {/* Logo icon only — centered */}
            <Logo variant="dark" compact={true} />

            {/* Toggle button below logo */}
            {onToggle && (
              <button
                onClick={onToggle}
                className="rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center"
                style={{ width: 36, height: 36, marginTop: 4 }}
                title="Expand Sidebar"
              >
                <PanelRightOpen className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
        ) : (
          <div 
            className="border-b border-slate-800/80 flex items-center shrink-0 transition-all duration-300 relative justify-between px-6"
            style={{ height: 72 }}
          >
            <Logo variant="dark" compact={collapsed} />
            {onToggle && (
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all duration-200 cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Section */}
        {collapsed ? (
          <nav className="flex-1 py-3 flex flex-col items-center overflow-y-auto" style={{ gap: 8 }}>
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={idx}
                  to={item.path}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center justify-center rounded-xl transition-all duration-200 relative",
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/10"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    )
                  }
                  style={{
                    width: 48,
                    height: 48,
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={clsx(
                          "transition-transform duration-200 shrink-0",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        )}
                        style={{ width: 20, height: 20 }}
                      />
                      <span style={{ display: collapsed ? 'none' : 'flex' }}>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        ) : (
          <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 mb-2 transition-opacity duration-200">
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
                      "flex items-center rounded-xl text-sm font-medium transition-all duration-200 group relative px-4.5 gap-3 py-3",
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/10"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={clsx("w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                      <span style={{ display: collapsed ? 'none' : 'flex' }}>{item.label}</span>
                      {isActive && (
                        <span className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-white rounded-l-md" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>

      {/* Sidebar Footer Account Details */}
      {collapsed ? (
        <div
          className="border-t border-slate-800/80 bg-slate-950/20 flex flex-col items-center"
          style={{ padding: '16px 0', gap: 12 }}
        >
          {/* Avatar circle */}
          <div 
            className="relative rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm select-none cursor-default"
            style={{ width: 48, height: 48 }}
            title={`${user?.name || 'Academic User'} (${role === 'super_admin' ? 'Super Admin' : 'Staff'})`}
          >
            {getInitials(user?.name)}
          </div>

          {/* Sign out icon button */}
          <button
            onClick={handleLogoutClick}
            className="relative flex items-center justify-center text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/60 rounded-xl transition-all duration-200 cursor-pointer"
            style={{ width: 48, height: 48 }}
            title="Sign Out"
          >
            <LogOut style={{ width: 18, height: 18 }} />
          </button>
        </div>
      ) : (
        <div className="border-t border-slate-800/80 bg-slate-950/20 flex flex-col gap-3 transition-all duration-300 p-4">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div 
              className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0 text-sm select-none"
            >
              {getInitials(user?.name)}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-semibold text-white truncate">{user?.name || 'Academic User'}</h4>
              <span className="text-[10px] font-medium text-slate-500 truncate block">
                {role === 'super_admin' ? 'Super Admin' : 'Staff'} &bull; {user?.email}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/60 rounded-xl transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}

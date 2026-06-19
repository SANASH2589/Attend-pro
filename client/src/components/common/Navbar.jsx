import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { Bell, Menu, User, LogOut, Settings, HelpCircle } from 'lucide-react';
import SearchBar from './SearchBar';

export default function Navbar({ onMenuClick }) {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Derive page title from path
  const getPageTitle = (pathname) => {
    if (pathname.includes('/admin/dashboard')) return 'Dashboard Overview';
    if (pathname.includes('/admin/student-management')) return 'Student Registry';
    if (pathname.includes('/admin/staff-management')) return 'Faculty & Staff Registry';
    if (pathname.includes('/admin/class-management')) return 'Class & Course Planner';
    return 'Academic Console';
  };

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="h-16 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Left side: Title and Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-bold text-slate-800 tracking-tight hidden sm:block">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      {/* Right side: Mock Search, Notifications, Avatar */}
      <div className="flex items-center gap-4.5">
        {/* Mock Search Bar UI */}
        <div className="hidden md:block w-72">
          <SearchBar placeholder="Search students, staff, classes..." />
        </div>

        {/* Notifications Icon (Mock) */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-transparent hover:border-slate-200/60">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        {/* User Profile Dropdown Placeholder */}
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-slate-50 transition-colors focus:outline-none border border-slate-100 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200 text-xs select-none">
              {getInitials(user?.name)}
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden lg:block select-none">
              {user?.name || 'Academic User'}
            </span>
          </button>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowProfileDropdown(false)}
              />
              <div className="absolute right-0 mt-2.5 w-56 bg-white border border-slate-200/80 rounded-2xl shadow-lg py-2.5 z-20 animate-fade-in">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{user?.name || 'Academic User'}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{user?.email}</p>
                </div>
                
                <div className="py-1">
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                    <User className="w-4 h-4 text-slate-400" />
                    Profile Settings
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                    <Settings className="w-4 h-4 text-slate-400" />
                    System Configuration
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    Documentation & Help
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1.5 mt-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50/50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Notification {
  id:        string;
  title:     string;
  message:   string;
  type:      'sms_sent' | 'sms_failed' | 
             'session_locked' | 'info';
  read:      boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen]  = useState(false);
  const [notifications, setNotifications] = 
    useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications
    .filter(n => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && 
          !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => 
      document.removeEventListener(
        'mousedown', handleClick
      );
  }, []);

  // Fetch notifications on mount and set polling
  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(
      fetchNotifications, 
      30000  // 30 seconds
    );
    
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      const res = await fetch(
        '/api/v1/notifications',
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        }
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Notifications fetch error:', e);
    }
  }

  async function markAllRead() {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) return;

      await fetch('/api/v1/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (e) {
      console.error('Mark read error:', e);
    }
  }

  function getIcon(type: Notification['type']) {
    switch(type) {
      case 'sms_sent':     return '✅';
      case 'sms_failed':   return '❌';
      case 'session_locked': return '🔒';
      default:             return 'ℹ️';
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now  = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short'
    });
  }

  return (
    <div 
      ref={ref} 
      style={{ position: 'relative' }}
    >
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border border-transparent hover:border-slate-200/60 cursor-pointer"
        style={{
          position:       'relative',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background:     'transparent',
          width:          40,
          height:         40,
          borderRadius:   8,
        }}
      >
        <Bell size={20} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position:       'absolute',
            top:            2,
            right:          2,
            minWidth:       16,
            height:         16,
            borderRadius:   999,
            background:     '#DC2626',
            color:          '#ffffff',
            fontSize:       10,
            fontWeight:     600,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '0 4px',
            lineHeight:     1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:     'absolute',
          top:          'calc(100% + 8px)',
          right:        0,
          width:        340,
          maxHeight:    480,
          borderRadius: 12,
          border:       '1px solid #E2E8F0',
          background:   '#FFFFFF',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
          zIndex:       1000,
          overflow:     'hidden',
          display:      'flex',
          flexDirection:'column',
        }}>
          {/* Panel header */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '14px 16px',
            borderBottom:   '1px solid #E2E8F0',
          }}>
            <span style={{ 
              fontSize:   15, 
              fontWeight: 600, 
              color:      '#0F172A' 
            }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft:   8,
                  background:   '#EFF6FF',
                  color:        '#2563EB',
                  fontSize:     11,
                  fontWeight:   600,
                  padding:      '2px 8px',
                  borderRadius: 999,
                }}>
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize:   12,
                  color:      '#2563EB',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  padding:    0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ 
            overflowY: 'auto', 
            flex:       1 
          }}>
            {notifications.length === 0 ? (
              <div style={{
                padding:   40,
                textAlign: 'center',
                color:     '#94A3B8',
                fontSize:  14,
              }}>
                <Bell 
                  size={28} 
                  style={{ 
                    margin: '0 auto 8px',
                    display: 'block',
                    opacity: 0.4
                  }} 
                />
                No notifications yet
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    padding:     '12px 16px',
                    borderBottom:'1px solid #F1F5F9',
                    background:  notification.read 
                                 ? '#FFFFFF' 
                                 : '#F8FAFF',
                    display:     'flex',
                    gap:         12,
                    cursor:      'default',
                  }}
                >
                  {/* Type icon */}
                  <span style={{ 
                    fontSize:   18,
                    flexShrink: 0,
                    marginTop:  1
                  }}>
                    {getIcon(notification.type)}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:     13,
                      fontWeight:   notification.read 
                                    ? 400 : 600,
                      color:        '#0F172A',
                      marginBottom: 2,
                    }}>
                      {notification.title}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color:    '#475569',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                    }}>
                      {notification.message}
                    </div>
                    <div style={{
                      fontSize:   11,
                      color:      '#94A3B8',
                      marginTop:  4,
                    }}>
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notification.read && (
                    <div style={{
                      width:        8,
                      height:       8,
                      borderRadius: '50%',
                      background:   '#2563EB',
                      flexShrink:   0,
                      marginTop:    4,
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

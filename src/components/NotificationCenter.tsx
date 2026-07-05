import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings2, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  Shield, 
  Tag, 
  TrendingUp, 
  Wallet, 
  X, 
  ChevronRight 
} from 'lucide-react';
import { ZenitNotification, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

export default function NotificationCenter() {
  const { currentUser, userProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ZenitNotification[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<any>({
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    categories: {}
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user notifications
  const fetchNotifications = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/notifications', { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/notifications/settings', { headers });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
      console.error('Failed to load notification settings', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchSettings();

    // Auto-poll notifications every 15 seconds for realtime experience
    const interval = setInterval(fetchNotifications, 15000);

    // Close dropdown on click outside
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await RouterFetch(`/api/notifications/${id}/read`, 'POST', headers);
      if (res.success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await RouterFetch('/api/notifications/read-all', 'POST', headers);
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        success('Success', 'All notifications marked as read.');
      }
    } catch (e) {
      toastError('Error', 'Failed to mark notifications as read.');
    }
  };

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await RouterFetch(`/api/notifications/${id}`, 'DELETE', headers);
      if (res.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await RouterFetch('/api/notifications/settings', 'POST', headers, settings);
      if (res.success) {
        success('Settings Saved', 'Your notification preferences have been updated.');
        setSettingsOpen(false);
      }
    } catch (e) {
      toastError('Error', 'Failed to update notification settings.');
    }
  };

  const RouterFetch = async (url: string, method: string, headers: any, body?: any) => {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
  };

  // Map icon based on notification category
  const getNotificationIcon = (type: NotificationType, severity: string) => {
    const colorClass = 
      severity === 'success' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
      severity === 'warning' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
      severity === 'error' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
      'text-blue-400 bg-blue-500/10 border-blue-500/20';

    switch (type) {
      case 'Order':
        return { icon: TrendingUp, style: colorClass };
      case 'Wallet':
      case 'Payment':
      case 'Deposit':
      case 'Refund':
        return { icon: Wallet, style: colorClass };
      case 'Security':
        return { icon: Shield, style: colorClass };
      case 'Promotion':
        return { icon: Tag, style: colorClass };
      default:
        return { icon: Info, style: colorClass };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Launcher Icon */}
      <button
        id="notif-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl border border-blue-900/10 bg-blue-950/5 text-gray-300 hover:text-blue-400 hover:bg-blue-900/10 transition-all cursor-pointer"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-5 h-5 text-blue-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 border border-[#05070B] text-[#05070B] font-mono text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5 h-5" />
        )}
      </button>

      {/* Main Notification Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0A0E17] border border-blue-900/20 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-4 border-b border-blue-900/10 bg-[#070A11] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-200">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  id="notif-mark-all-read"
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-950/30 transition-all cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                id="notif-open-settings"
                onClick={() => {
                  setSettingsOpen(true);
                  setIsOpen(false);
                }}
                title="Notification Settings"
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-950/30 transition-all cursor-pointer"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-blue-900/5 min-h-[100px]">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <Bell className="w-8 h-8 text-blue-900/40 mb-3" />
                <p className="text-xs text-gray-400 font-medium">All caught up!</p>
                <p className="text-[10px] text-gray-600 mt-0.5">No notifications yet.</p>
              </div>
            ) : (
              notifications.slice(0, 15).map(n => {
                const { icon: CategoryIcon, style: iconStyle } = getNotificationIcon(n.type, n.severity);
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleMarkAsRead(n.id)}
                    className={`p-4 flex gap-3 hover:bg-blue-950/10 transition-all cursor-pointer relative ${
                      !n.read ? 'bg-blue-950/5 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconStyle}`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] text-blue-500 uppercase font-semibold tracking-wider">
                          {n.type}
                        </span>
                        <span className="text-[9px] text-gray-500">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-200 mt-1 truncate">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed break-words">
                        {n.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDismiss(n.id, e)}
                      title="Dismiss Alert"
                      className="absolute right-3 top-3 text-gray-600 hover:text-rose-400 p-1 rounded hover:bg-rose-950/20 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Settings Modal (Settings2 Overlay) */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#0A0D14] border border-blue-900/20 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-blue-900/10 flex items-center justify-between">
              <span className="font-semibold text-base text-gray-200">Alert Configuration</span>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-400">
                Choose your preferred channels and categories to get notified about Zenit services.
              </p>

              {/* Delivery Channels */}
              <div className="space-y-2.5 border-b border-blue-900/10 pb-4">
                <span className="text-[11px] text-blue-500 font-mono tracking-wider uppercase font-bold">Delivery Channels</span>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300">In-App Live Alerts</label>
                  <input
                    type="checkbox"
                    checked={settings.inAppEnabled}
                    onChange={e => setSettings(p => ({ ...p, inAppEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-blue-900/30 text-blue-500 bg-[#05070B] focus:ring-0 focus:ring-offset-0"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300">Email System Receipts</label>
                  <input
                    type="checkbox"
                    checked={settings.emailEnabled}
                    onChange={e => setSettings(p => ({ ...p, emailEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-blue-900/30 text-blue-500 bg-[#05070B] focus:ring-0 focus:ring-offset-0"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-3.5">
                <span className="text-[11px] text-blue-500 font-mono tracking-wider uppercase font-bold">Topics Config</span>
                
                <div className="grid grid-cols-2 gap-3.5">
                  {['System', 'Order', 'Wallet', 'Payment', 'Deposit', 'Refund', 'Provider', 'Security', 'Admin', 'Promotion'].map((cat) => (
                    <div key={cat} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`notif-settings-${cat}`}
                        checked={settings.categories[cat] !== false}
                        onChange={e => setSettings(p => ({
                          ...p,
                          categories: {
                            ...p.categories,
                            [cat]: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 rounded border-blue-900/30 text-blue-500 bg-[#05070B] focus:ring-0 focus:ring-offset-0"
                      />
                      <label htmlFor={`notif-settings-${cat}`} className="text-xs text-gray-300 cursor-pointer">{cat}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#070A11] border-t border-blue-900/10 flex justify-end gap-3">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="notif-save-settings-btn"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold transition-all cursor-pointer"
              >
                Apply Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

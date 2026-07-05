import { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import NotificationCenter from '../NotificationCenter';
import { 
  Users, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert, 
  PieChart, 
  Globe, 
  MessageSquare, 
  UserCheck,
  History,
  Sliders,
  Wallet,
  Bell,
  FileSpreadsheet
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminLayout({ children, activeTab, onTabChange }: LayoutProps) {
  const { userProfile, logout } = useAuth();
  const { success } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'admin-stats', label: 'Overview', icon: PieChart },
    { id: 'admin-services', label: 'Manage Services', icon: Sliders },
    { id: 'admin-providers', label: 'API Providers', icon: Globe },
    { id: 'admin-orders', label: 'Manage Orders', icon: ShoppingCart },
    { id: 'admin-wallets', label: 'Wallets & Deposits', icon: Wallet },
    { id: 'admin-users', label: 'Manage Users', icon: Users },
    { id: 'admin-notifications', label: 'Notification Hub', icon: Bell },
    { id: 'admin-reports', label: 'Financial Reports', icon: FileSpreadsheet },
    { id: 'admin-tickets', label: 'Support Tickets', icon: MessageSquare },
    { id: 'admin-settings', label: 'Website Settings', icon: Settings },
    { id: 'admin-logs', label: 'Security Logs', icon: History },
  ];

  const handleLogout = async () => {
    await logout();
    success('Logged Out', 'You have been signed out successfully.');
  };

  return (
    <div className="min-h-screen bg-[#05070B] text-gray-100 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#0A0D14] border-r border-amber-900/20 z-50 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-amber-900/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  ZENIT ADMIN
                </span>
                <span className="block text-[10px] text-amber-500 font-mono tracking-widest uppercase font-semibold">
                  CONTROL TERMINAL
                </span>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button 
              id="mobile-close-admin-sidebar"
              className="lg:hidden p-1.5 rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800/50"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav list */}
          <nav className="p-4 space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`admin-nav-item-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-amber-500/10 border-l-2 border-amber-500 text-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.02)]' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/20'
                    }
                  `}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Exit Admin Portal Footer */}
        <div className="p-4 border-t border-amber-900/10 space-y-3 bg-[#0E0F14]/50">
          <button
            id="admin-goto-user-portal"
            onClick={() => onTabChange('dashboard')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            Exit Admin Portal
          </button>
          
          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of Account
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top bar header */}
        <header className="h-20 bg-[#0A0D14]/65 backdrop-blur-md border-b border-amber-900/10 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              id="mobile-admin-menu-toggle"
              className="lg:hidden p-2 rounded-lg border border-amber-900/20 text-gray-300 hover:bg-amber-900/10 cursor-pointer"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display font-semibold text-lg text-amber-400 capitalize">
              {activeTab.replace('admin-', '').replace('-', ' ')}
            </h2>
          </div>

          {/* Admin Tag */}
          <div className="flex items-center gap-4">
            <NotificationCenter />
            
            <div className="flex items-center gap-2 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded-lg text-amber-400 text-xs font-mono font-bold tracking-widest">
              <UserCheck className="w-3.5 h-3.5" />
              ADMIN PRIVILEGES
            </div>
          </div>
        </header>

        {/* Scroll Content Container */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

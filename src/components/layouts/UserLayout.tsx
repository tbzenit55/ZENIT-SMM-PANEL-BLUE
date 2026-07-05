import { ReactNode, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import NotificationCenter from '../NotificationCenter';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ListFilter, 
  HelpCircle, 
  CreditCard, 
  LogOut, 
  Menu, 
  X, 
  User, 
  TrendingUp, 
  ShieldAlert
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function UserLayout({ children, activeTab, onTabChange }: LayoutProps) {
  const { userProfile, logout, isAdmin } = useAuth();
  const { success } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-order', label: 'New Order', icon: ShoppingCart },
    { id: 'orders', label: 'Order History', icon: ListFilter },
    { id: 'add-funds', label: 'Add Funds', icon: CreditCard },
    { id: 'tickets', label: 'Support Tickets', icon: HelpCircle },
  ];

  const handleLogout = async () => {
    await logout();
    success('Logged Out', 'You have been successfully signed out of the panel.');
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

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#0A0E17] border-r border-blue-900/20 z-50 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-blue-900/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  ZENIT
                </span>
                <span className="block text-[10px] text-blue-500 font-mono tracking-widest uppercase font-semibold">
                  SMM PANEL
                </span>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button 
              id="mobile-close-sidebar"
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
                  id={`nav-item-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-blue-600/15 border-l-2 border-blue-500 text-blue-400 shadow-[inset_0_0_15px_rgba(37,99,235,0.05)]' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/20'
                    }
                  `}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / Logout Footer */}
        <div className="p-4 border-t border-blue-900/10 space-y-3 bg-[#070A11]/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-inner">
              <User className="w-4 h-4 text-[#05070B]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">
                {userProfile?.displayName || 'Zenit Member'}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{userProfile?.email}</p>
            </div>
          </div>
          
          <button
            id="user-logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top bar header */}
        <header className="h-20 bg-[#0A0E17]/65 backdrop-blur-md border-b border-blue-900/10 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              id="mobile-menu-toggle"
              className="lg:hidden p-2 rounded-lg border border-blue-900/20 text-gray-300 hover:bg-blue-900/10 cursor-pointer"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display font-semibold text-lg text-gray-100 capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>

          {/* Topbar Balance Widget */}
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                id="layout-goto-admin-btn"
                onClick={() => onTabChange('admin-portal')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 text-xs font-medium transition-all cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Panel
              </button>
            )}

            <div className="flex items-center gap-2 border border-blue-900/20 bg-blue-950/5 px-4 py-2 rounded-xl">
              <span className="text-[11px] text-blue-400 font-mono font-semibold tracking-wider uppercase">
                BALANCE
              </span>
              <span className="font-mono text-base font-bold text-emerald-400">
                ${userProfile?.balance ? userProfile.balance.toFixed(2) : '0.00'}
              </span>
            </div>

            <NotificationCenter />
          </div>
        </header>

        {/* Internal Scroll Content Container */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default UserLayout;

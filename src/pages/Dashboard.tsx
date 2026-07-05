import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Order } from '../types';
import { 
  ShoppingCart, 
  HelpCircle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  CreditCard, 
  ArrowUpRight,
  TrendingUp,
  Inbox,
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

export function Dashboard({ onTabChange }: DashboardProps) {
  const { userProfile, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initDashboard() {
      try {
        // Refresh profile for up-to-date balance and spent indicators
        await refreshProfile();
        // Fetch user campaigns
        const res = await api.get<{ orders: Order[] }>('/orders');
        setOrders(res.data.orders);
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, []);

  const totalSpent = userProfile?.totalSpent || 0;
  const balance = userProfile?.balance || 0;
  const totalOrdersCount = orders.length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const pendingCount = orders.filter(o => ['pending', 'processing', 'inprogress'].includes(o.status)).length;
  
  // Show top 5 latest campaigns
  const recentOrders = orders.slice(0, 5);

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    inprogress: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    partial: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    canceled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="space-y-8 font-sans text-gray-100">
      {/* Welcome Card & Fast Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-[#0A0E17] to-[#0A0E17] border border-blue-900/30 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-[0_0_50px_rgba(37,99,235,0.02)]">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-blue-600/10 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
              <TrendingUp className="w-3.5 h-3.5" /> High-Speed SMM Delivery
            </span>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">{userProfile?.displayName || 'Zenit Member'}</span>
            </h1>
            <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
              Grow your social audience instantly with automated high-speed systems. Monitor campaign statistics, view recent history, or start a new campaign right away.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mt-6">
            <button
              id="dash-quick-order-btn"
              onClick={() => onTabChange?.('new-order')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/15 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              New Campaign
            </button>
            <button
              id="dash-add-funds-btn"
              onClick={() => onTabChange?.('add-funds')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-blue-900/30 text-gray-200 text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-blue-400" />
              Deposit Funds
            </button>
          </div>
        </div>

        {/* Primary Account Balance Box */}
        <div className="bg-gradient-to-b from-[#0F1424] to-[#0A0D16] border border-blue-900/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 font-mono tracking-wider uppercase">AVAILABLE BALANCE</span>
              <span className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </span>
            </div>
            <div>
              <p className="text-4xl font-mono font-bold text-white tracking-tight">
                ${balance.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Automatic conversion enabled</p>
            </div>
          </div>
          <button
            id="dash-balance-quick-add-btn"
            onClick={() => onTabChange?.('add-funds')}
            className="w-full mt-6 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Deposit
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Metric Shimmer Skeletons
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-5 bg-[#080B12] border border-blue-950/20 rounded-xl animate-pulse space-y-3">
              <div className="h-3 w-1/2 bg-blue-900/20 rounded" />
              <div className="h-8 w-2/3 bg-blue-900/30 rounded" />
            </div>
          ))
        ) : (
          <>
            {/* Total Spent */}
            <div className="p-5 bg-[#0A0E17]/80 border border-blue-900/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1">TOTAL ACCOUNT SPENT</p>
                <h3 className="text-2xl font-mono font-bold text-white">${totalSpent.toFixed(2)}</h3>
              </div>
              <div className="p-2.5 bg-blue-500/5 rounded-lg border border-blue-500/10 text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Total Orders */}
            <div className="p-5 bg-[#0A0E17]/80 border border-blue-900/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1">TOTAL CAMPAIGNS</p>
                <h3 className="text-2xl font-mono font-bold text-white">{totalOrdersCount}</h3>
              </div>
              <div className="p-2.5 bg-cyan-500/5 rounded-lg border border-cyan-500/10 text-cyan-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>

            {/* Completed Orders */}
            <div className="p-5 bg-[#0A0E17]/80 border border-blue-900/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1">COMPLETED DELIVERIES</p>
                <h3 className="text-2xl font-mono font-bold text-emerald-400">{completedCount}</h3>
              </div>
              <div className="p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Pending Orders */}
            <div className="p-5 bg-[#0A0E17]/80 border border-blue-900/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-1">PENDING QUEUE</p>
                <h3 className="text-2xl font-mono font-bold text-amber-400">{pendingCount}</h3>
              </div>
              <div className="p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Grid: Recent Orders & Quick Navigation Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Campaign Activities table */}
        <div className="lg:col-span-2 bg-[#0A0D15] border border-blue-900/15 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-blue-900/10 mb-5">
            <div>
              <h3 className="text-base font-semibold text-white">Recent Campaigns</h3>
              <p className="text-[11px] text-gray-500">Your latest 5 high-speed deliveries</p>
            </div>
            <button
              id="dash-view-all-orders"
              onClick={() => onTabChange?.('orders')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              View History <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            // Table Shimmer Skeleton
            <div className="space-y-4 py-4 animate-pulse">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="space-y-2 w-1/3">
                    <div className="h-3 bg-blue-900/20 rounded w-full" />
                    <div className="h-2 bg-blue-900/10 rounded w-1/2" />
                  </div>
                  <div className="h-3 bg-blue-900/20 rounded w-16" />
                  <div className="h-5 bg-blue-900/20 rounded w-20" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-10">
              <Inbox className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-xs text-gray-500">No recent orders registered.</p>
              <button
                id="dash-place-first-order"
                onClick={() => onTabChange?.('new-order')}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 text-xs font-semibold transition-all cursor-pointer"
              >
                Start Campaign <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-blue-900/5 text-[10px] text-gray-500 uppercase tracking-widest font-semibold pb-3">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Service Package</th>
                    <th className="pb-3 font-medium text-center">Cost</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/5 text-xs">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#070A11]/20 transition-colors">
                      <td className="py-3.5 font-mono font-bold text-blue-400 text-[11px]">{order.id}</td>
                      <td className="py-3.5 max-w-[180px] truncate font-medium text-gray-200">
                        <span className="block text-gray-500 text-[9px] uppercase font-semibold tracking-wider mb-0.5">{order.categoryName}</span>
                        {order.serviceName}
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-emerald-400">${order.charge.toFixed(2)}</td>
                      <td className="py-3.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 border rounded-full text-[10px] font-semibold capitalize ${statusColors[order.status] || 'bg-gray-500/10'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Resource & System Status Navigation Cards */}
        <div className="space-y-6">
          <div className="bg-[#0A0D15] border border-blue-900/15 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Support Channels</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Facing issues with delivery speeds or processing queues? Open an automated Support Ticket, and our engineers will audit your campaign logs immediately.
            </p>
            <button
              id="dash-support-shortcut"
              onClick={() => onTabChange?.('tickets')}
              className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-blue-900/30 text-gray-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              Open Support Ticket <ArrowUpRight className="w-3 h-3 text-gray-500" />
            </button>
          </div>

          {/* Quick Platform Integration Guide */}
          <div className="bg-gradient-to-r from-blue-950/10 to-[#0A0D15] border border-blue-900/10 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Quick Panel Instructions</h3>
            <div className="space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-gray-300">Add Balance</h4>
                  <p className="text-[11px] text-gray-500">Fund your balance instantly via Stripe or manual credits.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-gray-300">Submit link</h4>
                  <p className="text-[11px] text-gray-500">Select any package, provide the URL, and order quantities.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-gray-300">Track counts</h4>
                  <p className="text-[11px] text-gray-500">Campaign counts auto-update directly inside your logs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

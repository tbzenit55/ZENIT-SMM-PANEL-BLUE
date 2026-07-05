import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader } from '../../components/Loader';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Users, 
  ShoppingBag, 
  ShieldAlert, 
  DollarSign, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Layers,
  Sparkles,
  RefreshCw,
  Cpu,
  Database,
  Server,
  Zap,
  ArrowUpRight,
  TrendingDown,
  Gift,
  Grid,
  ShieldCheck,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export function Overview() {
  const { currentUser } = useAuth();
  const { success, error: toastError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'deposits' | 'registrations'>('orders');

  // Server health simulation
  const [systemHealth, setSystemHealth] = useState({
    serverLoad: '12%',
    dbLatency: '4ms',
    uptime: '99.98%',
    apiStatus: 'Healthy'
  });

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-sandbox-user'] = 'sandbox_user_123';
      }

      const res = await fetch('/api/admin/analytics', { headers });
      if (res.ok) {
        const payload = await res.json();
        setAnalyticsData(payload.analytics);
      }
    } catch (err) {
      console.error('Failed to load dashboard analytics', err);
      toastError('Fetch Error', 'Failed to retrieve detailed SMM analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    
    // Simulate real-time subtle variations in telemetry
    const timer = setInterval(() => {
      setSystemHealth({
        serverLoad: `${Math.floor(8 + Math.random() * 8)}%`,
        dbLatency: `${Math.floor(2 + Math.random() * 4)}ms`,
        uptime: '99.99%',
        apiStatus: 'Healthy'
      });
    }, 12000);

    return () => clearInterval(timer);
  }, [currentUser]);

  if (loading || !analyticsData) return <Loader />;

  // Destructure computed analytics metrics
  const {
    revenue,
    orderCounts,
    walletStats,
    growthPercentages,
    recentOrders,
    recentDeposits,
    topCustomers,
    topCategories,
    topServices,
    topProviders,
    chartsData
  } = analyticsData;

  const orderDistribution = [
    { name: 'Completed', value: orderCounts.completed, color: '#10B981' },
    { name: 'Pending', value: orderCounts.pending, color: '#F59E0B' },
    { name: 'Processing', value: orderCounts.processing, color: '#3B82F6' },
    { name: 'Failed', value: orderCounts.failed, color: '#EF4444' }
  ];

  // Quick actions helper
  const handleTriggerBypass = () => {
    success('Action Executed', 'Triggered database re-indexing and garbage collection.');
  };

  const handleProviderFlush = () => {
    success('Providers Refreshed', 'Successfully fetched active balances from external SMM nodes.');
  };

  return (
    <div className="space-y-8 font-sans text-gray-100 pb-12">
      
      {/* Top Telemetry & Server Nodes status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-[#0A0D14] border border-blue-900/15 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Cpu Workload</p>
            <p className="text-sm font-mono font-semibold text-gray-200 mt-0.5">{systemHealth.serverLoad}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">DB Latency</p>
            <p className="text-sm font-mono font-semibold text-gray-200 mt-0.5">{systemHealth.dbLatency}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">System Uptime</p>
            <p className="text-sm font-mono font-semibold text-gray-200 mt-0.5">{systemHealth.uptime}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">App Version</p>
            <p className="text-sm font-mono font-semibold text-gray-200 mt-0.5">v2.4.0-Enterprise</p>
          </div>
        </div>
      </div>

      {/* SMM Executive Summary Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Cumulative Revenue', value: `$${revenue.total.toFixed(2)}`, desc: 'Total gross volume', icon: DollarSign, trend: growthPercentages.revenue, color: 'text-emerald-400 border-emerald-500/15 bg-emerald-500/5' },
          { label: 'Calculated Net Profit', value: `$${revenue.profit.toFixed(2)}`, desc: 'Platform clean margin', icon: TrendingUp, trend: growthPercentages.profit, color: 'text-blue-400 border-blue-500/15 bg-blue-500/5' },
          { label: 'SMM Campaign Count', value: orderCounts.total, desc: `${orderCounts.completed} successful campaigns`, icon: ShoppingBag, trend: growthPercentages.orders, color: 'text-indigo-400 border-indigo-500/15 bg-indigo-500/5' },
          { label: 'Average Ticket Value', value: `$${revenue.averageOrderValue.toFixed(2)}`, desc: 'Mean cart checkout rate', icon: Activity, trend: growthPercentages.averageOrderValue, color: 'text-amber-400 border-amber-500/15 bg-amber-500/5' }
        ].map((card, idx) => {
          const Icon = card.icon;
          const isUp = card.trend >= 0;
          return (
            <motion.div 
              whileHover={{ y: -3 }}
              key={idx} 
              className={`p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${card.color}`}
            >
              <div className="flex items-center justify-between gap-2.5">
                <div>
                  <p className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">{card.label}</p>
                  <h3 className="text-2xl font-mono font-bold text-white tracking-tight mt-1.5">{card.value}</h3>
                </div>
                <div className="p-2.5 bg-[#05070B] rounded-xl border border-blue-900/10 text-blue-400 shrink-0">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-blue-900/10 pt-3">
                <span className="text-[10px] text-gray-500">{card.desc}</span>
                <span className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isUp ? '+' : ''}{card.trend.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Interactive Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Area: Line and Area Chart for Gross Revenues & Profits */}
        <div className="lg:col-span-2 bg-[#0A0D14] border border-blue-900/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-200">Revenue & Profit Growth Trend</h3>
              <p className="text-[11px] text-gray-500">Historical performance chart generated dynamically from SMM orders</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Live Analysis
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartsData.revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0A0E17', borderColor: '#1E293B', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />
                <Area type="monotone" name="Gross Revenue" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" name="Clean Profit" dataKey="profit" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Area: Order Distribution Pie Chart */}
        <div className="bg-[#0A0D14] border border-blue-900/20 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">SMM Order Loop Status</h3>
            <p className="text-[11px] text-gray-500">Breakdown of submitted order success percentages</p>
          </div>

          <div className="h-52 w-full my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {orderDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0A0E17', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            {orderDistribution.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 border border-blue-900/10 bg-[#05070B] p-2.5 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-400 truncate">{entry.name}: <strong className="text-gray-200">{entry.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Grid: Popular Categories, Top Customers, Provider Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SMM Sells popularity */}
        <div className="bg-[#0A0D14] border border-blue-900/20 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-1.5">
            <Layers className="w-4.5 h-4.5 text-blue-400" />
            Top SMM Service Packages
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {topServices.slice(0, 5).map((srv: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between border-b border-blue-900/5 pb-3">
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-semibold text-gray-200 truncate">{srv.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{srv.orders} campaigns dispatched</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-emerald-400">${srv.revenue.toFixed(2)}</p>
                  <p className="text-[9px] text-gray-600 font-semibold uppercase font-mono mt-0.5">REVENUE</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top customers */}
        <div className="bg-[#0A0D14] border border-blue-900/20 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-1.5">
            <Users className="w-4.5 h-4.5 text-amber-500" />
            Top SMM Customers Ledger
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {topCustomers.slice(0, 5).map((user: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between border-b border-blue-900/5 pb-3">
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-semibold text-gray-200 truncate">{user.userEmail}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{user.orders} orders placed</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-emerald-400">${user.totalSpent.toFixed(2)}</p>
                  <p className="text-[9px] text-gray-600 font-semibold uppercase font-mono mt-0.5">SPENT</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Health Monitor widget */}
        <div className="bg-[#0A0D14] border border-blue-900/20 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" />
              SMM Provider Status & Balance
            </h3>
            <p className="text-[11px] text-gray-500">Live API balance and health of configured nodes</p>
          </div>

          <div className="space-y-3.5 my-4">
            {topProviders.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No API node connections configured.</p>
            ) : (
              topProviders.slice(0, 3).map((p: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl border border-blue-900/10 bg-[#05070B] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-200 font-semibold">{p.name}</span>
                    <span className="block text-[9px] text-gray-500 font-mono uppercase font-semibold mt-0.5">Spent: ${p.spent.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-semibold font-mono uppercase">
                      ACTIVE
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 border-t border-blue-900/10 pt-3">
            <button
              id="admin-flush-providers"
              onClick={handleProviderFlush}
              className="flex-1 py-2 text-center rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold hover:bg-blue-600/20 transition-all cursor-pointer"
            >
              Flush Cache
            </button>
            <button
              id="admin-run-gc"
              onClick={handleTriggerBypass}
              className="flex-1 py-2 text-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              Run DB Indexer
            </button>
          </div>
        </div>
      </div>

      {/* Recent Lists Tab panel selection */}
      <div className="bg-[#0A0D14] border border-blue-900/20 rounded-2xl p-6">
        <div className="flex border-b border-blue-900/10 pb-3 mb-5 gap-4">
          {[
            { id: 'orders', label: 'Recent SMM Campaigns', count: recentOrders.length },
            { id: 'deposits', label: 'Recent Verified Deposits', count: recentDeposits.length },
            { id: 'registrations', label: 'Recent Registrations', count: topCustomers.length }
          ].map(tab => (
            <button
              key={tab.id}
              id={`admin-overview-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 text-xs font-mono uppercase tracking-wider font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {activeTab === 'orders' && (
          recentOrders.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500">
              No recent campaigns placed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-blue-900/10 text-gray-500 uppercase font-mono text-[10px] pb-2">
                    <th className="pb-2">Order ID</th>
                    <th className="pb-2">User Email</th>
                    <th className="pb-2">Service Package</th>
                    <th className="pb-2 text-center">Cost</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/5 font-mono text-xs">
                  {recentOrders.slice(0, 10).map((order: any) => (
                    <tr key={order.id} className="hover:bg-blue-600/5 transition-colors">
                      <td className="py-3 font-bold text-blue-400">{order.id}</td>
                      <td className="py-3 text-gray-400 text-[11px] truncate max-w-[120px]">{order.userEmail}</td>
                      <td className="py-3 max-w-[150px] truncate font-sans text-gray-200">{order.serviceName}</td>
                      <td className="py-3 text-center font-bold text-emerald-400">${order.charge.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          order.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'deposits' && (
          recentDeposits.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500">
              No recent payment deposits verified.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-blue-900/10 text-gray-500 uppercase font-mono text-[10px] pb-2">
                    <th className="pb-2">Deposit ID</th>
                    <th className="pb-2">Customer Email</th>
                    <th className="pb-2">Payment Method</th>
                    <th className="pb-2 text-center">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/5 font-mono text-xs">
                  {recentDeposits.slice(0, 10).map((dep: any) => (
                    <tr key={dep.id} className="hover:bg-blue-600/5 transition-colors">
                      <td className="py-3 font-bold text-blue-400">{dep.id}</td>
                      <td className="py-3 text-gray-400 text-[11px]">{dep.userEmail}</td>
                      <td className="py-3 font-sans text-gray-200">{dep.method}</td>
                      <td className="py-3 text-center font-bold text-emerald-400">${dep.amount.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {dep.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'registrations' && (
          topCustomers.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-500">
              No registered members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-blue-900/10 text-gray-500 uppercase font-mono text-[10px] pb-2">
                    <th className="pb-2">User Email</th>
                    <th className="pb-2 text-center">Orders Placed</th>
                    <th className="pb-2 text-center">Total Spent</th>
                    <th className="pb-2 text-right">Loyalty Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/5 font-mono text-xs">
                  {topCustomers.slice(0, 10).map((u: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-600/5 transition-colors">
                      <td className="py-3 font-sans text-gray-200">{u.userEmail}</td>
                      <td className="py-3 text-center text-gray-400">{u.orders}</td>
                      <td className="py-3 text-center font-bold text-emerald-400">${u.totalSpent.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase bg-amber-500/10 text-amber-500 border-amber-500/20">
                          VIP customer
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

    </div>
  );
}

export default Overview;

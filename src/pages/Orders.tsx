import { useState, useEffect } from 'react';
import { Loader } from '../components/Loader';
import api from '../lib/api';
import { Order } from '../types';
import { 
  Layers, 
  Activity, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCw, 
  Search, 
  AlertTriangle, 
  Calendar,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Advanced filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Load orders from API
  async function loadOrders() {
    try {
      const res = await api.get<{ orders: Order[] }>('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // Actions
  async function handleCancelOrder(orderId: string) {
    if (!window.confirm('Are you sure you want to cancel this pending order? This will immediately refund your balance.')) return;
    setActionLoading(orderId);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      alert('Order successfully canceled and balance refunded.');
      await loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRefillOrder(orderId: string) {
    setActionLoading(orderId);
    try {
      await api.post(`/orders/${orderId}/refill`);
      alert('Refill request submitted successfully to provider.');
      await loadOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to request refill.');
    } finally {
      setActionLoading(null);
    }
  }

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      order.id.toLowerCase().includes(searchLower) ||
      (order.providerOrderId || '').toLowerCase().includes(searchLower) ||
      order.link.toLowerCase().includes(searchLower) ||
      order.serviceName.toLowerCase().includes(searchLower) ||
      (order.categoryName || '').toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    let matchesDate = true;
    if (dateRange !== 'all') {
      const orderTime = new Date(order.createdAt).getTime();
      const elapsedMs = Date.now() - orderTime;
      if (dateRange === 'today' && elapsedMs > 86400000) matchesDate = false;
      if (dateRange === 'week' && elapsedMs > 7 * 86400000) matchesDate = false;
      if (dateRange === 'month' && elapsedMs > 30 * 86400000) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate stats
  const totalPlaced = orders.length;
  const inQueue = orders.filter((o) => ['pending', 'processing', 'inprogress'].includes(o.status)).length;
  const completed = orders.filter((o) => o.status === 'completed').length;
  const totalSpentVal = orders.reduce((sum, o) => sum + (o.price || o.charge || 0), 0);

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    inprogress: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    partial: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    canceled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Campaigns */}
        <div id="stat-total-campaigns" className="bg-[#101424] border border-blue-900/15 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/15">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-gray-400 text-xs block font-medium">Total Campaigns</span>
            <span className="text-xl font-bold font-display text-white mt-0.5 block">{totalPlaced}</span>
          </div>
        </div>

        {/* Active Queue */}
        <div id="stat-active-queue" className="bg-[#101424] border border-blue-900/15 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/15 animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-gray-400 text-xs block font-medium">In Queue / Delivery</span>
            <span className="text-xl font-bold font-display text-white mt-0.5 block">{inQueue}</span>
          </div>
        </div>

        {/* Completed */}
        <div id="stat-completed" className="bg-[#101424] border border-blue-900/15 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/15">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-gray-400 text-xs block font-medium">Successfully Delivered</span>
            <span className="text-xl font-bold font-display text-white mt-0.5 block">{completed}</span>
          </div>
        </div>

        {/* Total Spent */}
        <div id="stat-spent" className="bg-[#101424] border border-blue-900/15 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/15">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-gray-400 text-xs block font-medium">Total Social Budget</span>
            <span className="text-xl font-bold font-display text-emerald-400 mt-0.5 block">${totalSpentVal.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-[#101424] border border-blue-900/15 p-6 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div>
            <h3 className="text-lg font-bold font-display text-white">Campaign Catalog & Logs</h3>
            <p className="text-gray-400 text-xs mt-0.5">Filter, monitor, refresh, self-service refill or cancel social expansion streams.</p>
          </div>
          
          <button 
            onClick={() => {
              setLoading(true);
              loadOrders();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-950/40 hover:bg-blue-950/80 border border-blue-500/20 text-blue-400 rounded-xl text-xs transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh Order States
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <span className="absolute left-3.5 top-2.5 text-gray-500">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              placeholder="Search by ID, link, package, provider ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-200 pl-10 pr-4 py-2 text-xs rounded-xl border border-blue-900/20 focus:border-blue-500/50 outline-none transition"
            />
          </div>

          {/* Status Selection */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-300 py-2 px-3 text-xs rounded-xl border border-blue-900/20 outline-none focus:border-blue-500/50 transition appearance-none cursor-pointer"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="inprogress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial Completed</option>
              <option value="canceled">Canceled</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Date Selector */}
          <div className="md:col-span-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-300 py-2 px-3 text-xs rounded-xl border border-blue-900/20 outline-none focus:border-blue-500/50 transition appearance-none cursor-pointer"
            >
              <option value="all">All Date Horizons</option>
              <option value="today">Past 24 Hours</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-[#101424] border border-blue-900/15 rounded-2xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h4 className="text-gray-300 font-semibold mb-1">No Orders Logged</h4>
            <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">
              No campaigns match your currently configured search criteria. Navigate to the "New Order" tab to begin social expansion campaigns.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-900/10 text-xs text-gray-400 uppercase tracking-widest font-semibold bg-[#0A0D15]/40">
                  <th className="py-4 px-6 font-medium">Order details</th>
                  <th className="py-4 px-4 font-medium">Target Link</th>
                  <th className="py-4 px-4 font-medium text-center">Metrics</th>
                  <th className="py-4 px-4 font-medium text-center">Cost</th>
                  <th className="py-4 px-4 font-medium text-center">Status</th>
                  <th className="py-4 px-4 font-medium text-center">Self-Service Actions</th>
                  <th className="py-4 px-6 font-medium text-right">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/10 text-sm">
                {filteredOrders.map((order) => {
                  const isCancelable = order.status === 'pending';
                  const isRefillable = order.refillAvailable && ['completed', 'partial', 'inprogress'].includes(order.status);

                  return (
                    <tr key={order.id} className="hover:bg-blue-950/10 transition-colors">
                      {/* ID & Service */}
                      <td className="py-4 px-6">
                        <span className="font-mono text-blue-400 text-xs font-bold block mb-1">
                          #{order.id}
                        </span>
                        <div className="max-w-xs truncate">
                          <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 mb-1">
                            {order.categoryName}
                          </span>
                          <span className="block text-gray-200 font-semibold text-xs leading-relaxed truncate">{order.serviceName}</span>
                        </div>
                      </td>
                      
                      {/* Link */}
                      <td className="py-4 px-4 font-mono text-xs max-w-xs truncate text-gray-300">
                        <a 
                          href={order.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
                        >
                          <span className="truncate">{order.link}</span>
                          <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        </a>
                      </td>
                      
                      {/* Metrics */}
                      <td className="py-4 px-4 text-center font-mono text-xs">
                        <div className="space-y-1">
                          <div>
                            <span className="text-gray-500 block text-[10px] uppercase font-semibold">Quantity</span>
                            <span className="text-gray-300 font-bold">{order.quantity.toLocaleString()}</span>
                          </div>
                          {(order.startCount !== undefined || order.remains !== undefined) && (
                            <div className="flex gap-2 justify-center text-[10px] text-gray-400 border-t border-blue-900/10 pt-1 mt-1">
                              <div>
                                <span className="text-gray-600 block">Start</span>
                                <span>{order.startCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-600 block">Remains</span>
                                <span className={order.remains > 0 ? 'text-cyan-400 font-semibold' : 'text-gray-500'}>
                                  {order.remains ?? order.quantity}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      {/* Cost */}
                      <td className="py-4 px-4 text-center font-mono">
                        <span className="text-emerald-400 font-bold">${(order.price || order.charge || 0).toFixed(4)}</span>
                      </td>
                      
                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 border rounded-full text-[11px] font-bold capitalize tracking-wide ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Self-Service Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {isCancelable && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={actionLoading === order.id}
                              className="px-2.5 py-1 text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition disabled:opacity-50"
                            >
                              {actionLoading === order.id ? 'Processing...' : 'Self-Cancel'}
                            </button>
                          )}
                          
                          {isRefillable && (
                            <button
                              onClick={() => handleRefillOrder(order.id)}
                              disabled={actionLoading === order.id}
                              className="px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition disabled:opacity-50"
                            >
                              {actionLoading === order.id ? 'Processing...' : 'Request Refill'}
                            </button>
                          )}

                          {!isCancelable && !isRefillable && (
                            <span className="text-[11px] text-gray-500 italic">No actions available</span>
                          )}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-6 text-right text-xs text-gray-400 font-mono">
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="text-[10px] text-gray-600">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;

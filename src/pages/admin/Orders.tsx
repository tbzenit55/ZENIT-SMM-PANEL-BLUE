import { useState, useEffect } from 'react';
import { Loader } from '../../components/Loader';
import { useToast } from '../../components/Toast';
import api from '../../lib/api';
import { Order } from '../../types';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Play, 
  X, 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  DollarSign,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

export function Orders() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Advanced Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const loadOrders = async () => {
    try {
      const res = await api.get<{ orders: Order[] }>('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      console.error(err);
      error('Failed to load', 'Unable to fetch orders from database.');
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadOrders();
      setLoading(false);
    }
    init();
  }, []);

  // Update single order status
  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await api.post(`/orders/${orderId}/status`, { status });
      success('Order Updated', `Order #${orderId} status set to ${status}.`);
      await loadOrders();
    } catch (err) {
      error('Failed to update', 'An error occurred updating the order status.');
    }
  };

  // Bulk operation actions
  const handleBulkRefresh = async () => {
    setBulkProcessing(true);
    try {
      const res = await api.post('/orders/bulk-refresh');
      success('Sync Triggered', res.data.message || 'Bulk synchronization completed successfully.');
      await loadOrders();
      setSelectedIds([]);
    } catch (err: any) {
      error('Sync Failed', err.response?.data?.error || 'Unable to execute status sync.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkRetry = async () => {
    if (selectedIds.length === 0) return;
    const targets = orders.filter(o => selectedIds.includes(o.id) && o.status === 'failed');
    if (targets.length === 0) {
      alert('None of the selected orders are in "failed" status. Only failed orders can be retried.');
      return;
    }

    if (!window.confirm(`Are you sure you want to retry placing ${targets.length} failed SMM orders? This will re-deduct user balance for placement.`)) return;

    setBulkProcessing(true);
    try {
      const res = await api.post('/orders/bulk-retry', { orderIds: targets.map(t => t.id) });
      success('Batch Retry Completed', res.data.message);
      await loadOrders();
      setSelectedIds([]);
    } catch (err: any) {
      error('Batch Retry Failed', err.response?.data?.error || 'Unable to execute retry.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedIds.length === 0) return;
    const targets = orders.filter(o => selectedIds.includes(o.id) && ['pending', 'processing', 'inprogress'].includes(o.status));
    if (targets.length === 0) {
      alert('None of the selected orders are in active cancelable states (pending, processing, in progress).');
      return;
    }

    if (!window.confirm(`Are you sure you want to cancel and refund ${targets.length} active orders? This will request provider cancel and refund the client balance.`)) return;

    setBulkProcessing(true);
    try {
      const res = await api.post('/orders/bulk-cancel', { orderIds: targets.map(t => t.id) });
      success('Batch Cancel Completed', res.data.message);
      await loadOrders();
      setSelectedIds([]);
    } catch (err: any) {
      error('Batch Cancel Failed', err.response?.data?.error || 'Unable to execute cancellation.');
    } finally {
      setBulkProcessing(false);
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const dataToExport = filteredOrders;
    if (dataToExport.length === 0) {
      alert('No data matches the current filters to export.');
      return;
    }

    const headers = [
      'Order ID', 
      'Client Email', 
      'Category', 
      'Service Name', 
      'Link', 
      'Quantity', 
      'Charge ($)', 
      'Cost ($)', 
      'Profit ($)', 
      'SMM Provider ID',
      'SMM Provider Order ID', 
      'Status', 
      'Created At'
    ];

    const rows = dataToExport.map(o => [
      o.id,
      o.userEmail,
      o.categoryName || 'Direct',
      o.serviceName,
      o.link,
      o.quantity,
      o.price || o.charge || 0,
      o.cost || 0,
      o.profit || 0,
      o.providerId || 'Manual',
      o.providerOrderId || '',
      o.status,
      o.createdAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zenit_admin_orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('CSV Exported', `${dataToExport.length} rows written to CSV.`);
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Dynamically populate filter lists from data
  const uniqueProviders = Array.from(new Set(orders.map(o => o.providerId).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(orders.map(o => o.categoryName).filter(Boolean)));

  // Filter application
  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      o.link.toLowerCase().includes(search.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      (o.providerOrderId || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || o.providerId === providerFilter;
    const matchesCategory = categoryFilter === 'all' || o.categoryName === categoryFilter;

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderTime = new Date(o.createdAt).getTime();
      const elapsedMs = Date.now() - orderTime;
      if (dateFilter === 'today' && elapsedMs > 86400000) matchesDate = false;
      if (dateFilter === 'week' && elapsedMs > 7 * 86400000) matchesDate = false;
      if (dateFilter === 'month' && elapsedMs > 30 * 86400000) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesProvider && matchesCategory && matchesDate;
  });

  // KPI Calculations
  const statsTotal = orders.length;
  const statsActive = orders.filter(o => ['pending', 'processing', 'inprogress'].includes(o.status)).length;
  const statsCompleted = orders.filter(o => o.status === 'completed').length;
  const statsFailedRefunded = orders.filter(o => ['failed', 'canceled', 'refunded'].includes(o.status)).length;
  const statsTotalRevenue = orders.reduce((sum, o) => sum + (o.price || o.charge || 0), 0);
  const statsTotalCost = orders.reduce((sum, o) => sum + (o.cost || 0), 0);
  const statsTotalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);

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
    <div className="space-y-6 font-sans text-gray-200">
      
      {/* Header with Title and Global Actions */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-[#101424] border border-blue-900/15 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Client Order Control Room</h2>
          <p className="text-gray-400 text-xs mt-0.5">Audit, filter, sync, and override active client social campaigns globally.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleBulkRefresh}
            disabled={bulkProcessing}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-950/40 hover:bg-blue-950/80 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${bulkProcessing ? 'animate-spin' : ''}`} />
            Trigger API Poller Sync
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export Selected to CSV
          </button>
        </div>
      </div>

      {/* Statistical Overview Boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Campaigns */}
        <div className="bg-[#101424] border border-blue-900/15 p-4 rounded-xl">
          <span className="text-gray-400 text-[11px] font-medium block">Total Campaigns</span>
          <span className="text-xl font-bold font-display text-white block mt-1">{statsTotal}</span>
        </div>

        {/* Active Queue */}
        <div className="bg-[#101424] border border-blue-900/15 p-4 rounded-xl">
          <span className="text-gray-400 text-[11px] font-medium block">Active Queue</span>
          <span className="text-xl font-bold font-display text-yellow-500 block mt-1">{statsActive}</span>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#101424] border border-blue-900/15 p-4 rounded-xl">
          <span className="text-gray-400 text-[11px] font-medium block">Gross Revenue</span>
          <span className="text-xl font-bold font-display text-emerald-400 block mt-1">${statsTotalRevenue.toFixed(2)}</span>
        </div>

        {/* Cost */}
        <div className="bg-[#101424] border border-blue-900/15 p-4 rounded-xl">
          <span className="text-gray-400 text-[11px] font-medium block">API Provider Cost</span>
          <span className="text-xl font-bold font-display text-purple-400 block mt-1">${statsTotalCost.toFixed(2)}</span>
        </div>

        {/* Net Profit */}
        <div className="bg-[#101424] border border-blue-900/15 p-4 rounded-xl col-span-2 lg:col-span-1">
          <span className="text-gray-400 text-[11px] font-medium block">Accumulated Profit</span>
          <span className="text-xl font-bold font-display text-cyan-400 block mt-1">${statsTotalProfit.toFixed(2)}</span>
        </div>
      </div>

      {/* Advanced Filter Criteria Pane */}
      <div className="bg-[#101424] border border-blue-900/15 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Advanced Query Criteria</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Main Search input */}
          <div className="md:col-span-4 relative">
            <input
              type="text"
              placeholder="Search by ID, User, Link, Provider ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-200 pl-4 pr-4 py-2 text-xs rounded-xl border border-blue-900/20 focus:border-blue-500/50 outline-none transition"
            />
          </div>

          {/* Status Selection */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-300 py-2 px-3 text-xs rounded-xl border border-blue-900/20 outline-none focus:border-blue-500/50 transition cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="inprogress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial</option>
              <option value="canceled">Canceled</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Provider Selection */}
          <div className="md:col-span-2">
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-300 py-2 px-3 text-xs rounded-xl border border-blue-900/20 outline-none focus:border-blue-500/50 transition cursor-pointer"
            >
              <option value="all">All Providers</option>
              <option value="null">Manual Services</option>
              {uniqueProviders.map(pId => (
                <option key={pId} value={pId}>{pId}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-300 py-2 px-3 text-xs rounded-xl border border-blue-900/20 outline-none focus:border-blue-500/50 transition cursor-pointer"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date Range Selection */}
          <div className="md:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-[#0A0D15] text-gray-300 py-2 px-3 text-xs rounded-xl border border-blue-900/20 outline-none focus:border-blue-500/50 transition cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Past 24 Hours</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Campaign table */}
      <div className="bg-[#101424] border border-blue-900/15 rounded-2xl overflow-hidden relative">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h4 className="text-gray-300 font-semibold mb-1">No Client Campaigns Registered</h4>
            <p className="text-gray-500 text-xs max-w-sm mx-auto">No campaigns match your currently selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-900/15 text-xs text-gray-400 uppercase tracking-wider font-semibold bg-[#0A0D15]/40">
                  <th className="py-4 px-6 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="cursor-pointer accent-blue-500 w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="py-4 px-4 font-medium">Order details</th>
                  <th className="py-4 px-4 font-medium">Client Info</th>
                  <th className="py-4 px-4 font-medium">Campaign Link</th>
                  <th className="py-4 px-4 font-medium text-center">Metrics</th>
                  <th className="py-4 px-4 font-medium text-center">Financials</th>
                  <th className="py-4 px-4 font-medium text-center">API Provider</th>
                  <th className="py-4 px-4 font-medium text-right">Status Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/10 text-xs">
                {filteredOrders.map((o) => {
                  const isChecked = selectedIds.includes(o.id);

                  return (
                    <tr key={o.id} className={`hover:bg-blue-950/10 transition-colors ${isChecked ? 'bg-blue-950/5' : ''}`}>
                      {/* Checkbox */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(o.id, e.target.checked)}
                          className="cursor-pointer accent-blue-500 w-4 h-4 rounded border-gray-300"
                        />
                      </td>

                      {/* ID & Package details */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-blue-400 font-bold block mb-0.5">#{o.id}</span>
                        <div className="max-w-xs truncate">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">{o.categoryName || 'Direct'}</span>
                          <span className="text-gray-200 font-semibold block truncate">{o.serviceName}</span>
                        </div>
                      </td>

                      {/* Client info */}
                      <td className="py-4 px-4 font-mono">
                        <span className="block text-gray-300 font-medium">{o.userEmail}</span>
                        <span className="text-[10px] text-gray-500">UID: {o.userId}</span>
                      </td>

                      {/* Target Campaign link */}
                      <td className="py-4 px-4 font-mono max-w-xs truncate text-gray-400">
                        <a 
                          href={o.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:text-blue-400 flex items-center gap-1 leading-relaxed"
                        >
                          <span className="truncate">{o.link}</span>
                          <ExternalLink className="w-3 h-3 text-gray-600 flex-shrink-0" />
                        </a>
                      </td>

                      {/* Metrics: Quantity, start, remains */}
                      <td className="py-4 px-4 text-center font-mono">
                        <div>
                          <span className="text-gray-500 block text-[9px] uppercase font-bold">Qty</span>
                          <span className="text-white font-bold">{o.quantity.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2 justify-center text-[10px] text-gray-400 border-t border-blue-900/10 pt-1 mt-1">
                          <div>
                            <span className="text-gray-600">Start:</span> {o.startCount || 0}
                          </div>
                          <div>
                            <span className="text-gray-600">Remains:</span> {o.remains ?? o.quantity}
                          </div>
                        </div>
                      </td>

                      {/* Financial breakdown: revenue, cost, profit */}
                      <td className="py-4 px-4 text-center font-mono">
                        <div className="space-y-0.5">
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500">Gross:</span>
                            <span className="text-emerald-400 font-semibold">${o.charge.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between gap-2 text-[10px] border-t border-blue-900/10 pt-0.5">
                            <span className="text-gray-600">Cost:</span>
                            <span className="text-purple-400">${(o.cost || 0).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between gap-2 text-[10px] font-bold">
                            <span className="text-gray-600">Profit:</span>
                            <span className="text-cyan-400">${(o.profit || 0).toFixed(4)}</span>
                          </div>
                        </div>
                      </td>

                      {/* API Provider attachment */}
                      <td className="py-4 px-4 font-mono text-center">
                        {o.providerId ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-bold text-[9px] uppercase block max-w-fit mx-auto">
                              {o.providerId}
                            </span>
                            <span className="text-gray-400 block text-[10px] tracking-tight">API ID: {o.providerOrderId || 'N/A'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Self-Fulfilled</span>
                        )}
                      </td>

                      {/* Operation Status override dropdown */}
                      <td className="py-4 px-4 text-right">
                        <select
                          id={`admin-status-dropdown-${o.id}`}
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          className={`px-2 py-1.5 border rounded-lg text-[11px] font-bold cursor-pointer outline-none focus:border-amber-500 transition capitalize ${statusColors[o.status]}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="inprogress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="partial">Partial</option>
                          <option value="canceled">Canceled</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Bulk Operations Footer Board */}
      {selectedIds.length > 0 && (
        <div id="bulk-operations-bar" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0A0D15] border-2 border-blue-500/40 px-6 py-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 z-50 animate-bounce">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-400 animate-ping" />
            <span className="text-sm font-semibold text-white">
              {selectedIds.length} Campaigns Selected
            </span>
          </div>

          <div className="h-px md:h-6 w-full md:w-px bg-blue-900/30" />

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Retry failed */}
            <button
              onClick={handleBulkRetry}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              Retry Placement
            </button>

            {/* Bulk Cancel active */}
            <button
              onClick={handleBulkCancel}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Cancel & Refund
            </button>

            {/* Deselect all */}
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-xl transition"
              title="Deselect all rows"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;

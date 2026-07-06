import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/Toast';
import api from '../../lib/api';
import { Wallet, Transaction, WalletRequest } from '../../types';
import { 
  Wallet as WalletIcon, 
  DollarSign, 
  TrendingUp, 
  Ban, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  FileDown, 
  RotateCcw, 
  FileText, 
  Sliders, 
  AlertCircle,
  HelpCircle,
  ArrowUpDown,
  History
} from 'lucide-react';

export default function AdminWallets() {
  const { success, error } = useToast();
  
  // Tabs: 'requests' | 'wallets' | 'transactions'
  const [activeTab, setActiveTab] = useState<'requests' | 'wallets' | 'transactions'>('requests');

  // Loaders
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingData, setLoadingData] = useState(true);

  // Stats State
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalDeposited: 0,
    totalSpent: 0,
    totalRefunded: 0,
    totalBonus: 0,
    walletsCount: 0,
    frozenCount: 0,
    pendingRequestsCount: 0
  });

  // Data Arrays
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals state
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustAction, setAdjustAction] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjustAdminNote, setAdjustAdminNote] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<WalletRequest | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveAction, setResolveAction] = useState<'approve' | 'reject'>('approve');
  const [resolveAdminNote, setResolveAdminNote] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  // Fetch Stats
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get<{ success: boolean; stats: typeof stats }>('/admin/wallet/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching wallet stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load Main Data based on Active Tab
  const loadTabData = async () => {
    try {
      setLoadingData(true);
      if (activeTab === 'requests') {
        const res = await api.get<{ success: boolean; requests: WalletRequest[] }>('/admin/deposit-requests');
        if (res.data.success) {
          setRequests(res.data.requests);
        }
      } else if (activeTab === 'wallets') {
        const res = await api.get<{ success: boolean; wallets: Wallet[] }>('/admin/wallets');
        if (res.data.success) {
          setWallets(res.data.wallets);
        }
      } else if (activeTab === 'transactions') {
        const res = await api.get<{ success: boolean; transactions: Transaction[] }>('/admin/transactions');
        if (res.data.success) {
          setTransactions(res.data.transactions);
        }
      }
    } catch (err) {
      console.error('Error fetching tab data:', err);
      error('Data Load Error', 'Could not load administrative ledger records.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadTabData();
  }, [activeTab]);

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadTabData()]);
    success('Ledger Refreshed', 'Wallet records updated successfully from Firestore.');
  };

  // Freeze/Unfreeze Action
  const handleToggleFreeze = async (wallet: Wallet) => {
    const action = wallet.isFrozen ? 'unfreeze' : 'freeze';
    try {
      const res = await api.post(`/admin/wallets/${wallet.userId}/adjust`, { action });
      if (res.data.success) {
        success('Wallet Updated', `Successfully ${action}d wallet for ${wallet.userEmail || wallet.userId}`);
        loadStats();
        loadTabData();
      }
    } catch (err: any) {
      error('Action Failed', err.response?.data?.error || `Could not ${action} wallet.`);
    }
  };

  // Submit Manual Adjustment (Credit/Debit)
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;

    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      error('Invalid Input', 'Amount must be greater than 0.');
      return;
    }

    try {
      setSubmittingAdjustment(true);
      const res = await api.post(`/admin/wallets/${selectedWallet.userId}/adjust`, {
        action: adjustAction,
        amount: amt,
        description: adjustDescription,
        adminNote: adjustAdminNote
      });

      if (res.data.success) {
        success('Ledger Adjusted', `Successfully processed manual ${adjustAction} of $${amt.toFixed(2)}.`);
        setIsAdjustModalOpen(false);
        setAdjustAmount('');
        setAdjustDescription('');
        setAdjustAdminNote('');
        setSelectedWallet(null);
        loadStats();
        loadTabData();
      }
    } catch (err: any) {
      error('Adjustment Failed', err.response?.data?.error || 'Could not process balance adjustment.');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Submit Approve / Reject Deposit Request
  const handleResolveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setSubmittingResolve(true);
      const res = await api.post(`/admin/deposit-requests/${selectedRequest.id}/resolve`, {
        action: resolveAction,
        adminNote: resolveAdminNote
      });

      if (res.data.success) {
        success('Ticket Resolved', `Successfully ${resolveAction}d deposit of $${selectedRequest.amount.toFixed(2)}.`);
        setIsResolveModalOpen(false);
        setResolveAdminNote('');
        setSelectedRequest(null);
        loadStats();
        loadTabData();
      }
    } catch (err: any) {
      error('Resolution Failed', err.response?.data?.error || 'Could not resolve deposit request.');
    } finally {
      setSubmittingResolve(false);
    }
  };

  // Download Transactions as CSV helper
  const handleDownloadCSV = () => {
    if (transactions.length === 0) {
      error('Export Empty', 'No transactions found to export.');
      return;
    }

    const headers = ['Transaction ID', 'User Email', 'User ID', 'Type', 'Amount ($)', 'Balance Before ($)', 'Balance After ($)', 'Payment Method', 'Reference ID', 'Description', 'Status', 'Date'];
    const rows = transactions.map(t => [
      t.transactionId,
      t.userEmail || '',
      t.userId,
      t.type,
      t.amount.toFixed(4),
      t.balanceBefore.toFixed(4),
      t.balanceAfter.toFixed(4),
      t.paymentMethod || 'Manual',
      t.referenceId || '',
      t.description,
      t.status,
      t.createdAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zenit_ledger_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('CSV Exported', 'Downloaded system transactions history report.');
  };

  // Filtering Logic
  const getFilteredRequests = () => {
    return requests.filter(r => {
      const matchSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.referenceId && r.referenceId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  };

  const getFilteredWallets = () => {
    return wallets.filter(w => {
      const matchSearch = w.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (w.userEmail && w.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchFrozen = statusFilter === 'all' || 
                          (statusFilter === 'Frozen' && w.isFrozen) || 
                          (statusFilter === 'Active' && !w.isFrozen);
      return matchSearch && matchFrozen;
    });
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const matchSearch = t.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.userEmail && t.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (t.referenceId && t.referenceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  };

  return (
    <div className="space-y-8" id="admin-wallets-panel">
      {/* Overview Stat Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Ledger Balances */}
        <div className="bg-[#0A0D14] border border-blue-500/10 hover:border-blue-500/20 rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-blue-400/80 uppercase tracking-wider">Total User Balances</p>
              {loadingStats ? (
                <div className="h-8 w-24 bg-gray-800 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-2xl font-bold font-sans text-gray-100 mt-1">
                  ${stats.totalBalance.toFixed(2)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <WalletIcon className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-4">Total circulating credit pool</p>
        </div>

        {/* Total Deposits */}
        <div className="bg-[#0A0D14] border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-emerald-400/80 uppercase tracking-wider">Gross Deposits</p>
              {loadingStats ? (
                <div className="h-8 w-24 bg-gray-800 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-2xl font-bold font-sans text-gray-100 mt-1">
                  ${stats.totalDeposited.toFixed(2)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-4">Overall lifetime deposit volume</p>
        </div>

        {/* Total Client Spend */}
        <div className="bg-[#0A0D14] border border-cyan-500/10 hover:border-cyan-500/20 rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-cyan-400/80 uppercase tracking-wider">Client Spending</p>
              {loadingStats ? (
                <div className="h-8 w-24 bg-gray-800 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-2xl font-bold font-sans text-gray-100 mt-1">
                  ${stats.totalSpent.toFixed(2)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <ArrowUpRight className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-4">Net volume spent on campaigns</p>
        </div>

        {/* Pending Approval Deposit Requests */}
        <div className="bg-[#0A0D14] border border-amber-500/10 hover:border-amber-500/20 rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-amber-400/80 uppercase tracking-wider">Approval Queue</p>
              {loadingStats ? (
                <div className="h-8 w-24 bg-gray-800 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-2xl font-bold font-sans text-gray-100 mt-1">
                  {stats.pendingRequestsCount} Pending
                </h3>
              )}
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Sliders className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-4">Manual deposit requests awaiting review</p>
        </div>
      </div>

      {/* Main Ledger Control Board */}
      <div className="bg-[#0A0D14] border border-[#1E293B]/40 rounded-xl overflow-hidden shadow-2xl">
        {/* Module Header */}
        <div className="px-6 py-5 border-b border-[#1E293B]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-display font-bold text-gray-100">Financial Ledger Terminal</h3>
            <p className="text-xs text-gray-400 mt-1">Audit transactions, manage user balances, freeze accounts, and resolve deposits.</p>
          </div>
          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              id="admin-wallets-refresh-btn"
              onClick={handleRefresh}
              className="px-4 py-2 text-xs font-semibold bg-gray-800 border border-gray-700 rounded-lg text-gray-200 hover:bg-gray-700 hover:text-white transition-all cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Sync Ledger
            </button>
            {activeTab === 'transactions' && (
              <button
                id="admin-wallets-export-btn"
                onClick={handleDownloadCSV}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 border border-blue-500/30 rounded-lg text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/15 transition-all cursor-pointer flex items-center gap-2"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="px-6 bg-[#0E121C]/50 border-b border-[#1E293B]/20 flex gap-2 overflow-x-auto">
          <button
            id="admin-wallets-tab-requests"
            onClick={() => { setActiveTab('requests'); setSearchTerm(''); setStatusFilter('all'); }}
            className={`px-5 py-4 text-xs font-mono tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'requests' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
            }`}
          >
            Deposit Approvals Queue ({stats.pendingRequestsCount})
          </button>
          <button
            id="admin-wallets-tab-wallets"
            onClick={() => { setActiveTab('wallets'); setSearchTerm(''); setStatusFilter('all'); }}
            className={`px-5 py-4 text-xs font-mono tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'wallets' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
            }`}
          >
            Client Wallets Ledger
          </button>
          <button
            id="admin-wallets-tab-transactions"
            onClick={() => { setActiveTab('transactions'); setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }}
            className={`px-5 py-4 text-xs font-mono tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'transactions' 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
            }`}
          >
            All System Transactions Log
          </button>
        </div>

        {/* Controls Panel */}
        <div className="p-6 bg-[#080B12]/80 border-b border-[#1E293B]/20 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="admin-wallets-search"
              type="text"
              placeholder={
                activeTab === 'requests' ? "Search requests, emails, refs..." :
                activeTab === 'wallets' ? "Search by email, userId..." : "Search transactionId, description, email..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0E1321] border border-[#1E293B]/40 rounded-lg pl-10 pr-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Status</span>
              <select
                id="admin-wallets-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0E1321] border border-[#1E293B]/40 text-xs text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {activeTab === 'requests' && (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Success">Success</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
                {activeTab === 'wallets' && (
                  <>
                    <option value="Active">Active (Unfrozen)</option>
                    <option value="Frozen">Frozen</option>
                  </>
                )}
                {activeTab === 'transactions' && (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>

            {/* Transaction Type Filter */}
            {activeTab === 'transactions' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Type</span>
                <select
                  id="admin-wallets-type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-[#0E1321] border border-[#1E293B]/40 text-xs text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="Deposit">Deposit</option>
                  <option value="Order Payment">Order Payment</option>
                  <option value="Refund">Refund</option>
                  <option value="Bonus">Bonus</option>
                  <option value="Manual Credit">Manual Credit</option>
                  <option value="Manual Debit">Manual Debit</option>
                  <option value="Adjustment">Adjustment</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Table / Ledger View */}
        <div className="overflow-x-auto">
          {loadingData ? (
            /* Table Skeletons */
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 bg-gray-800/10 border border-gray-800/25 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            <>
              {/* TAB 1: DEPOSIT REQUESTS */}
              {activeTab === 'requests' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0A0D14]/80 border-b border-[#1E293B]/20 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-6">ID / Date</th>
                      <th className="py-4 px-6">Client Email</th>
                      <th className="py-4 px-6">Method</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Reference Code</th>
                      <th className="py-4 px-6">Screenshot</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/10">
                    {getFilteredRequests().length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center">
                          <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm font-sans">No pending or matching deposit requests found.</p>
                        </td>
                      </tr>
                    ) : (
                      getFilteredRequests().map(r => (
                        <tr key={r.id} className="hover:bg-gray-800/10 transition-colors text-xs font-sans">
                          <td className="py-4 px-6">
                            <span className="font-mono text-[11px] block text-blue-400 font-bold">{r.id}</span>
                            <span className="block text-[10px] text-gray-500 mt-0.5">{new Date(r.createdAt).toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-6 font-medium text-gray-300">{r.userEmail}</td>
                          <td className="py-4 px-6 font-mono text-[11px] text-gray-400 capitalize">{r.paymentMethod}</td>
                          <td className="py-4 px-6 font-bold text-gray-200">${r.amount.toFixed(2)}</td>
                          <td className="py-4 px-6 font-mono text-xs text-gray-400">{r.referenceId || <span className="italic text-gray-600">none</span>}</td>
                          <td className="py-4 px-6">
                            {r.screenshotUrl ? (
                              <a
                                href={r.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-8 h-8 rounded border border-blue-900/20 overflow-hidden hover:scale-105 transition-transform"
                                title="Click to view full image"
                              >
                                <img src={r.screenshotUrl} className="w-full h-full object-cover" alt="receipt" />
                              </a>
                            ) : (
                              <span className="text-gray-600 italic">No image</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                              r.status === 'Pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                              r.status === 'Success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                              'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            {r.status === 'Pending' ? (
                              <button
                                id={`resolve-deposit-btn-${r.id}`}
                                onClick={() => { setSelectedRequest(r); setResolveAction('approve'); setIsResolveModalOpen(true); }}
                                className="px-3 py-1.5 bg-blue-600 border border-blue-500/30 text-white rounded text-[11px] font-bold hover:bg-blue-500 transition-colors cursor-pointer"
                              >
                                Review
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-gray-500 italic">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 2: CLIENT WALLETS */}
              {activeTab === 'wallets' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0A0D14]/80 border-b border-[#1E293B]/20 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-6">Client Profile</th>
                      <th className="py-4 px-6">Wallet Balance</th>
                      <th className="py-4 px-6">Deposits Vol.</th>
                      <th className="py-4 px-6">Spent Vol.</th>
                      <th className="py-4 px-6">Refunds Vol.</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/10">
                    {getFilteredWallets().length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm font-sans">No matching client wallets found.</p>
                        </td>
                      </tr>
                    ) : (
                      getFilteredWallets().map(w => (
                        <tr key={w.userId} className="hover:bg-gray-800/10 transition-colors text-xs font-sans">
                          <td className="py-4 px-6">
                            <span className="font-medium text-gray-200 block">{w.userEmail || 'Zenit Member'}</span>
                            <span className="block text-[10px] text-gray-500 font-mono mt-0.5">{w.userId}</span>
                          </td>
                          <td className="py-4 px-6 font-bold text-blue-400">${(w.balance || 0).toFixed(4)}</td>
                          <td className="py-4 px-6 text-gray-300 font-mono">${(w.totalDeposit || 0).toFixed(2)}</td>
                          <td className="py-4 px-6 text-gray-300 font-mono">${(w.totalSpent || 0).toFixed(2)}</td>
                          <td className="py-4 px-6 text-gray-400 font-mono">${(w.totalRefund || 0).toFixed(2)}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                              w.isFrozen ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            }`}>
                              {w.isFrozen ? 'FROZEN' : 'ACTIVE'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              id={`adjust-balance-btn-${w.userId}`}
                              onClick={() => { setSelectedWallet(w); setAdjustAction('credit'); setIsAdjustModalOpen(true); }}
                              className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 rounded text-[11px] font-bold hover:bg-gray-700 hover:text-white transition-colors cursor-pointer"
                            >
                              Adjustment
                            </button>
                            <button
                              id={`freeze-wallet-btn-${w.userId}`}
                              onClick={() => handleToggleFreeze(w)}
                              className={`px-2.5 py-1.5 border rounded text-[11px] font-bold transition-all cursor-pointer ${
                                w.isFrozen 
                                  ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20' 
                                  : 'bg-rose-600/10 border-rose-500/20 text-rose-400 hover:bg-rose-600/20'
                              }`}
                            >
                              {w.isFrozen ? <Unlock className="w-3 h-3 inline mr-1" /> : <Ban className="w-3 h-3 inline mr-1" />}
                              {w.isFrozen ? 'Unfreeze' : 'Freeze'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 3: MASTER TRANSACTION LOGS */}
              {activeTab === 'transactions' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0A0D14]/80 border-b border-[#1E293B]/20 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      <th className="py-4 px-6">ID / Date</th>
                      <th className="py-4 px-6">Client Email</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6">Amount</th>
                      <th className="py-4 px-6">Before → After</th>
                      <th className="py-4 px-6">Description</th>
                      <th className="py-4 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/10">
                    {getFilteredTransactions().length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
                          <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm font-sans">No matching transactions audit logs found.</p>
                        </td>
                      </tr>
                    ) : (
                      getFilteredTransactions().map(t => (
                        <tr key={t.transactionId} className="hover:bg-gray-800/10 transition-colors text-xs font-sans">
                          <td className="py-4 px-6">
                            <span className="font-mono text-[11px] block text-blue-400 font-bold">{t.transactionId}</span>
                            <span className="block text-[10px] text-gray-500 mt-0.5">{new Date(t.createdAt).toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-6 font-medium text-gray-300">
                            {t.userEmail || <span className="font-mono text-[10px] text-gray-500">{t.userId}</span>}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                              t.type === 'Deposit' || t.type === 'Manual Credit' || t.type === 'Bonus' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              t.type === 'Order Payment' || t.type === 'Manual Debit' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                              'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-gray-200">${t.amount.toFixed(4)}</td>
                          <td className="py-4 px-6 font-mono text-[10px] text-gray-400">
                            ${t.balanceBefore.toFixed(2)} → <span className="font-bold text-gray-200">${t.balanceAfter.toFixed(2)}</span>
                          </td>
                          <td className="py-4 px-6 text-gray-400 max-w-xs truncate" title={t.description}>{t.description}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                              t.status === 'Success' ? 'text-emerald-400 bg-emerald-500/5' :
                              t.status === 'Pending' ? 'text-amber-400 bg-amber-500/5' : 'text-rose-400 bg-rose-500/5'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: MANUAL ADJUSTMENT (CREDIT/DEBIT) */}
      <AnimatePresence>
        {isAdjustModalOpen && selectedWallet && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0D14] border border-blue-500/20 rounded-xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-gray-800/30 flex justify-between items-center">
                <h4 className="font-display font-bold text-gray-200">Adjust Wallet Balance</h4>
                <button 
                  id="close-adjust-modal-btn"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-300"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdjustment} className="p-6 space-y-4">
                <div className="text-xs bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg text-gray-400">
                  <span className="font-semibold block text-gray-300">Target Client:</span>
                  <span className="font-mono mt-0.5 block">{selectedWallet.userEmail} ({selectedWallet.userId})</span>
                  <span className="font-semibold block text-gray-300 mt-2">Current Balance:</span>
                  <span className="font-mono text-blue-400 text-sm font-bold block">${selectedWallet.balance.toFixed(4)}</span>
                </div>

                {/* Credit or Debit */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="adjust-modal-action-credit"
                    type="button"
                    onClick={() => setAdjustAction('credit')}
                    className={`py-2 px-4 rounded-lg text-xs font-bold font-mono uppercase tracking-wider text-center border cursor-pointer ${
                      adjustAction === 'credit' 
                        ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 inline mr-1" />
                    Credit Wallet
                  </button>
                  <button
                    id="adjust-modal-action-debit"
                    type="button"
                    onClick={() => setAdjustAction('debit')}
                    className={`py-2 px-4 rounded-lg text-xs font-bold font-mono uppercase tracking-wider text-center border cursor-pointer ${
                      adjustAction === 'debit' 
                        ? 'bg-rose-600/10 border-rose-500/30 text-rose-400' 
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 inline mr-1" />
                    Debit Wallet
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Adjustment Amount ($)</label>
                  <input
                    id="adjust-modal-amount"
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 50.00"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full bg-[#0E1321] border border-gray-800 rounded-lg px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Description (Shown to Client)</label>
                  <input
                    id="adjust-modal-desc"
                    type="text"
                    placeholder="e.g. Compensation for service downtime"
                    value={adjustDescription}
                    onChange={(e) => setAdjustDescription(e.target.value)}
                    className="w-full bg-[#0E1321] border border-gray-800 rounded-lg px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Admin Note */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Internal Admin Note</label>
                  <textarea
                    id="adjust-modal-note"
                    rows={3}
                    placeholder="Reasoning, ticket code reference, internal audit remarks..."
                    value={adjustAdminNote}
                    onChange={(e) => setAdjustAdminNote(e.target.value)}
                    className="w-full bg-[#0E1321] border border-gray-800 rounded-lg px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    id="cancel-adjust-modal-btn"
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-adjust-modal-btn"
                    type="submit"
                    disabled={submittingAdjustment}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingAdjustment ? 'Processing...' : 'Apply Adjustment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RESOLVE DEPOSIT REQUEST (APPROVE/REJECT) */}
      <AnimatePresence>
        {isResolveModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0D14] border border-blue-500/20 rounded-xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-gray-800/30 flex justify-between items-center">
                <h4 className="font-display font-bold text-gray-200">Review Deposit Request</h4>
                <button 
                  id="close-resolve-modal-btn"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-300"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResolveRequest} className="p-6 space-y-4">
                <div className="text-xs bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg text-gray-400 space-y-2">
                  <div>
                    <span className="font-semibold block text-gray-300">User Email:</span>
                    <span className="font-mono mt-0.5 block">{selectedRequest.userEmail}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="font-semibold block text-gray-300">Method:</span>
                      <span className="font-mono block mt-0.5 capitalize">{selectedRequest.paymentMethod}</span>
                    </div>
                    <div>
                      <span className="font-semibold block text-gray-300">Amount:</span>
                      <span className="font-mono block mt-0.5 text-blue-400 font-bold">${selectedRequest.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold block text-gray-300">Reference / Hash Code:</span>
                    <span className="font-mono mt-0.5 block select-all">{selectedRequest.referenceId || 'N/A'}</span>
                  </div>
                  {selectedRequest.screenshotUrl && (
                    <div className="pt-2 border-t border-gray-800/20">
                      <span className="font-semibold block text-gray-300 mb-1">Uploaded Screenshot:</span>
                      <a 
                        href={selectedRequest.screenshotUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border border-blue-500/20 max-h-48 bg-[#06080E] relative group"
                        title="Click to open image in new tab"
                      >
                        <img 
                          src={selectedRequest.screenshotUrl} 
                          className="w-full h-full object-contain max-h-48" 
                          alt="Uploaded Payment Receipt" 
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[10px] text-white font-mono bg-blue-600 px-2 py-1 rounded">View Fullscreen ↗</span>
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                {/* Approve or Reject Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="resolve-modal-action-approve"
                    type="button"
                    onClick={() => setResolveAction('approve')}
                    className={`py-2 px-4 rounded-lg text-xs font-bold font-mono uppercase tracking-wider text-center border cursor-pointer ${
                      resolveAction === 'approve' 
                        ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    Approve Payment
                  </button>
                  <button
                    id="resolve-modal-action-reject"
                    type="button"
                    onClick={() => setResolveAction('reject')}
                    className={`py-2 px-4 rounded-lg text-xs font-bold font-mono uppercase tracking-wider text-center border cursor-pointer ${
                      resolveAction === 'reject' 
                        ? 'bg-rose-600/10 border-rose-500/30 text-rose-400' 
                        : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <XCircle className="w-4 h-4 inline mr-1" />
                    Reject Payment
                  </button>
                </div>

                {/* Admin Note / Response message */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Internal / Response Note</label>
                  <textarea
                    id="resolve-modal-note"
                    rows={4}
                    placeholder={
                      resolveAction === 'approve' 
                        ? "Deposit validated & credited to client's wallet profile successfully..."
                        : "Rejected. Transaction reference code does not match payment registry, or funds were reversed..."
                    }
                    value={resolveAdminNote}
                    onChange={(e) => setResolveAdminNote(e.target.value)}
                    className="w-full bg-[#0E1321] border border-gray-800 rounded-lg px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                    required={resolveAction === 'reject'} // Required on rejection to state cause
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    id="cancel-resolve-modal-btn"
                    type="button"
                    onClick={() => setIsResolveModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-gray-300 hover:bg-gray-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-resolve-modal-btn"
                    type="submit"
                    disabled={submittingResolve}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-lg cursor-pointer ${
                      resolveAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                    } disabled:opacity-50`}
                  >
                    {submittingResolve ? 'Processing...' : `Submit ${resolveAction === 'approve' ? 'Approval' : 'Rejection'}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

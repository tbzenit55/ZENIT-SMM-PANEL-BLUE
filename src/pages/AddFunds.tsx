import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import api from '../lib/api';
import { Wallet, Transaction, WalletRequest, CustomPaymentMethod } from '../types';
import { 
  CreditCard, 
  DollarSign, 
  Wallet as WalletIcon, 
  ShieldCheck, 
  CheckCircle2, 
  List, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Sliders, 
  Clock, 
  AlertCircle,
  TrendingDown,
  XCircle,
  HelpCircle,
  Smartphone,
  QrCode,
  Coins,
  Copy,
  ExternalLink
} from 'lucide-react';

export function AddFunds() {
  const { userProfile, refreshProfile } = useAuth();
  const { success, error } = useToast();
  
  // Tab control: 'form' | 'transactions' | 'requests'
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'transactions' | 'requests'>('form');

  // Loading states
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Stats / Wallet state
  const [wallet, setWallet] = useState<Wallet | null>(null);

  // Dynamic payment methods list
  const [paymentMethods, setPaymentMethods] = useState<CustomPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<CustomPaymentMethod | null>(null);

  // Lists
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [requests, setRequests] = useState<WalletRequest[]>([]);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form states
  const [amount, setAmount] = useState('');
  const [referenceId, setReferenceId] = useState('');

  // Fetch customizable payment methods
  const loadPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const res = await api.get<{ success: boolean; paymentMethods: CustomPaymentMethod[] }>('/payment-methods');
      if (res.data.success) {
        setPaymentMethods(res.data.paymentMethods);
        if (res.data.paymentMethods.length > 0) {
          setSelectedMethod(res.data.paymentMethods[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoadingMethods(false);
    }
  };

  // Fetch Wallet Stats
  const loadWalletStats = async () => {
    try {
      setLoadingWallet(true);
      const res = await api.get<{ success: boolean; wallet: Wallet }>('/wallet');
      if (res.data.success) {
        setWallet(res.data.wallet);
      }
    } catch (err) {
      console.error('Error fetching user wallet stats:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Fetch List Data based on tab
  const loadTabData = async () => {
    try {
      setLoadingData(true);
      if (activeSubTab === 'transactions') {
        const res = await api.get<{ success: boolean; transactions: Transaction[] }>('/wallet/transactions');
        if (res.data.success) {
          setTransactions(res.data.transactions);
        }
      } else if (activeSubTab === 'requests') {
        const res = await api.get<{ success: boolean; requests: WalletRequest[] }>('/wallet/requests');
        if (res.data.success) {
          setRequests(res.data.requests);
        }
      }
    } catch (err) {
      console.error('Error fetching tab list data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadWalletStats();
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    loadTabData();
  }, [activeSubTab]);

  const handleRefresh = async () => {
    await Promise.all([loadWalletStats(), loadPaymentMethods(), loadTabData(), refreshProfile()]);
    success('Dashboard Synced', 'Your balance and transaction history are up to date.');
  };

  // Submit deposit request
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMethod) {
      error('No Gateway Selected', 'Please select a billing gateway to deposit.');
      return;
    }

    const depAmt = parseFloat(amount);
    
    if (isNaN(depAmt) || depAmt <= 0) {
      error('Invalid Amount', 'Please input a deposit value greater than zero.');
      return;
    }

    if (depAmt < selectedMethod.minDeposit) {
      error('Limit Restriction', `The minimum deposit threshold for ${selectedMethod.name} is $${selectedMethod.minDeposit.toFixed(2)} USD.`);
      return;
    }

    if (depAmt > selectedMethod.maxDeposit) {
      error('Limit Restriction', `The maximum deposit limit for ${selectedMethod.name} is $${selectedMethod.maxDeposit.toFixed(2)} USD.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message: string; request: WalletRequest }>('/wallet/deposit', {
        amount: depAmt,
        paymentMethod: selectedMethod.id,
        referenceId: referenceId || undefined
      });
      
      if (res.data.success) {
        success('Request Logged', 'Manual payment deposit requested successfully. Administrators are reviewing.');
        setAmount('');
        setReferenceId('');
        setActiveSubTab('requests'); // Switch to active requests log
        await loadWalletStats();
        await loadTabData();
      }
    } catch (err: any) {
      error('Deposit Error', err.response?.data?.error || 'An error occurred while submitting payment ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    success('Copied!', `${fieldName} has been copied to your clipboard.`);
  };

  const renderMethodIcon = (logoName: string) => {
    switch (logoName) {
      case 'QrCode':
        return <QrCode className="w-5 h-5 text-blue-400" />;
      case 'Coins':
        return <Coins className="w-5 h-5 text-blue-400" />;
      case 'CreditCard':
        return <CreditCard className="w-5 h-5 text-blue-400" />;
      case 'Wallet':
        return <WalletIcon className="w-5 h-5 text-blue-400" />;
      case 'Smartphone':
      default:
        return <Smartphone className="w-5 h-5 text-blue-400" />;
    }
  };

  // Filters logic
  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const matchSearch = t.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.referenceId && t.referenceId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  };

  return (
    <div className="space-y-8 font-sans" id="user-wallet-dashboard">
      
      {/* 1. Neon Grid Wallet Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Active Balance Card (Primary) */}
        <div className="bg-[#0A0D15] border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.05)] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5">
            <WalletIcon className="w-32 h-32 text-blue-500" />
          </div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">Available Balance</p>
              {loadingWallet ? (
                <div className="h-8 w-24 bg-blue-950/25 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-3xl font-bold text-gray-100 mt-1 font-sans">
                  ${(wallet?.balance || userProfile?.balance || 0).toFixed(4)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <WalletIcon className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-[10px] text-gray-500 font-mono">
            <span>Status:</span>
            {wallet?.isFrozen ? (
              <span className="text-rose-500 font-bold">FROZEN (Locked)</span>
            ) : (
              <span className="text-emerald-500 font-bold">Active</span>
            )}
          </div>
        </div>

        {/* Total Deposited */}
        <div className="bg-[#0A0D15] border border-emerald-500/10 hover:border-emerald-500/20 rounded-2xl p-6 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-emerald-400/80 uppercase tracking-widest">Gross Deposits</p>
              {loadingWallet ? (
                <div className="h-8 w-24 bg-emerald-950/25 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-2xl font-bold text-gray-100 mt-1">
                  ${(wallet?.totalDeposit || 0).toFixed(2)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-4">Lifetime funded volume</p>
        </div>

        {/* Total Spent */}
        <div className="bg-[#0A0D15] border border-cyan-500/10 hover:border-cyan-500/20 rounded-2xl p-6 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-cyan-400/80 uppercase tracking-widest">Campaign Spend</p>
              {loadingWallet ? (
                <div className="h-8 w-24 bg-cyan-950/25 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-2xl font-bold text-gray-100 mt-1">
                  ${(wallet?.totalSpent || 0).toFixed(2)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <ArrowUpRight className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-4">Spent on SMM packages</p>
        </div>

        {/* Total Bonuses */}
        <div className="bg-[#0A0D15] border border-amber-500/10 hover:border-amber-500/20 rounded-2xl p-6 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-mono font-bold text-amber-400/80 uppercase tracking-widest">Bonus Credits</p>
              {loadingWallet ? (
                <div className="h-8 w-24 bg-amber-950/25 animate-pulse rounded mt-2"></div>
              ) : (
                <h3 className="text-2xl font-bold text-gray-100 mt-1">
                  ${(wallet?.totalBonus || 0).toFixed(2)}
                </h3>
              )}
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <TrendingDown className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-4">Bonus reward promotions credited</p>
        </div>

      </div>

      {/* 2. Interactive Ledger Dashboard Controls */}
      <div className="bg-[#0A0D15] border border-blue-900/10 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Module Nav Bar */}
        <div className="px-6 py-4 bg-[#070A10] border-b border-blue-900/15 flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-2">
            <button
              id="user-wallet-btn-form"
              onClick={() => { setActiveSubTab('form'); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'form' 
                  ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
              }`}
            >
              Deposit Funds
            </button>
            <button
              id="user-wallet-btn-transactions"
              onClick={() => { setActiveSubTab('transactions'); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'transactions' 
                  ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
              }`}
            >
              Transaction Logs
            </button>
            <button
              id="user-wallet-btn-requests"
              onClick={() => { setActiveSubTab('requests'); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer ${
                activeSubTab === 'requests' 
                  ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/10'
              }`}
            >
              Approval Tickets Queue
            </button>
          </div>
          
          <button
            id="user-wallet-refresh-btn"
            onClick={handleRefresh}
            className="px-3.5 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Sync Balance
          </button>
        </div>

        {/* Dynamic Inner Tab Content */}
        <div className="p-8">
          
          {/* TAB 1: DEPOSIT FORM */}
          {activeSubTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form Col */}
              <div className="lg:col-span-2 space-y-6">
                
                {wallet?.isFrozen ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Wallet Frozen</h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        Your billing profile has been suspended or locked by system administrators. Manual deposit initialization is currently locked. Please submit a support ticket if you believe this is an error.
                      </p>
                    </div>
                  </div>
                ) : null}

                {loadingMethods ? (
                  <div className="space-y-4">
                    <div className="h-4 w-32 bg-gray-800/20 rounded animate-pulse"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="h-28 bg-[#06080E] border border-blue-900/10 rounded-xl animate-pulse"></div>
                      <div className="h-28 bg-[#06080E] border border-blue-900/10 rounded-xl animate-pulse"></div>
                    </div>
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="p-6 bg-[#06080E] border border-blue-900/10 rounded-2xl text-center">
                    <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No payment gateways have been enabled by the administrator.</p>
                  </div>
                ) : (
                  <form onSubmit={handleDepositSubmit} className="space-y-6">
                    {/* Gateway Cards */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-3">Choose Billing Gateway</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {paymentMethods.map((m) => {
                          const isSelected = selectedMethod?.id === m.id;
                          return (
                            <button
                              id={`payment-method-v2-${m.id}`}
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedMethod(m)}
                              disabled={!!wallet?.isFrozen}
                              className={`
                                p-4 rounded-xl border text-left flex flex-col justify-between h-28 transition-all duration-200 cursor-pointer relative overflow-hidden
                                ${isSelected 
                                  ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_15px_rgba(37,99,235,0.06)]' 
                                  : 'bg-[#06080E] border-blue-900/10 hover:border-blue-900/30 hover:bg-[#080B14]'
                                }
                                disabled:opacity-40 disabled:cursor-not-allowed
                              `}
                            >
                              <div className="flex items-start justify-between w-full">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-semibold text-gray-200 text-xs">{m.name}</h4>
                                    {m.isFutureReady && (
                                      <span className="bg-amber-500/10 text-amber-400 text-[8px] font-mono font-bold px-1 py-0.2 rounded border border-amber-500/15">
                                        Future
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{m.description}</p>
                                </div>
                                <div className="p-2 bg-blue-950/20 rounded-lg border border-blue-900/10">
                                  {renderMethodIcon(m.logo)}
                                </div>
                              </div>
                              <div className="flex justify-between items-center w-full mt-2 border-t border-blue-900/5 pt-2">
                                <span className="text-[9px] text-gray-500 font-mono">
                                  Min: ${m.minDeposit}
                                </span>
                                <span className="text-[9px] text-blue-400 font-mono font-bold uppercase tracking-wider">
                                  {m.processingTime}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedMethod && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#06080E]/40 p-5 rounded-2xl border border-blue-900/5">
                        {/* Amount */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Amount (USD)
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                            <input
                              id="add-funds-amount-v2"
                              type="number"
                              step="0.01"
                              placeholder={`Range: $${selectedMethod.minDeposit} - $${selectedMethod.maxDeposit}`}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              disabled={!!wallet?.isFrozen}
                              className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                            Limits: ${selectedMethod.minDeposit} to ${selectedMethod.maxDeposit}
                          </span>
                        </div>

                        {/* Reference / Memo */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-2">
                            UTR / TxHash / Order ID
                          </label>
                          <div className="relative">
                            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                            <input
                              id="add-funds-ref-v2"
                              type="text"
                              placeholder="12-digit Ref / Transaction ID"
                              value={referenceId}
                              onChange={(e) => setReferenceId(e.target.value)}
                              disabled={!!wallet?.isFrozen}
                              className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                              required={!selectedMethod.isFutureReady}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                            Needed for admin verification
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedMethod?.isFutureReady ? (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Future-Ready Notice</h4>
                          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                            This integration is currently a placeholder for a future automated API. You can explore limits and requirements, but manual request submission is simulated for testing.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <button
                      id="add-funds-submit-btn-v2"
                      type="submit"
                      disabled={submitting || !!wallet?.isFrozen || !selectedMethod}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold rounded-xl tracking-wider uppercase font-mono shadow-lg cursor-pointer transition-colors"
                    >
                      {submitting ? 'Verifying Gateway Connection...' : 'Submit Deposit Request'}
                    </button>
                  </form>
                )}
              </div>

              {/* Security & Instructions Col */}
              <div className="space-y-6">
                {selectedMethod ? (
                  <div className="bg-[#06080E] border border-blue-900/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-blue-900/10 pb-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        {renderMethodIcon(selectedMethod.logo)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-200 text-xs uppercase tracking-wider font-mono">
                          {selectedMethod.name} Instructions
                        </h4>
                        <p className="text-[10px] text-gray-500">
                          Processing: {selectedMethod.processingTime}
                        </p>
                      </div>
                    </div>

                    {selectedMethod.upiId && (
                      <div className="bg-[#080B14] p-3.5 rounded-xl border border-blue-900/15 flex flex-col gap-1.5">
                        <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                          UPI ID / Payment Address
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-blue-400 break-all">
                            {selectedMethod.upiId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethod.upiId || '', 'Payment Address')}
                            className="p-1.5 hover:bg-blue-500/10 rounded text-gray-400 hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
                            title="Copy Address"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedMethod.qrImageUrl && (
                      <div className="bg-[#080B14] p-4 rounded-xl border border-blue-900/15 text-center space-y-2.5">
                        <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">
                          Scan to Pay QR Code
                        </span>
                        <div className="relative aspect-square w-40 mx-auto bg-white rounded-lg p-2 flex items-center justify-center overflow-hidden border border-blue-500/10 shadow-[0_0_15px_rgba(37,99,235,0.05)]">
                          <img
                            src={selectedMethod.qrImageUrl}
                            alt={`${selectedMethod.name} QR Code`}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="text-[9px] text-gray-500 font-mono">
                          Open your camera or payment app to scan
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">
                        Deposit Steps
                      </span>
                      <div className="text-[11px] text-gray-300 space-y-2 leading-relaxed bg-[#080B14]/40 p-3.5 rounded-xl border border-blue-900/5 whitespace-pre-wrap">
                        {selectedMethod.instructions}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#06080E] border border-blue-900/10 rounded-2xl p-6 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto">
                      <HelpCircle className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-200 text-xs uppercase tracking-wider font-mono">No Gateway Selected</h4>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        Select an available billing gateway to display customized instructions, Scan-to-pay QR codes, and processing times.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-[#06080E] border border-blue-900/10 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-200 text-xs uppercase tracking-wider font-mono">Secure Verification</h4>
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                      All manual payment requests go through high-grade audit validations. Please make sure the Transaction reference code is correct to ensure quick approval.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PERSONAL TRANSACTION LOGS */}
          {activeSubTab === 'transactions' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#06080E] p-4 rounded-xl border border-blue-900/10">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="user-transactions-search"
                    type="text"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#080B12] border border-blue-900/20 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Filter Type:</span>
                  <select
                    id="user-transactions-type"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-[#080B12] border border-blue-900/20 text-xs text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="Deposit">Deposits</option>
                    <option value="Order Payment">Order Payments</option>
                    <option value="Refund">Refunds</option>
                    <option value="Bonus">Promotional Bonuses</option>
                    <option value="Manual Credit">Credits</option>
                    <option value="Manual Debit">Debits</option>
                    <option value="Adjustment">Adjustments</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                {loadingData ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-11 bg-gray-800/10 border border-gray-800/25 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-blue-900/10 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Closing Balance</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-900/5 text-xs">
                      {getFilteredTransactions().length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No transaction audit logs found.</p>
                          </td>
                        </tr>
                      ) : (
                        getFilteredTransactions().map(t => (
                          <tr key={t.transactionId} className="hover:bg-blue-950/10 transition-colors">
                            <td className="py-4 px-4 font-mono text-[11px] text-blue-400 font-bold">{t.transactionId}</td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${
                                t.type === 'Deposit' || t.type === 'Manual Credit' || t.type === 'Bonus' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                t.type === 'Order Payment' || t.type === 'Manual Debit' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-bold text-gray-200">${t.amount.toFixed(4)}</td>
                            <td className="py-4 px-4 font-mono text-gray-400">${t.balanceAfter.toFixed(2)}</td>
                            <td className="py-4 px-4 text-gray-400 truncate max-w-xs">{t.description}</td>
                            <td className="py-4 px-4 text-gray-500">{new Date(t.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USER DEPOSIT TICKETS */}
          {activeSubTab === 'requests' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                {loadingData ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-11 bg-gray-800/10 border border-gray-800/25 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-blue-900/10 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        <th className="py-3 px-4">Ticket ID</th>
                        <th className="py-3 px-4">Gateway</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Reference ID</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Review Notes</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-900/5 text-xs">
                      {requests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center">
                            <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">No deposit requests logged in this system.</p>
                          </td>
                        </tr>
                      ) : (
                        requests.map(r => (
                          <tr key={r.id} className="hover:bg-blue-950/10 transition-colors">
                            <td className="py-4 px-4 font-mono text-[11px] text-blue-400 font-bold">{r.id}</td>
                            <td className="py-4 px-4 font-mono text-[11px] text-gray-400 capitalize">{r.paymentMethod}</td>
                            <td className="py-4 px-4 font-bold text-gray-200">${r.amount.toFixed(2)}</td>
                            <td className="py-4 px-4 font-mono text-gray-500">{r.referenceId || <span className="italic text-gray-600">none</span>}</td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${
                                r.status === 'Pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                r.status === 'Success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-gray-400 max-w-xs truncate" title={r.adminNote}>{r.adminNote || <span className="italic text-gray-600">Awaiting admin review</span>}</td>
                            <td className="py-4 px-4 text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default AddFunds;

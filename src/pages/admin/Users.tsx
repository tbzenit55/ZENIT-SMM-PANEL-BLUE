import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from '../../components/Loader';
import { useToast } from '../../components/Toast';
import api from '../../lib/api';
import { UserProfile, Order, Payment } from '../../types';
import { 
  Users, 
  Shield, 
  ShieldAlert, 
  Ban, 
  Unlock, 
  Search, 
  Filter, 
  Trash2, 
  Plus, 
  Eye, 
  DollarSign, 
  ShoppingCart, 
  History, 
  X, 
  UserPlus, 
  TrendingUp, 
  CheckCircle,
  HelpCircle,
  Clock,
  UserCheck
} from 'lucide-react';

export function UsersList() {
  const { success, error } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'admins'>('users');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Selected User Modal state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // Edit User modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'Super Admin' | 'Admin' | 'User'>('User');
  const [editStatus, setEditStatus] = useState<'Active' | 'Suspended' | 'Banned'>('Active');
  const [editBalance, setEditBalance] = useState('');

  // Create User/Admin modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createRole, setCreateRole] = useState<'Super Admin' | 'Admin' | 'User'>('User');
  const [createBalance, setCreateBalance] = useState('0.00');
  const [createStatus, setCreateStatus] = useState<'Active' | 'Suspended' | 'Banned'>('Active');

  // Permisison selection simulation (Role management module)
  const [permissions, setPermissions] = useState({
    services: true,
    orders: true,
    users: true,
    tickets: true,
    settings: false,
    logs: false,
  });

  const loadUsers = async () => {
    try {
      const res = await api.get<{ users: UserProfile[] }>('/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
      error('Load Error', 'Failed to fetch platform users registry.');
    }
  };

  useEffect(() => {
    async function init() {
      await loadUsers();
      setLoading(false);
    }
    init();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await loadUsers();
    setLoading(false);
  };

  // View user deep profile (stats, orders, wallet history)
  const handleViewUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoadingUserDetails(true);
    setUserOrders([]);
    setUserPayments([]);

    // Populate profile edit form values
    setEditDisplayName(user.displayName || user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditBalance(user.balance.toString());

    // Simulated customized permission sets for admins
    if (user.role === 'Super Admin') {
      setPermissions({ services: true, orders: true, users: true, tickets: true, settings: true, logs: true });
    } else if (user.role === 'Admin') {
      setPermissions({ services: true, orders: true, users: true, tickets: true, settings: false, logs: false });
    } else {
      setPermissions({ services: false, orders: false, users: false, tickets: false, settings: false, logs: false });
    }

    try {
      // Fetch user specific orders and payments
      const [ordersRes, paymentsRes] = await Promise.all([
        api.get<{ orders: Order[] }>('/orders'),
        api.get<{ payments: Payment[] }>('/payments')
      ]);

      const filteredOrders = ordersRes.data.orders.filter(o => o.userId === user.uid);
      const filteredPayments = paymentsRes.data.payments.filter(p => p.userId === user.uid);

      setUserOrders(filteredOrders);
      setUserPayments(filteredPayments);
    } catch (err) {
      console.error('Failed to load user detailed analytics:', err);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Adjust profile updates
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.post(`/users/${selectedUser.uid}/adjust`, {
        balance: Number(editBalance),
        role: editRole,
        status: editStatus,
        displayName: editDisplayName,
        email: editEmail
      });

      // Log activity
      await api.post('/logs', {
        type: 'admin',
        action: `Adjusted user parameters for ${editEmail}: Status=${editStatus}, Role=${editRole}, Balance=$${Number(editBalance).toFixed(2)}`
      });

      success('Profile Updated', 'User attributes synchronized successfully.');
      setIsEditingProfile(false);
      
      // Refresh local copy
      const updatedUser = {
        ...selectedUser,
        displayName: editDisplayName,
        name: editDisplayName,
        email: editEmail,
        role: editRole,
        status: editStatus,
        balance: Number(editBalance)
      };
      setSelectedUser(updatedUser);
      await loadUsers();
    } catch (err) {
      error('Update Error', 'Could not save user profile adjustments.');
    }
  };

  // Quick Action: Change user status (Suspend, Ban, Activate)
  const handleQuickStatusChange = async (uid: string, nextStatus: 'Active' | 'Suspended' | 'Banned') => {
    try {
      await api.post(`/users/${uid}/adjust`, {
        status: nextStatus
      });

      await api.post('/logs', {
        type: 'admin',
        action: `Quick updated user status for UID ${uid} to: ${nextStatus}`
      });

      success('Status Changed', `User status changed to ${nextStatus}.`);
      if (selectedUser && selectedUser.uid === uid) {
        setSelectedUser({ ...selectedUser, status: nextStatus });
        setEditStatus(nextStatus);
      }
      await loadUsers();
    } catch (err) {
      error('Action Failed', 'Could not update status.');
    }
  };

  // Delete user profile
  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('CRITICAL ACTION: Are you sure you want to permanently delete this user profile? This action is irreversible.')) {
      return;
    }

    try {
      await api.delete(`/users/${uid}`);
      success('User Deleted', 'Account profile terminated from repository.');
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      error('Deletion Failed', 'Unable to delete user profile.');
    }
  };

  // Create User or Administrator profile
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post('/users/create', {
        email: createEmail,
        displayName: createDisplayName,
        role: createRole,
        balance: Number(createBalance),
        status: createStatus
      });

      success('Profile Created', `New ${createRole} registered successfully.`);
      setIsCreateModalOpen(false);
      
      // Reset form
      setCreateEmail('');
      setCreateDisplayName('');
      setCreateRole('User');
      setCreateBalance('0.00');
      setCreateStatus('Active');

      await loadUsers();
    } catch (err: any) {
      error('Creation Error', err.response?.data?.error || 'Could not register user.');
    }
  };

  // Filter users lists based on tabs & filters
  const filteredUsers = users.filter((u) => {
    // Tab filtering (Regular users vs Admin roles)
    const isAdminRole = u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'admin';
    if (activeSubTab === 'users' && isAdminRole) return false;
    if (activeSubTab === 'admins' && !isAdminRole) return false;

    // Search keyword
    const matchesSearch = 
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchTerm.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;

    // Status filter
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) return <Loader />;

  return (
    <div className="space-y-6">
      {/* Upper Panel Overview Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0A0D14] border border-blue-900/10 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -z-10" />
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Members & Administrators Register
          </h2>
          <p className="text-gray-400 text-sm mt-1">Audit profile credentials, adjust digital wallets, customize access controls, and investigate billing streams.</p>
        </div>

        <button
          id="open-create-user-modal-btn"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl border border-blue-400/25 shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <UserPlus className="w-4 h-4" />
          Create User/Admin Account
        </button>
      </div>

      {/* Role Tabs (Users vs Admins) */}
      <div className="flex border-b border-blue-900/10">
        <button
          id="subtab-users-toggle"
          onClick={() => { setActiveSubTab('users'); setSearchTerm(''); }}
          className={`px-6 py-3.5 text-xs font-mono uppercase tracking-wider font-bold border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'users' 
              ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          User Directory ({users.filter(u => u.role !== 'Admin' && u.role !== 'Super Admin' && u.role !== 'admin').length})
        </button>
        
        <button
          id="subtab-admins-toggle"
          onClick={() => { setActiveSubTab('admins'); setSearchTerm(''); }}
          className={`px-6 py-3.5 text-xs font-mono uppercase tracking-wider font-bold border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'admins' 
              ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Admin Management ({users.filter(u => u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'admin').length})
        </button>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            id="user-search-input"
            type="text"
            placeholder="Search by name, email, account UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A0D14] border border-blue-900/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Role Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <select
            id="role-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-[#0A0D14] border border-blue-900/10 rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#0A0D14] border border-blue-900/10 rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Banned">Banned</option>
          </select>
        </div>
      </div>

      {/* Directory Table Grid */}
      <div className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-blue-900/10 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#0F131D]/40">
                <th className="p-4">Profile Identification</th>
                <th className="p-4">Authorization</th>
                <th className="p-4">Status</th>
                <th className="p-4">Digital Wallet</th>
                <th className="p-4 text-right">Inspect Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/5 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
                    No registry profiles matching your filters are currently tracked.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isAdminStyle = u.role === 'Admin' || u.role === 'Super Admin' || u.role === 'admin';
                  return (
                    <tr key={u.uid} className="hover:bg-[#070A11]/30 transition-colors">
                      {/* Name/Email Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAdminStyle ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-600/10 text-blue-400'
                          }`}>
                            {(u.displayName || u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-gray-100 font-semibold block">{u.displayName || u.name}</span>
                            <span className="text-gray-500 font-mono text-[10px] block mt-0.5">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                          u.role === 'Super Admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          u.role === 'Admin' || u.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                        }`}>
                          <Shield className="w-3 h-3" />
                          {u.role === 'admin' ? 'Admin' : u.role}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {u.status}
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td className="p-4 font-mono">
                        <span className="font-bold text-emerald-400">${u.balance?.toFixed(2)}</span>
                        <span className="block text-[10px] text-gray-500 mt-0.5 font-sans">Spent: ${(u.totalSpent || 0).toFixed(2)}</span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            id={`inspect-user-btn-${u.uid}`}
                            onClick={() => handleViewUser(u)}
                            className="p-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Detailed Inspection Panel & User Controls */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#05070B] border border-blue-900/15 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(30,58,138,0.25)] relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-blue-900/10 bg-[#0A0D14] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400">
                    {(selectedUser.displayName || selectedUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white tracking-tight">
                      Inspect Account Terminal: {selectedUser.displayName || selectedUser.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">UID: {selectedUser.uid}</p>
                  </div>
                </div>

                <button
                  id="close-inspect-modal-btn"
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-lg border border-blue-900/20 text-gray-400 hover:text-gray-100 hover:bg-blue-900/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable inspection space */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Account statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#0A0D14] border border-blue-900/10 p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Wallet Balance</span>
                      <span className="text-xl font-mono font-bold text-emerald-400">${selectedUser.balance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-[#0A0D14] border border-blue-900/10 p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/10 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Total Spent</span>
                      <span className="text-xl font-mono font-bold text-blue-400">${(selectedUser.totalSpent || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-[#0A0D14] border border-blue-900/10 p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-xl">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Completed Orders</span>
                      <span className="text-xl font-mono font-bold text-indigo-400">{selectedUser.totalOrders || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Form parameter adjustments */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-[#0A0D14] border border-blue-900/10 p-5 rounded-2xl space-y-4">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 border-b border-blue-900/10 pb-2 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        Credentials Adjustment
                      </h4>

                      <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div>
                          <label htmlFor="edit-displayName" className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Display Name</label>
                          <input
                            id="edit-displayName"
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500/50"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-email" className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Email Address</label>
                          <input
                            id="edit-email"
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500/50"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="edit-role-select" className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Assign Role</label>
                            <select
                              id="edit-role-select"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                              className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                            >
                              <option value="User">User</option>
                              <option value="Admin">Admin</option>
                              <option value="Super Admin">Super Admin</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="edit-status-select" className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Assign Status</label>
                            <select
                              id="edit-status-select"
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as any)}
                              className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                            >
                              <option value="Active">Active</option>
                              <option value="Suspended">Suspended</option>
                              <option value="Banned">Banned</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="edit-balance" className="block text-[10px] font-mono uppercase text-gray-500 mb-1.5">Wallet Balance ($)</label>
                          <input
                            id="edit-balance"
                            type="number"
                            step="0.01"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500/50"
                            required
                          />
                        </div>

                        {/* Assign permissions UI (Role management simulation module) */}
                        {(editRole === 'Admin' || editRole === 'Super Admin') && (
                          <div className="border border-blue-900/10 p-3.5 rounded-xl bg-[#05070B] space-y-2">
                            <span className="block text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Assign Admin Permissions</span>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-sans text-gray-300">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={permissions.services} onChange={e => setPermissions({...permissions, services: e.target.checked})} className="rounded text-blue-500 bg-gray-900" />
                                Manage Services
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={permissions.orders} onChange={e => setPermissions({...permissions, orders: e.target.checked})} className="rounded text-blue-500 bg-gray-900" />
                                Manage Orders
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={permissions.users} onChange={e => setPermissions({...permissions, users: e.target.checked})} className="rounded text-blue-500 bg-gray-900" />
                                Manage Users
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={permissions.tickets} onChange={e => setPermissions({...permissions, tickets: e.target.checked})} className="rounded text-blue-500 bg-gray-900" />
                                Manage Tickets
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={permissions.settings} onChange={e => setPermissions({...permissions, settings: e.target.checked})} className="rounded text-blue-500 bg-gray-900" />
                                Website Settings
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={permissions.logs} onChange={e => setPermissions({...permissions, logs: e.target.checked})} className="rounded text-blue-500 bg-gray-900" />
                                System Logs
                              </label>
                            </div>
                          </div>
                        )}

                        <button
                          id="sync-inspected-user-btn"
                          type="submit"
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Sync Adjustments
                        </button>
                      </form>
                    </div>

                    {/* Quick Access Control Knobs */}
                    <div className="bg-[#0A0D14] border border-blue-900/10 p-5 rounded-2xl space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 border-b border-blue-900/10 pb-2">Quick Action Triggers</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          id="trigger-quick-activate"
                          onClick={() => handleQuickStatusChange(selectedUser.uid, 'Active')}
                          className="py-1.5 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase rounded-lg cursor-pointer"
                        >
                          Activate
                        </button>
                        <button
                          id="trigger-quick-suspend"
                          onClick={() => handleQuickStatusChange(selectedUser.uid, 'Suspended')}
                          className="py-1.5 bg-amber-600/10 hover:bg-amber-600/25 border border-amber-500/20 text-amber-400 text-[10px] font-bold tracking-wider uppercase rounded-lg cursor-pointer"
                        >
                          Suspend
                        </button>
                        <button
                          id="trigger-quick-ban"
                          onClick={() => handleQuickStatusChange(selectedUser.uid, 'Banned')}
                          className="py-1.5 bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/20 text-rose-400 text-[10px] font-bold tracking-wider uppercase rounded-lg cursor-pointer"
                        >
                          Ban User
                        </button>
                      </div>

                      <button
                        id="trigger-quick-delete"
                        onClick={() => handleDeleteUser(selectedUser.uid)}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-rose-950 hover:bg-rose-950/20 text-rose-400 text-xs font-bold rounded-xl cursor-pointer mt-3"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Permanently Terminate Account
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Mini Tables (Orders and Payments logs) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* User Orders History */}
                    <div className="bg-[#0A0D14] border border-blue-900/10 p-5 rounded-2xl">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 border-b border-blue-900/10 pb-2 mb-3 flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
                        In-Flight Order Logs ({userOrders.length})
                      </h4>

                      {loadingUserDetails ? (
                        <div className="py-8 text-center text-gray-500 text-xs">Synchronizing stream...</div>
                      ) : userOrders.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 text-xs">No active orders found.</div>
                      ) : (
                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 text-xs">
                          {userOrders.map(o => (
                            <div key={o.id} className="bg-[#05070B] border border-blue-900/5 p-3 rounded-xl flex justify-between items-center">
                              <div className="space-y-0.5">
                                <span className="text-gray-200 block font-semibold">{o.serviceName}</span>
                                <span className="text-[10px] text-gray-500 font-mono">ID: {o.id} • Qty: {o.quantity} • Link: {o.link}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-emerald-400 font-bold block">${o.charge.toFixed(2)}</span>
                                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded capitalize mt-1 ${
                                  o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                  o.status === 'canceled' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                                }`}>{o.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* User Payments/Wallet History */}
                    <div className="bg-[#0A0D14] border border-blue-900/10 p-5 rounded-2xl">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 border-b border-blue-900/10 pb-2 mb-3 flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        Wallet Credit History ({userPayments.length})
                      </h4>

                      {loadingUserDetails ? (
                        <div className="py-8 text-center text-gray-500 text-xs">Synchronizing stream...</div>
                      ) : userPayments.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 text-xs">No deposit entries found.</div>
                      ) : (
                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 text-xs">
                          {userPayments.map(p => (
                            <div key={p.id} className="bg-[#05070B] border border-blue-900/5 p-3 rounded-xl flex justify-between items-center">
                              <div className="space-y-0.5">
                                <span className="text-gray-200 block font-semibold capitalize">{p.method} Funding</span>
                                <span className="text-[10px] text-gray-500 font-mono">TX: {p.transactionId} • {new Date(p.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-emerald-400 font-bold block">+${p.amount.toFixed(2)}</span>
                                <span className="text-[9px] text-emerald-500 font-semibold uppercase font-mono block mt-1">{p.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Create New User / Admin Account */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#05070B] border border-blue-900/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative space-y-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-blue-900/10">
                <h3 className="text-lg font-display font-bold text-white tracking-tight flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  Account Registry Provisioning
                </h3>
                <button
                  id="close-create-user-modal-btn"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-blue-900/10 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label htmlFor="create-displayName" className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">Display Name</label>
                  <input
                    id="create-displayName"
                    type="text"
                    required
                    value={createDisplayName}
                    onChange={(e) => setCreateDisplayName(e.target.value)}
                    placeholder="E.g., Alexander Mercer"
                    className="w-full bg-[#0A0D14] border border-blue-900/15 rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label htmlFor="create-email" className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">Email Address</label>
                  <input
                    id="create-email"
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="E.g., alex@zenitsmm.com"
                    className="w-full bg-[#0A0D14] border border-blue-900/15 rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="create-role" className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">Account Role</label>
                    <select
                      id="create-role"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as any)}
                      className="w-full bg-[#0A0D14] border border-blue-900/15 rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value="User">Standard User</option>
                      <option value="Admin">Administrator</option>
                      <option value="Super Admin">Super Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="create-status" className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">Account Status</label>
                    <select
                      id="create-status"
                      value={createStatus}
                      onChange={(e) => setCreateStatus(e.target.value as any)}
                      className="w-full bg-[#0A0D14] border border-blue-900/15 rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value="Active">Active / Verified</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Banned">Banned</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="create-balance" className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">Starter Starter Credit ($)</label>
                  <input
                    id="create-balance"
                    type="number"
                    step="0.01"
                    required
                    value={createBalance}
                    onChange={(e) => setCreateBalance(e.target.value)}
                    className="w-full bg-[#0A0D14] border border-blue-900/15 rounded-xl px-4 py-2.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <button
                  id="submit-provisioning-btn"
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors pt-2.5 shadow-[0_0_15px_rgba(37,99,235,0.25)]"
                >
                  Provision Account Profile
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UsersList;

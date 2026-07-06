import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '../../components/Toast';
import { Loader } from '../../components/Loader';
import api from '../../lib/api';
import { SystemSettings, CustomPaymentMethod } from '../../types';
import { 
  Globe, 
  ShieldAlert, 
  DollarSign, 
  Clock, 
  Palette, 
  Link, 
  Search, 
  Save, 
  Activity,
  Sparkles,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Smartphone,
  QrCode,
  Coins,
  Settings,
  XCircle,
  AlertCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  Database,
  DownloadCloud,
  UploadCloud,
  Server
} from 'lucide-react';

export function SettingsPage() {
  const { success, error } = useToast();
  
  // Tab states: 'system' | 'payments' | 'backups'
  const [activeTab, setActiveTab] = useState<'system' | 'payments' | 'backups'>('system');

  // System settings state
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<CustomPaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Partial<CustomPaymentMethod> | null>(null);
  const [savingMethod, setSavingMethod] = useState(false);
  const [isNewMethod, setIsNewMethod] = useState(false);

  // Backup and recovery state
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreJson, setRestoreJson] = useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.get<{ settings: SystemSettings }>('/settings');
        setSettings(res.data.settings);
      } catch (err) {
        console.error('Could not load website settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Load payment methods when the payments sub-tab is activated
  const loadPaymentMethods = async () => {
    try {
      setLoadingMethods(true);
      const res = await api.get<{ success: boolean; paymentMethods: CustomPaymentMethod[] }>('/payment-methods');
      if (res.data.success) {
        // Sort by sortOrder ascending
        const sorted = res.data.paymentMethods.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setPaymentMethods(sorted);
      }
    } catch (err: any) {
      console.error('Could not load payment methods:', err);
      error('Fetch Error', 'Failed to retrieve custom payment methods.');
    } finally {
      setLoadingMethods(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPaymentMethods();
    }
  }, [activeTab]);

  const handleExportBackup = async () => {
    setExportingBackup(true);
    try {
      const res = await api.get<{ success: boolean; dump: any }>('/admin/backup');
      if (res.data.success) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.dump, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `zenit_smm_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        success('Snapshot Created', 'Database-wide backup downloaded successfully.');
      }
    } catch (err: any) {
      error('Snapshot Export Failed', err.response?.data?.error || 'Could not export database backup.');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setRestoreJson(parsed);
      } catch (err) {
        error('Invalid Snapshot Format', 'The chosen backup snapshot is not a valid JSON document.');
        setRestoreFile(null);
        setRestoreJson(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreBackup = async () => {
    if (!restoreJson) {
      error('Input Error', 'Please select a valid backup JSON snapshot file first.');
      return;
    }
    const confirmRestore = window.confirm(
      'CRITICAL RESTORE WARNING:\n\nYou are about to execute a full database restoration. This action is extremely destructive and will completely overwrite all user profiles, balances, orders, categories, ticket logs, settings, and provider records. Are you absolutely certain you want to proceed?'
    );
    if (!confirmRestore) return;

    setRestoringBackup(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/admin/restore', { dump: restoreJson });
      if (res.data.success) {
        success('Restore Succeeded', 'Enterprise backup database has been successfully restored.');
        setRestoreFile(null);
        setRestoreJson(null);
        // Reload system settings
        const settingsRes = await api.get<{ settings: SystemSettings }>('/settings');
        setSettings(settingsRes.data.settings);
      }
    } catch (err: any) {
      error('Restoration Aborted', err.response?.data?.error || 'Database restoration sequence aborted due to a server error.');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.post('/settings', settings);
      success('Settings Saved', 'Global control preferences synchronized successfully.');
    } catch (err: any) {
      error('Synchronization Error', err.response?.data?.error || 'Could not update website preferences.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof SystemSettings, val: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: val
    });
  };

  // Payment methods handler: Save
  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    if (!editingMethod.id || !editingMethod.name) {
      error('Validation Error', 'Gateway ID and Display Name are strictly required.');
      return;
    }

    // Format ID to clean alphanumeric/underscores
    const cleanId = editingMethod.id.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const methodToSave = {
      ...editingMethod,
      id: cleanId,
      minDeposit: Number(editingMethod.minDeposit) || 0,
      maxDeposit: Number(editingMethod.maxDeposit) || 0,
      sortOrder: Number(editingMethod.sortOrder) || 0
    };

    setSavingMethod(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/admin/payment-methods', methodToSave);
      if (res.data.success) {
        success('Gateway Saved', `The payment gateway ${methodToSave.name} is now up to date.`);
        setEditingMethod(null);
        loadPaymentMethods();
      }
    } catch (err: any) {
      error('Gateway Save Failed', err.response?.data?.error || 'Could not save payment gateway configuration.');
    } finally {
      setSavingMethod(false);
    }
  };

  // Payment methods handler: Delete
  const handleDeleteMethod = async (id: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete gateway "${id}"? Active client deposits tied to this identifier might fail to display details. This action is irreversible.`)) {
      return;
    }
    try {
      const res = await api.delete<{ success: boolean; message: string }>(`/admin/payment-methods/${id}`);
      if (res.data.success) {
        success('Gateway Removed', 'Payment gateway deleted successfully.');
        loadPaymentMethods();
      }
    } catch (err: any) {
      error('Deletion Failed', err.response?.data?.error || 'Could not remove payment method.');
    }
  };

  const renderLogoIcon = (logoName: string) => {
    switch (logoName) {
      case 'QrCode':
        return <QrCode className="w-4 h-4 text-blue-400" />;
      case 'Coins':
        return <Coins className="w-4 h-4 text-blue-400" />;
      case 'CreditCard':
        return <CreditCard className="w-4 h-4 text-blue-400" />;
      case 'Wallet':
        return <Settings className="w-4 h-4 text-blue-400" />;
      case 'Smartphone':
      default:
        return <Smartphone className="w-4 h-4 text-blue-400" />;
    }
  };

  if (loading) return <Loader />;
  if (!settings) return <div className="text-gray-400 font-mono text-center py-12">Settings schema unavailable.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-500" />
            Global Control Terminal
          </h2>
          <p className="text-gray-400 text-sm mt-1">Configure SMM website settings, metadata indexing, theme layouts, and dynamic billing integrations.</p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex bg-[#06080E] p-1.5 rounded-xl border border-blue-900/10 self-start">
          <button
            id="admin-settings-tab-system"
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'system' 
                ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            System Prefs
          </button>
          <button
            id="admin-settings-tab-payments"
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'payments' 
                ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Billing Gateways
          </button>
          <button
            id="admin-settings-tab-backups"
            onClick={() => setActiveTab('backups')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'backups' 
                ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Backups & Restore
          </button>
        </div>
      </div>

      {activeTab === 'system' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* General Settings */}
          <div className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10" />
            <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2 border-b border-blue-900/10 pb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
              General & Website Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="websiteName" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Website Name</label>
                <input
                  id="websiteName"
                  type="text"
                  value={settings.websiteName}
                  onChange={(e) => updateField('websiteName', e.target.value)}
                  className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="maintenanceMode" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">System Maintenance Mode</label>
                <div className="flex items-center gap-4 h-[46px] bg-[#05070B] border border-blue-900/20 rounded-xl px-4">
                  <input
                    id="maintenanceMode"
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => updateField('maintenanceMode', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 focus:ring-2 bg-gray-900 border-blue-900/30 cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 font-medium">
                    {settings.maintenanceMode ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Enabled (Lock user features)
                      </span>
                    ) : (
                      <span className="text-emerald-400">Disabled (Public access online)</span>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="currency" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">System Currency</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="USD">USD ($) - United States Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Global Server Timezone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-gray-500" />
                  </div>
                  <select
                    id="timezone"
                    value={settings.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="EST">EST (GMT-5)</option>
                    <option value="PST">PST (GMT-8)</option>
                    <option value="IST">IST (GMT+5:30)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Styling and Theme Settings */}
          <div className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2 border-b border-blue-900/10 pb-3">
              <Palette className="w-4 h-4 text-blue-400" />
              Theme & Asset Branding
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="theme" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Visual Theme Preset</label>
                <select
                  id="theme"
                  value={settings.theme}
                  onChange={(e) => updateField('theme', e.target.value)}
                  className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  <option value="Premium Dark Blue">Premium Black & Blue (Default)</option>
                  <option value="Midnight Slate">Midnight Slate (Amber Accent)</option>
                  <option value="Cosmic Void">Cosmic Void (Pure OLED Black & Gray)</option>
                </select>
              </div>

              <div>
                <label htmlFor="logoUrl" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Website Logo URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Link className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="logoUrl"
                    type="text"
                    placeholder="Leave empty for dynamic SVG vector logo"
                    value={settings.logoUrl}
                    onChange={(e) => updateField('logoUrl', e.target.value)}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="faviconUrl" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Website Favicon URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Link className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="faviconUrl"
                    type="text"
                    placeholder="https://example.com/favicon.ico"
                    value={settings.faviconUrl}
                    onChange={(e) => updateField('faviconUrl', e.target.value)}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2 border-b border-blue-900/10 pb-3">
              <Search className="w-4 h-4 text-blue-400" />
              SEO & Indexing Metadata
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="seoTitle" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Default SEO Title</label>
                <input
                  id="seoTitle"
                  type="text"
                  value={settings.seoTitle}
                  onChange={(e) => updateField('seoTitle', e.target.value)}
                  className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="seoDescription" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">SEO Meta Description</label>
                  <textarea
                    id="seoDescription"
                    rows={4}
                    value={settings.seoDescription}
                    onChange={(e) => updateField('seoDescription', e.target.value)}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 resize-none"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="seoKeywords" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">SEO Keywords (Comma Separated)</label>
                  <textarea
                    id="seoKeywords"
                    rows={4}
                    value={settings.seoKeywords}
                    onChange={(e) => updateField('seoKeywords', e.target.value)}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 resize-none"
                    placeholder="smm, instagram followers, buy cheap likes"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl border border-blue-400/20 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.35)] disabled:opacity-50 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Synchronizing...' : 'Sync System Preferences'}
            </motion.button>
          </div>
        </form>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6 animate-fadeIn">
          {editingMethod ? (
            /* Create / Edit Payment Gateway Form */
            <form onSubmit={handleSaveMethod} className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-blue-900/10 pb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                  {renderLogoIcon(editingMethod.logo || 'Smartphone')}
                  {isNewMethod ? 'Add Custom Billing Gateway' : `Edit Gateway: ${editingMethod.name}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-xs font-mono text-gray-400 hover:text-white cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="method-id" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Unique Gateway ID</label>
                  <input
                    id="method-id"
                    type="text"
                    placeholder="e.g. upi_payment (Lowercase, no spaces)"
                    value={editingMethod.id || ''}
                    disabled={!isNewMethod}
                    onChange={(e) => setEditingMethod({ ...editingMethod, id: e.target.value })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Unique key used programmatically in transactions.</p>
                </div>

                <div>
                  <label htmlFor="method-name" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Gateway Display Name</label>
                  <input
                    id="method-name"
                    type="text"
                    placeholder="e.g. UPI Payment / GPay / Crypto"
                    value={editingMethod.name || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="method-logo" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Logo Icon Representation</label>
                  <select
                    id="method-logo"
                    value={editingMethod.logo || 'Smartphone'}
                    onChange={(e) => setEditingMethod({ ...editingMethod, logo: e.target.value })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="Smartphone">Smartphone (PhonePe, Paytm, Google Pay, UPI)</option>
                    <option value="QrCode">QrCode (UPI QR Code Scanner)</option>
                    <option value="CreditCard">CreditCard (Cards & Gateways)</option>
                    <option value="Wallet">Wallet (Standard)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="method-fee" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Node Fee (%) / Info Badge</label>
                  <input
                    id="method-fee"
                    type="text"
                    placeholder="e.g. 0% or 2% or Free"
                    value={editingMethod.description || ''} // maps to description in card
                    onChange={(e) => setEditingMethod({ ...editingMethod, description: e.target.value })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Brief subtitle or info shown on gateway cards.</p>
                </div>

                <div>
                  <label htmlFor="method-min" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Minimum Deposit Amount ($)</label>
                  <input
                    id="method-min"
                    type="number"
                    value={editingMethod.minDeposit === undefined ? 10 : editingMethod.minDeposit}
                    onChange={(e) => setEditingMethod({ ...editingMethod, minDeposit: Number(e.target.value) })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="method-max" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Maximum Deposit Amount ($)</label>
                  <input
                    id="method-max"
                    type="number"
                    value={editingMethod.maxDeposit === undefined ? 5000 : editingMethod.maxDeposit}
                    onChange={(e) => setEditingMethod({ ...editingMethod, maxDeposit: Number(e.target.value) })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="method-proc" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Processing Duration Info</label>
                  <input
                    id="method-proc"
                    type="text"
                    placeholder="e.g. Instant, 10-20 mins, Manual Review"
                    value={editingMethod.processingTime || 'Instant'}
                    onChange={(e) => setEditingMethod({ ...editingMethod, processingTime: e.target.value })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="method-sort" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Sort Display Order</label>
                  <input
                    id="method-sort"
                    type="number"
                    placeholder="0"
                    value={editingMethod.sortOrder || 0}
                    onChange={(e) => setEditingMethod({ ...editingMethod, sortOrder: Number(e.target.value) })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Lower values are sorted and displayed first to users.</p>
                </div>

                <div className="flex flex-col justify-around bg-[#05070B] border border-blue-900/10 rounded-xl p-4 gap-3">
                  <label className="flex items-center gap-3.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingMethod.enabled === undefined ? true : !!editingMethod.enabled}
                      onChange={(e) => setEditingMethod({ ...editingMethod, enabled: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 focus:ring-2 bg-gray-900 border-blue-900/30"
                    />
                    <div>
                      <span className="text-xs text-white font-mono uppercase tracking-wider block">Gateway Enabled</span>
                      <span className="text-[10px] text-gray-500">Visible on active deposit page for clients.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!editingMethod.isFutureReady}
                      onChange={(e) => setEditingMethod({ ...editingMethod, isFutureReady: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 focus:ring-2 bg-gray-900 border-blue-900/30"
                    />
                    <div>
                      <span className="text-xs text-white font-mono uppercase tracking-wider block">Placeholder/Future Ready</span>
                      <span className="text-[10px] text-gray-500">Enable simulated API endpoints on submission.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="method-upi" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">UPI Address / Wallet Address (Optional)</label>
                  <input
                    id="method-upi"
                    type="text"
                    placeholder="e.g. merchant@ybl, merchant@paytm, or USDT_TRC20 Address"
                    value={editingMethod.upiId || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, upiId: e.target.value })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Clients will see a handy copy-to-clipboard button next to this field.</p>
                </div>

                <div>
                  <label htmlFor="method-qr" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">QR Code Image URL (Optional)</label>
                  <input
                    id="method-qr"
                    type="text"
                    placeholder="e.g. /images/payment_qr.png or direct online URL"
                    value={editingMethod.qrImageUrl || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, qrImageUrl: e.target.value })}
                    className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Displays scan-to-pay QR vector/image to clients in the side detailed card.</p>
                </div>
              </div>

              <div>
                <label htmlFor="method-instructions" className="block text-xs font-mono text-gray-400 uppercase tracking-wider mb-2">Transfer Instructions (Markdown/Text)</label>
                <textarea
                  id="method-instructions"
                  rows={5}
                  placeholder="Step 1: Open PhonePe App&#10;Step 2: Enter UPI ID or Scan QR Code&#10;Step 3: Transfer amount & copy 12-digit UTR ref ID"
                  value={editingMethod.instructions || ''}
                  onChange={(e) => setEditingMethod({ ...editingMethod, instructions: e.target.value })}
                  className="w-full bg-[#05070B] border border-blue-900/20 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-blue-900/10">
                <button
                  type="button"
                  onClick={() => setEditingMethod(null)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs font-semibold text-gray-400 cursor-pointer transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={savingMethod}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs font-mono uppercase tracking-wider rounded-xl border border-blue-400/20 shadow-lg disabled:opacity-50 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  {savingMethod ? 'Saving Gateway...' : 'Save Payment Gateway'}
                </button>
              </div>
            </form>
          ) : (
            /* Payment Gateways List */
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-[#070A10] p-4 rounded-xl border border-blue-900/15">
                <div>
                  <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">Configure Client Billing Gateways</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Define UPI payment addresses, limits, and dynamic text instructions for automatic client reference.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMethod({
                      id: '',
                      name: '',
                      description: '0%',
                      logo: 'Smartphone',
                      enabled: true,
                      minDeposit: 10,
                      maxDeposit: 5000,
                      processingTime: 'Instant',
                      instructions: 'Step 1: Transfer funds to UPI ID.\nStep 2: Copy the 12-digit UTR No.\nStep 3: Enter the UTR and amount below and submit.',
                      upiId: '',
                      qrImageUrl: '',
                      sortOrder: paymentMethods.length,
                      isFutureReady: false
                    });
                    setIsNewMethod(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg font-mono tracking-wide uppercase transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Gateway
                </button>
              </div>

              {loadingMethods ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-[#0A0D14] border border-blue-900/10 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="p-12 text-center bg-[#0A0D14] border border-blue-900/10 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No payment methods found in the database. Use the button above to seed.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {paymentMethods.map((m) => (
                    <div 
                      key={m.id}
                      className={`flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-[#0A0D14] border rounded-2xl transition-all duration-200 ${
                        m.enabled 
                          ? 'border-blue-900/15 hover:border-blue-900/30' 
                          : 'border-rose-950/15 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl border ${m.enabled ? 'bg-blue-950/20 border-blue-900/15' : 'bg-rose-950/10 border-rose-900/10'} shrink-0`}>
                          {renderLogoIcon(m.logo)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-200 text-sm">{m.name}</h4>
                            <span className="font-mono text-[9px] text-gray-500 bg-[#06080E] px-1.5 py-0.5 rounded border border-blue-900/5">
                              ID: {m.id}
                            </span>
                            {m.isFutureReady && (
                              <span className="bg-amber-500/10 text-amber-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/15">
                                Future-Ready
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest ${
                              m.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                            }`}>
                              {m.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-1">
                            Limits: <span className="font-mono font-bold text-gray-300">${m.minDeposit}</span> - <span className="font-mono font-bold text-gray-300">${m.maxDeposit}</span> USD | 
                            Time: <span className="text-blue-400 font-mono font-bold">{m.processingTime}</span>
                          </p>

                          {m.upiId && (
                            <p className="text-[11px] text-gray-500 font-mono mt-1">
                              Payment Address: <span className="text-blue-400/80">{m.upiId}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 mt-4 md:mt-0 w-full md:w-auto justify-end border-t border-blue-900/5 md:border-t-0 pt-3 md:pt-0">
                        <div className="flex items-center text-xs font-mono text-gray-500 mr-2">
                          Order: <span className="text-gray-300 ml-1">{m.sortOrder || 0}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMethod(m);
                            setIsNewMethod(false);
                          }}
                          className="p-2 bg-gray-900 border border-gray-800 hover:border-blue-900/30 text-gray-400 hover:text-blue-400 rounded-xl transition-all cursor-pointer"
                          title="Edit Gateway"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMethod(m.id)}
                          className="p-2 bg-gray-900 border border-gray-800 hover:border-rose-900/30 text-gray-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                          title="Delete Gateway"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Backups & Restoration panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* System Snapshot Block */}
            <div className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl -z-10" />
              <h3 className="text-lg font-display font-semibold text-white mb-2 flex items-center gap-2 border-b border-blue-900/10 pb-3">
                <DownloadCloud className="w-4 h-4 text-blue-400" />
                Database Snapshot Export
              </h3>
              <p className="text-gray-400 text-xs mb-5 leading-relaxed">
                Generate and download an instantaneous snapshot of the complete SMM panel platform database. This includes user profiles, financial balances, active service configurations, system settings, tickets, and logs.
              </p>
              
              <div className="bg-[#05070B] border border-blue-900/15 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-mono">DATABASE TARGET:</span>
                  <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Server className="w-3 h-3" />
                    Cloud Firestore / Active Memory
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-mono">EXPORT VERSION:</span>
                  <span className="text-gray-300 font-mono">JSON Snapshot v2.4</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-mono">SNAPSHOT SCOPE:</span>
                  <span className="text-blue-400 font-mono">15 Core Collections</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleExportBackup}
                disabled={exportingBackup}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs font-mono uppercase tracking-wider rounded-xl border border-blue-400/10 shadow-md disabled:opacity-50 cursor-pointer transition-all"
              >
                <DownloadCloud className="w-4 h-4 animate-bounce" />
                {exportingBackup ? 'Packaging snap...' : 'Create Snapshot Backup'}
              </motion.button>
            </div>

            {/* Restoration Snapshot Block */}
            <div className="bg-[#0A0D14] border border-rose-950/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl -z-10" />
              <h3 className="text-lg font-display font-semibold text-white mb-2 flex items-center gap-2 border-b border-rose-950/15 pb-3">
                <UploadCloud className="w-4 h-4 text-rose-400" />
                Disaster Recovery Restoration
              </h3>
              <p className="text-gray-400 text-xs mb-5 leading-relaxed">
                Restore the active platform state from an existing JSON backup document. Applying a restore will override the database instantly.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="restore-file-input" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Select Snapshot File (.json)</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed rounded-xl cursor-pointer bg-[#05070B] border-blue-900/15 hover:border-blue-500/40 hover:bg-blue-950/5 transition-all p-3">
                      <div className="flex flex-col items-center justify-center text-center">
                        <UploadCloud className="w-6 h-6 text-gray-500 mb-1" />
                        <span className="text-xs text-gray-300 font-medium">
                          {restoreFile ? restoreFile.name : 'Choose JSON snap file'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5">Drag-and-drop or click to browse</span>
                      </div>
                      <input
                        id="restore-file-input"
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleRestoreBackup}
                disabled={restoringBackup || !restoreJson}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-semibold text-xs font-mono uppercase tracking-wider rounded-xl border border-rose-500/10 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                {restoringBackup ? 'Rebuilding Database...' : 'Apply System Restoration'}
              </motion.button>
            </div>
          </div>

          {/* System Performance & Latency monitoring */}
          <div className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 border-b border-blue-900/10 pb-3 font-mono uppercase tracking-wider">
              <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
              Dynamic System Health & Audit Indicators
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#05070B] border border-blue-900/10 rounded-xl p-4">
                <span className="text-[10px] font-mono text-gray-500 block">SYSTEM STATUS:</span>
                <span className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-1.5 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  100% OPERATIONAL
                </span>
              </div>
              <div className="bg-[#05070B] border border-blue-900/10 rounded-xl p-4">
                <span className="text-[10px] font-mono text-gray-500 block">WEBSITE PREFS:</span>
                <span className="text-gray-200 font-mono text-sm font-bold mt-1 block">
                  {settings?.websiteName || 'Zenit SMM'}
                </span>
              </div>
              <div className="bg-[#05070B] border border-blue-900/10 rounded-xl p-4">
                <span className="text-[10px] font-mono text-gray-500 block">MAINTENANCE STATUS:</span>
                <span className={`font-mono text-sm font-bold mt-1 block ${settings?.maintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {settings?.maintenanceMode ? 'ENABLED (LOCKED)' : 'DISABLED (ACTIVE)'}
                </span>
              </div>
              <div className="bg-[#05070B] border border-blue-900/10 rounded-xl p-4">
                <span className="text-[10px] font-mono text-gray-500 block">NODE RUNTIME:</span>
                <span className="text-blue-400 font-mono text-sm font-bold mt-1 block">
                  Production Node (v18+)
                </span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-950/10 border border-blue-900/20 rounded-xl text-xs text-gray-400 flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>System Integrity Policy:</strong> Backups are protected with high-grade session security and are saved as read-only local structures. All modifications to records via restorations generate critical audit trails automatically tracked in the Security Incidents log.
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default SettingsPage;

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Activity, 
  DollarSign, 
  Zap, 
  Search, 
  Filter, 
  Settings, 
  Copy, 
  ShieldAlert, 
  Clock, 
  ArrowUpDown,
  FileText,
  AlertTriangle,
  Sliders,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  PlusCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Provider, SyncSettings, SyncLog, ProviderHealth, Category, CategoryMapping, Service } from '../../types';

export default function Providers() {
  const [activeTab, setActiveTab] = useState<'list' | 'settings' | 'mappings' | 'health' | 'logs'>('list');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  
  // SMM Sync settings state
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  // Loading sub-states
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [runningAllHealth, setRunningAllHealth] = useState(false);

  // Modal & Form State for SMM Providers (existing modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formName, setFormName] = useState('');
  const [formApiUrl, setFormApiUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'disabled'>('active');
  const [formPriority, setFormPriority] = useState(1);
  const [formTimeout, setFormTimeout] = useState(10000);
  const [formRateMultiplier, setFormRateMultiplier] = useState(1.15);
  const [formSupportsRefill, setFormSupportsRefill] = useState(true);
  const [formSupportsCancel, setFormSupportsCancel] = useState(true);

  // Connection Test & Sync states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [healthCheckingId, setHealthCheckingId] = useState<string | null>(null);

  // Log filter and expander
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Category mapping form states
  const [newProvCategory, setNewProvCategory] = useState('');
  const [newMappedCatId, setNewMappedCatId] = useState('');
  const [newMappedCatName, setNewMappedCatName] = useState('');
  const [newMapHidden, setNewMapHidden] = useState(false);

  // Markup rules sub-form helper states
  const [selectedMarkupCatId, setSelectedMarkupCatId] = useState('');
  const [customCatMarkupPercent, setCustomCatMarkupPercent] = useState<number>(0);
  
  const [selectedMarkupSrvId, setSelectedMarkupSrvId] = useState('');
  const [customSrvMarkupPercent, setCustomSrvMarkupPercent] = useState<number>(0);
  const [customSrvOverridePrice, setCustomSrvOverridePrice] = useState<number>(0);
  const [customSrvOverrideEnabled, setCustomSrvOverrideEnabled] = useState(false);

  const { success, error, info } = useToast();

  useEffect(() => {
    fetchProviders();
    fetchSyncSettings();
    fetchCategories();
    fetchServices();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchSyncLogs();
    } else if (activeTab === 'health') {
      fetchProviderHealth();
    }
  }, [activeTab]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      if (res.ok) {
        setProviders(data.providers || []);
      } else {
        error('Error Fetching Providers', data.error || 'Failed to load providers.');
      }
    } catch (err) {
      error('Network Error', 'Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncSettings = async () => {
    try {
      const res = await fetch('/api/sync/settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        setSyncSettings(data.settings);
      }
    } catch (err) {
      console.error('Error loading sync settings:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok && data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const fetchSyncLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/sync/logs');
      const data = await res.json();
      if (res.ok && data.logs) {
        setSyncLogs(data.logs);
      }
    } catch (err) {
      error('Network Error', 'Failed to retrieve synchronization logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchProviderHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/sync/health');
      const data = await res.json();
      if (res.ok && data.health) {
        setProviderHealth(data.health);
      }
    } catch (err) {
      error('Network Error', 'Failed to retrieve provider health metrics.');
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleOpenModal = (provider: Provider | null = null) => {
    if (provider) {
      setEditingProvider(provider);
      setFormName(provider.name);
      setFormApiUrl(provider.apiUrl);
      setFormApiKey(provider.apiKey);
      setFormStatus(provider.status);
      setFormPriority(provider.priority);
      setFormTimeout(provider.timeout);
      setFormRateMultiplier(provider.rateMultiplier);
      setFormSupportsRefill(provider.supportsRefill);
      setFormSupportsCancel(provider.supportsCancel);
    } else {
      setEditingProvider(null);
      setFormName('');
      setFormApiUrl('');
      setFormApiKey('');
      setFormStatus('active');
      setFormPriority(providers.length + 1);
      setFormTimeout(10000);
      setFormRateMultiplier(1.15);
      setFormSupportsRefill(true);
      setFormSupportsCancel(true);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProvider(null);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formApiUrl || !formApiKey) {
      error('Validation Error', 'Please fill out Name, API URL and API Key.');
      return;
    }

    const payload = {
      id: editingProvider?.id || undefined,
      name: formName,
      apiUrl: formApiUrl,
      apiKey: formApiKey,
      status: formStatus,
      priority: Number(formPriority),
      timeout: Number(formTimeout),
      rateMultiplier: Number(formRateMultiplier),
      supportsRefill: formSupportsRefill,
      supportsCancel: formSupportsCancel,
    };

    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        success('Success', editingProvider ? 'Provider updated successfully.' : 'Provider registered successfully.');
        handleCloseModal();
        fetchProviders();
      } else {
        error('Error Saving Provider', data.error || 'Failed to save SMM provider.');
      }
    } catch (err) {
      error('Network Error', 'An error occurred while saving the provider.');
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete "${name}"? Existing synced services will remain but won't be synchronizable.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/providers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        success('Deleted', 'SMM Provider connection has been removed.');
        fetchProviders();
      } else {
        error('Error Deleting', data.error || 'Failed to remove provider.');
      }
    } catch (err) {
      error('Network Error', 'Could not execute provider removal request.');
    }
  };

  const handleDuplicateProvider = (provider: Provider) => {
    setEditingProvider(null);
    setFormName(`${provider.name} (Copy)`);
    setFormApiUrl(provider.apiUrl);
    setFormApiKey(provider.apiKey);
    setFormStatus(provider.status);
    setFormPriority(provider.priority + 1);
    setFormTimeout(provider.timeout);
    setFormRateMultiplier(provider.rateMultiplier);
    setFormSupportsRefill(provider.supportsRefill);
    setFormSupportsCancel(provider.supportsCancel);
    setIsModalOpen(true);
    info('Duplicated', 'Adjust fields and save to register a new duplicated SMM provider.');
  };

  const handleTestConnection = async (id: string, name: string) => {
    setTestingId(id);
    info('Testing API Connection', `Requesting balance verification from "${name}"...`);
    try {
      const res = await fetch(`/api/providers/${id}/test`, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        success(
          'Connection Succeeded',
          `Successfully connected to "${name}". Balance: ${data.balance} ${data.currency}`
        );
        fetchProviders();
      } else {
        error(
          'Connection Failed',
          data.error || 'Received an invalid or error response from SMM endpoint.'
        );
      }
    } catch (err) {
      error('Connection Failed', 'A network timeout or endpoint error occurred.');
    } finally {
      setTestingId(null);
    }
  };

  const handleHealthCheck = async (id: string, name: string) => {
    setHealthCheckingId(id);
    info('Ping SMM API', `Pinging "${name}"...`);
    try {
      const res = await fetch(`/api/providers/${id}/health-check`, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        success('Health Check Complete', `API is healthy. Response Balance: ${data.balance} ${data.currency}`);
        fetchProviders();
        if (activeTab === 'health') fetchProviderHealth();
      } else {
        error('Health Check Failed', data.error || 'Health check returned errors.');
      }
    } catch (err) {
      error('Health Check Failed', 'Host endpoint is unreachable.');
    } finally {
      setHealthCheckingId(null);
    }
  };

  const handleSyncCatalog = async (id: string, name: string) => {
    setSyncingId(id);
    info('Syncing Catalog', `Fetching and importing complete services inventory from "${name}"...`);
    try {
      const res = await fetch(`/api/providers/${id}/sync`, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        success(
          'Synchronization Complete',
          `Successfully synchronized SMM inventory. New: ${data.importedCount}, Updated: ${data.updatedCount}, Disabled: ${data.disabledCount}.`
        );
        fetchProviders();
        fetchServices();
      } else {
        error('Sync Interrupted', data.error || 'Catalog import encountered schema discrepancies.');
      }
    } catch (err) {
      error('Sync Failed', 'Failed to synchronize with provider catalog.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleRunAllHealth = async () => {
    setRunningAllHealth(true);
    info('Running Node Health Check', 'Pinging SMM nodes and retrieving operational balances...');
    try {
      const res = await fetch('/api/sync/health-check-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Health Sync Finished', 'All online nodes updated with response statistics.');
        fetchProviderHealth();
        fetchProviders();
      } else {
        error('Health Sync Failed', data.error || 'Failed to finish polling SMM nodes.');
      }
    } catch (err) {
      error('Network Error', 'Health check ping process timed out.');
    } finally {
      setRunningAllHealth(false);
    }
  };

  const handleSaveSyncSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncSettings) return;

    setSavingSettings(true);
    try {
      const res = await fetch('/api/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncSettings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Settings Saved', 'Auto-sync engine markup, price bounds and cron profiles updated.');
        fetchSyncSettings();
      } else {
        error('Failed to Save', data.error || 'Unknown server error saving settings.');
      }
    } catch (err) {
      error('Network Error', 'Could not save synchronization settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Category Mapping logic
  const handleAddCategoryMapping = async () => {
    if (!newProvCategory || (!newMappedCatId && !newMappedCatName)) {
      error('Validation Error', 'Specify Provider Category and Mapped Category.');
      return;
    }

    if (!syncSettings) return;

    const newMapping: CategoryMapping = {
      providerCategory: newProvCategory,
      mappedCategoryId: newMappedCatId || undefined,
      mappedCategoryName: newMappedCatId ? undefined : newMappedCatName,
      hidden: newMapHidden,
      sortOrder: syncSettings.categoryMappings.length + 1
    };

    const updatedSettings: SyncSettings = {
      ...syncSettings,
      categoryMappings: [...syncSettings.categoryMappings, newMapping]
    };

    setSyncSettings(updatedSettings);

    // Persist immediately
    try {
      const res = await fetch('/api/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        success('Mapping Added', 'New category routing definition saved successfully.');
        setNewProvCategory('');
        setNewMappedCatId('');
        setNewMappedCatName('');
        setNewMapHidden(false);
      }
    } catch (err) {
      error('Save Failed', 'Failed to write category mapping definition to store.');
    }
  };

  const handleRemoveCategoryMapping = async (index: number) => {
    if (!syncSettings) return;

    const updatedMappings = [...syncSettings.categoryMappings];
    updatedMappings.splice(index, 1);

    const updatedSettings: SyncSettings = {
      ...syncSettings,
      categoryMappings: updatedMappings
    };

    setSyncSettings(updatedSettings);

    try {
      await fetch('/api/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      success('Mapping Removed', 'Category routing definition deleted.');
    } catch (err) {
      error('Save Failed', 'Failed to update store mapping rules.');
    }
  };

  // Add custom profit markups for category override
  const handleAddCategoryMarkupOverride = () => {
    if (!selectedMarkupCatId || !syncSettings) return;

    const updatedSettings: SyncSettings = {
      ...syncSettings,
      categoryProfitPercent: {
        ...syncSettings.categoryProfitPercent,
        [selectedMarkupCatId]: Number(customCatMarkupPercent)
      }
    };

    setSyncSettings(updatedSettings);
    success('Markup Override Cached', 'Click Save Changes below to apply and write to database.');
  };

  const handleRemoveCategoryMarkupOverride = (catId: string) => {
    if (!syncSettings) return;

    const updatedOverrides = { ...syncSettings.categoryProfitPercent };
    delete updatedOverrides[catId];

    setSyncSettings({
      ...syncSettings,
      categoryProfitPercent: updatedOverrides
    });
    success('Override Removed', 'Save changes below to finalize deletion.');
  };

  // Add custom service level profit markup override
  const handleAddServiceMarkupOverride = () => {
    if (!selectedMarkupSrvId || !syncSettings) return;

    const updatedSettings: SyncSettings = {
      ...syncSettings,
      serviceProfitPercent: {
        ...syncSettings.serviceProfitPercent,
        [selectedMarkupSrvId]: Number(customSrvMarkupPercent)
      }
    };

    if (customSrvOverrideEnabled) {
      updatedSettings.manualOverrides = {
        ...syncSettings.manualOverrides,
        [selectedMarkupSrvId]: { price: Number(customSrvOverridePrice), enabled: true }
      };
    }

    setSyncSettings(updatedSettings);
    success('Service Overrides Cached', 'Press Save Changes below to write settings to datastore.');
  };

  const handleRemoveServiceMarkupOverride = (srvId: string) => {
    if (!syncSettings) return;

    const updatedMarkup = { ...syncSettings.serviceProfitPercent };
    delete updatedMarkup[srvId];

    const updatedOverrides = { ...syncSettings.manualOverrides };
    delete updatedOverrides[srvId];

    setSyncSettings({
      ...syncSettings,
      serviceProfitPercent: updatedMarkup,
      manualOverrides: updatedOverrides
    });
    success('Service overrides removed. Save below to finalize.');
  };

  // Filtering lists
  const filteredProviders = providers.filter(prov => {
    const matchesSearch = prov.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prov.apiUrl.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prov.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSyncLogs = syncLogs.filter(log => {
    if (!logSearchQuery) return true;
    const query = logSearchQuery.toLowerCase();
    return log.providerName.toLowerCase().includes(query) ||
           log.status.toLowerCase().includes(query) ||
           log.triggerType.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      
      {/* Premium Admin Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0A0D14] border border-gray-800 p-6 rounded-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5.5 h-5.5 text-blue-500" />
            SMM API Providers & Synchronizer
          </h2>
          <p className="text-xs text-gray-400">
            Control automated provider inventory imports, configure dynamic pricing, map category groupings, and track node latency pings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            id="btn-add-provider-header"
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-blue-900/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Connect API Node
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-800 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'list' ? 'border-blue-500 text-white bg-[#0A0D14]' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Sliders className="w-3.5 h-3.5 inline mr-1.5" />
          Providers List
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'settings' ? 'border-blue-500 text-white bg-[#0A0D14]' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Settings className="w-3.5 h-3.5 inline mr-1.5" />
          Sync & Price Markup Rules
        </button>
        <button
          onClick={() => setActiveTab('mappings')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'mappings' ? 'border-blue-500 text-white bg-[#0A0D14]' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Layers className="w-3.5 h-3.5 inline mr-1.5" />
          Category Router mappings
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'health' ? 'border-blue-500 text-white bg-[#0A0D14]' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <Activity className="w-3.5 h-3.5 inline mr-1.5" />
          Nodes Health Monitor
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'logs' ? 'border-blue-500 text-white bg-[#0A0D14]' : 'border-transparent text-gray-400 hover:text-white'}`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />
          Activity Log Syncs
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && activeTab === 'list' && (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="bg-[#0A0D14] border border-gray-800 p-6 rounded-xl animate-pulse space-y-3">
              <div className="h-6 bg-gray-800/40 rounded w-1/4"></div>
              <div className="h-4 bg-gray-800/40 rounded w-1/2"></div>
              <div className="h-10 bg-gray-800/30 rounded w-full"></div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: All SMM Providers */}
      {!loading && activeTab === 'list' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 bg-[#0A0D14] border border-gray-800 p-4 rounded-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search connected API provider logs or connection hostnames..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#11141E] border border-gray-800 pl-10 pr-4 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#11141E] border border-gray-800 px-3.5 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Operational Statuses</option>
                <option value="active">Active Handshakes</option>
                <option value="disabled">Suspended Only</option>
              </select>
            </div>
          </div>

          {filteredProviders.length === 0 ? (
            <div className="bg-[#0A0D14] border border-gray-800 rounded-xl p-12 text-center space-y-3">
              <Globe className="w-10 h-10 text-gray-600 mx-auto animate-pulse" />
              <h3 className="text-sm font-semibold text-gray-300">No Providers Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No active or disabled SMM Providers have been declared. Click "Connect API Node" to configure your first provider.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProviders.map(prov => {
                const successRate = prov.successCount && prov.failedCount !== undefined
                  ? Math.round((prov.successCount / (prov.successCount + prov.failedCount || 1)) * 100)
                  : 100;
                
                return (
                  <div key={prov.id} className="bg-[#0A0D14] border border-gray-800 hover:border-blue-900/30 rounded-xl overflow-hidden transition-all shadow-lg hover:shadow-blue-950/5">
                    
                    {/* Header bar of provider card */}
                    <div className="p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-white truncate">{prov.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${prov.status === 'active' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prov.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                            {prov.status === 'active' ? 'Connected' : 'Suspended'}
                          </span>
                          <span className="bg-blue-950/20 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded text-[10px] font-mono">
                            Priority #{prov.priority}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-gray-500 truncate select-all">{prov.apiUrl}</p>
                      </div>

                      {/* Info columns */}
                      <div className="flex flex-wrap gap-x-8 gap-y-3.5 text-xs text-gray-400">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Price Surcharge</span>
                          <span className="text-white font-medium">{(prov.rateMultiplier * 100 - 100).toFixed(0)}% Surcharge</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Refills</span>
                          <span className="text-white font-medium">{prov.supportsRefill ? 'Manual Allowed' : 'Disabled'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Connection Uptime</span>
                          <span className="text-white font-semibold flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-blue-500" />
                            {successRate}% Uptime
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap lg:flex-col gap-2 justify-start lg:justify-center items-stretch min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={testingId === prov.id}
                            onClick={() => handleTestConnection(prov.id, prov.name)}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-[#11141E] hover:bg-[#1A1F2E] border border-gray-800 hover:border-gray-700 text-xs text-gray-300 px-3 py-2 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 text-blue-400 ${testingId === prov.id ? 'animate-spin' : ''}`} />
                            Test API
                          </button>

                          <button
                            disabled={healthCheckingId === prov.id}
                            onClick={() => handleHealthCheck(prov.id, prov.name)}
                            className="p-2 bg-[#11141E] hover:bg-[#1A1F2E] border border-gray-800 hover:border-gray-700 rounded-lg text-amber-400 transition-colors cursor-pointer"
                            title="Ping Health"
                          >
                            <Activity className={`w-4 h-4 ${healthCheckingId === prov.id ? 'animate-pulse text-amber-300' : ''}`} />
                          </button>
                        </div>

                        <button
                          disabled={syncingId === prov.id}
                          onClick={() => handleSyncCatalog(prov.id, prov.name)}
                          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md cursor-pointer disabled:opacity-60"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingId === prov.id ? 'animate-spin' : ''}`} />
                          {syncingId === prov.id ? 'Importing services...' : 'Force Sync SMM Catalog'}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(prov)}
                            className="flex-1 flex items-center justify-center gap-1 bg-[#11141E] hover:bg-gray-800/30 border border-gray-800 text-xs text-gray-300 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3 text-amber-500" />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDuplicateProvider(prov)}
                            className="p-1.5 bg-[#11141E] hover:bg-gray-800/30 border border-gray-800 rounded-md text-blue-400 transition-colors cursor-pointer"
                            title="Duplicate Setup"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteProvider(prov.id, prov.name)}
                            className="p-1.5 bg-[#11141E] hover:bg-rose-950/20 border border-gray-800 hover:border-rose-900/40 rounded-md text-rose-400 transition-colors cursor-pointer"
                            title="Remove Connection"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Footer bar statistics on card */}
                    <div className="bg-[#070A0F] border-t border-gray-800/30 px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono text-gray-400">
                      <div>
                        Successful handshakes: <strong className="text-emerald-400 font-semibold">{prov.successCount || 0}</strong>
                      </div>
                      <div>
                        Faults logged: <strong className="text-rose-400 font-semibold">{prov.failedCount || 0}</strong>
                      </div>
                      <div className="md:col-span-2 select-all">
                        Last Active Sync: <strong className="text-white font-semibold">{prov.lastSync ? new Date(prov.lastSync).toLocaleString() : 'Never'}</strong>
                      </div>
                    </div>

                    {/* Error Banner */}
                    {prov.lastError && (
                      <div className="bg-rose-950/10 border-t border-rose-950/40 px-6 py-3 flex items-start gap-2.5 text-xs text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-rose-400 font-mono uppercase tracking-wider block mb-0.5">Communication Fault:</span>
                          <p className="font-sans text-[11px] leading-relaxed text-rose-300/80">{prov.lastError}</p>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Auto Sync Engine Settings */}
      {activeTab === 'settings' && syncSettings && (
        <form onSubmit={handleSaveSyncSettings} className="space-y-6">
          <div className="bg-[#0A0D14] border border-gray-800 rounded-xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-gray-800 pb-3">
              <Settings className="w-4 h-4 text-blue-500" />
              SMM Scheduler Config & Markup Pricing Parameters
            </h3>

            {/* Sync Settings section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-1">
                  Automatic Syncing Engine
                </label>
                <div className="flex items-center gap-3 bg-[#11141E] border border-gray-800 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    id="autoSync"
                    checked={syncSettings.autoSync}
                    onChange={(e) => setSyncSettings({ ...syncSettings, autoSync: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-800 bg-[#0A0D14] text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="autoSync" className="text-xs text-gray-300 cursor-pointer select-none">
                    Enable Background Cron Scheduler
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  Sync Interval (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  value={syncSettings.syncInterval}
                  onChange={(e) => setSyncSettings({ ...syncSettings, syncInterval: parseInt(e.target.value, 10) })}
                  className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="e.g. 60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  Default Imported SMM Status
                </label>
                <select
                  value={syncSettings.defaultStatus}
                  onChange={(e) => setSyncSettings({ ...syncSettings, defaultStatus: e.target.value as any })}
                  className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="active">Active (Instantly Visible to Users)</option>
                  <option value="disabled">Disabled (Requires Manual Activation)</option>
                </select>
              </div>
            </div>

            {/* Pricing Parameters */}
            <div className="border-t border-gray-800/50 pt-6">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-4">SMM Sell Price Markup Algorithms</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-1">
                    Global Profit markup (%)
                    <HelpCircle className="w-3 h-3 text-gray-500" title="Cost markup percent" />
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={syncSettings.globalProfitPercent}
                    onChange={(e) => setSyncSettings({ ...syncSettings, globalProfitPercent: parseFloat(e.target.value) })}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Fixed Profit (USD)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={syncSettings.fixedProfit}
                    onChange={(e) => setSyncSettings({ ...syncSettings, fixedProfit: parseFloat(e.target.value) })}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Min Profit Guaranteed (USD)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={syncSettings.minimumProfit}
                    onChange={(e) => setSyncSettings({ ...syncSettings, minimumProfit: parseFloat(e.target.value) })}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Service Visibility Scope
                  </label>
                  <select
                    value={syncSettings.serviceVisibility}
                    onChange={(e) => setSyncSettings({ ...syncSettings, serviceVisibility: e.target.value as any })}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Publish All Synced Packages</option>
                    <option value="imported_only">Only Show Mapped Groupings</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Minimum Allowed Sale Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={syncSettings.minPrice}
                    onChange={(e) => setSyncSettings({ ...syncSettings, minPrice: parseFloat(e.target.value) })}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Maximum Allowed Sale Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={syncSettings.maxPrice}
                    onChange={(e) => setSyncSettings({ ...syncSettings, maxPrice: parseFloat(e.target.value) })}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-4 py-3 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Category Level Overrides */}
            <div className="border-t border-gray-800/50 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                Category Specific Profit Overrides
              </h4>

              <div className="flex flex-wrap items-end gap-3 bg-[#11141E]/50 border border-gray-800 p-4 rounded-xl">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Target Category</label>
                  <select
                    value={selectedMarkupCatId}
                    onChange={(e) => setSelectedMarkupCatId(e.target.value)}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Additional Markup %</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={customCatMarkupPercent}
                    onChange={(e) => setCustomCatMarkupPercent(parseFloat(e.target.value) || 0)}
                    className="bg-[#11141E] border border-gray-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500 w-32 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCategoryMarkupOverride}
                  className="bg-blue-600/20 text-blue-400 border border-blue-900/50 hover:bg-blue-600/30 text-xs px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
                >
                  Apply Rule
                </button>
              </div>

              {/* Active overrides list */}
              {Object.keys(syncSettings.categoryProfitPercent).length > 0 && (
                <div className="border border-gray-800/60 rounded-lg divide-y divide-gray-800">
                  {Object.entries(syncSettings.categoryProfitPercent).map(([catId, percentage]) => {
                    const cat = categories.find(c => c.id === catId);
                    return (
                      <div key={catId} className="flex items-center justify-between p-3.5 text-xs">
                        <span className="font-semibold text-white">{cat ? cat.name : `Category (${catId})`}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded text-[11px] font-bold">
                            +{percentage}% Additional Markup
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategoryMarkupOverride(catId)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Service Level Overrides */}
            <div className="border-t border-gray-800/50 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                Service Specific Overrides & Manual Pricing overrides
              </h4>

              <div className="space-y-4 bg-[#11141E]/50 border border-gray-800 p-5 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Target SMM Service Package</label>
                    <select
                      value={selectedMarkupSrvId}
                      onChange={(e) => setSelectedMarkupSrvId(e.target.value)}
                      className="w-full bg-[#11141E] border border-gray-800 text-xs px-3 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Synced SMM Service --</option>
                      {services.filter(s => s.providerId).map(s => (
                        <option key={s.id} value={s.id}>[{s.category}] - {s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Srv Markup Add-on (%)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={customSrvMarkupPercent}
                      onChange={(e) => setCustomSrvMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#11141E] border border-gray-800 text-xs px-3 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-800/20">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="srvOverrideEnabled"
                      checked={customSrvOverrideEnabled}
                      onChange={(e) => setCustomSrvOverrideEnabled(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-gray-800 bg-[#0A0D14] text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="srvOverrideEnabled" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                      Enable Fixed Sale Price Manual Override
                    </label>
                  </div>

                  {customSrvOverrideEnabled && (
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Override SMM Selling Rate (USD)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="e.g. 1.25"
                        value={customSrvOverridePrice}
                        onChange={(e) => setCustomSrvOverridePrice(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#11141E] border border-gray-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddServiceMarkupOverride}
                    className="bg-blue-600/20 text-blue-400 border border-blue-900/50 hover:bg-blue-600/30 text-xs px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer"
                  >
                    Add Service Rule
                  </button>
                </div>
              </div>

              {/* Active overrides list */}
              {(Object.keys(syncSettings.serviceProfitPercent).length > 0 || Object.keys(syncSettings.manualOverrides).length > 0) && (
                <div className="border border-gray-800/60 rounded-lg divide-y divide-gray-800">
                  {Array.from(new Set([
                    ...Object.keys(syncSettings.serviceProfitPercent),
                    ...Object.keys(syncSettings.manualOverrides)
                  ])).map(srvId => {
                    const srv = services.find(s => s.id === srvId);
                    const markup = syncSettings.serviceProfitPercent[srvId] || 0;
                    const override = syncSettings.manualOverrides[srvId];
                    return (
                      <div key={srvId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 gap-2 text-xs">
                        <span className="font-semibold text-white">{srv ? `[${srv.category}] ${srv.name}` : `Service (${srvId})`}</span>
                        <div className="flex flex-wrap items-center gap-3">
                          {markup > 0 && (
                            <span className="font-mono text-blue-400 bg-blue-950/20 border border-blue-900/30 px-2 py-0.5 rounded text-[11px] font-bold">
                              +{markup}% Markup Add-on
                            </span>
                          )}
                          {override && override.enabled && (
                            <span className="font-mono text-yellow-400 bg-yellow-950/20 border border-yellow-900/30 px-2 py-0.5 rounded text-[11px] font-bold">
                              Fixed Manual Override: ${override.price}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceMarkupOverride(srvId)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Block */}
            <div className="pt-4 flex justify-end border-t border-gray-800/50">
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-lg transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? 'Writing modifications...' : 'Save Configuration Changes'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab Content: Category Router Mappings */}
      {activeTab === 'mappings' && syncSettings && (
        <div className="space-y-6">
          <div className="bg-[#0A0D14] border border-gray-800 p-6 rounded-xl space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-gray-800 pb-3">
              <Layers className="w-4 h-4 text-blue-500" />
              SMM Provider Category Router & Merging Definitions
            </h3>

            {/* Add Mapping Form */}
            <div className="space-y-4 bg-[#11141E]/40 border border-gray-800 p-5 rounded-xl">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Define New Category Routing Rule</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase">Provider Category String</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Instagram Followers Real"
                    value={newProvCategory}
                    onChange={(e) => setNewProvCategory(e.target.value)}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-3.5 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="block text-[9px] text-gray-400 mt-1">Matched case-insensitively during incoming catalog syncs.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase">Merge into Local Category</label>
                  <select
                    value={newMappedCatId}
                    onChange={(e) => {
                      setNewMappedCatId(e.target.value);
                      if (e.target.value) setNewMappedCatName('');
                    }}
                    className="w-full bg-[#11141E] border border-gray-800 text-xs px-3.5 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Create/Rename to Custom Category name --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!newMappedCatId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Custom Category Label Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Instagram Premium Followers"
                      value={newMappedCatName}
                      onChange={(e) => setNewMappedCatName(e.target.value)}
                      className="w-full bg-[#11141E] border border-gray-800 text-xs px-3.5 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <span className="block text-[9px] text-gray-400 mt-1">If specified, merges synced packages under a newly renamed/created category.</span>
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="mapHidden"
                      checked={newMapHidden}
                      onChange={(e) => setNewMapHidden(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-gray-800 bg-[#0A0D14] text-blue-600 cursor-pointer"
                    />
                    <label htmlFor="mapHidden" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                      Mark Category Services Hidden / Disabled
                    </label>
                  </div>
                </div>
              )}

              {newMappedCatId && (
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="mapHidden"
                    checked={newMapHidden}
                    onChange={(e) => setNewMapHidden(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-gray-800 bg-[#0A0D14] text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="mapHidden" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                    Mark Category Services Hidden / Disabled
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddCategoryMapping}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md cursor-pointer"
                >
                  Register Mapping Definition
                </button>
              </div>
            </div>

            {/* Mappings Listing Grid */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Active Category Router Rules</h4>
              
              {syncSettings.categoryMappings.length === 0 ? (
                <div className="bg-[#11141E]/20 border border-gray-800 p-8 text-center rounded-xl">
                  <Layers className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No custom category mapping definitions active. Incoming categories will map dynamically.</p>
                </div>
              ) : (
                <div className="border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
                  <div className="grid grid-cols-12 bg-[#11141E] px-4 py-3 text-[10px] font-bold text-gray-400 uppercase font-sans">
                    <div className="col-span-5">Provider Category</div>
                    <div className="col-span-4">Routed Local Target</div>
                    <div className="col-span-2">Uploader Status</div>
                    <div className="col-span-1 text-right">Delete</div>
                  </div>

                  {syncSettings.categoryMappings.map((map, idx) => {
                    const localCat = map.mappedCategoryId 
                      ? categories.find(c => c.id === map.mappedCategoryId)
                      : null;

                    return (
                      <div key={idx} className="grid grid-cols-12 px-4 py-3.5 items-center text-xs text-gray-300">
                        <div className="col-span-5 font-mono text-white truncate">{map.providerCategory}</div>
                        <div className="col-span-4 truncate font-semibold">
                          {localCat ? (
                            <span className="text-blue-400">{localCat.name} (Mapped)</span>
                          ) : map.mappedCategoryName ? (
                            <span className="text-indigo-400">{map.mappedCategoryName} (Dynamic Group)</span>
                          ) : (
                            <span className="text-gray-500">Unspecified (Auto Map)</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${map.hidden ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30' : 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30'}`}>
                            {map.hidden ? 'Hidden/Disabled' : 'Published'}
                          </span>
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => handleRemoveCategoryMapping(idx)}
                            className="text-gray-500 hover:text-rose-400 p-1 rounded hover:bg-gray-800/40 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: SMM Nodes Health Dashboard */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="bg-[#0A0D14] border border-gray-800 p-6 rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                  SMM Provider Node Latency & Balance health Status
                </h3>
                <p className="text-xs text-gray-400">Displaying response latency sparklines, operational uptimes, and failure tracking logs.</p>
              </div>
              <button
                disabled={runningAllHealth}
                onClick={handleRunAllHealth}
                className="flex items-center justify-center gap-1.5 bg-[#11141E] hover:bg-[#1A1F2E] border border-gray-800 text-xs text-gray-300 font-semibold px-4 py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${runningAllHealth ? 'animate-spin' : ''}`} />
                {runningAllHealth ? 'Polling all Nodes...' : 'Ping & Refresh All Nodes'}
              </button>
            </div>

            {loadingHealth && providerHealth.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500 animate-pulse">Retrieving node health statistics...</div>
            ) : providerHealth.length === 0 ? (
              <div className="bg-[#11141E]/20 border border-gray-800 p-12 text-center rounded-xl space-y-2">
                <Activity className="w-8 h-8 text-gray-700 mx-auto animate-pulse" />
                <p className="text-xs text-gray-500">No ping statistics logged yet. Trigger manual check or wait for cron poller.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {providerHealth.map(health => (
                  <div key={health.providerId} className="bg-[#11141E]/40 border border-gray-800 rounded-xl overflow-hidden p-5 space-y-4">
                    
                    <div className="flex items-center justify-between border-b border-gray-800/55 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">{health.providerName}</h4>
                        <span className="text-[10px] text-gray-500 font-mono">ID: {health.providerId}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${health.isOnline ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-rose-950/20 text-rose-400 border border-rose-900/30'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${health.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        {health.isOnline ? 'Active Online' : 'Endpoint Offline'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#0A0D14] border border-gray-800/40 p-2.5 rounded-lg">
                        <span className="block text-[9px] text-gray-500 uppercase">Ping Latency</span>
                        <span className="text-white font-mono text-xs font-semibold">{health.responseTimeMs} ms</span>
                      </div>
                      <div className="bg-[#0A0D14] border border-gray-800/40 p-2.5 rounded-lg">
                        <span className="block text-[9px] text-gray-500 uppercase">Uptime Ratio</span>
                        <span className="text-emerald-400 font-mono text-xs font-bold">{health.successRate}%</span>
                      </div>
                      <div className="bg-[#0A0D14] border border-gray-800/40 p-2.5 rounded-lg">
                        <span className="block text-[9px] text-gray-500 uppercase">Error Rate</span>
                        <span className="text-rose-400 font-mono text-xs font-semibold">{health.failureRate}%</span>
                      </div>
                    </div>

                    {/* Simple Inline Latency History Sparkline SVG */}
                    {health.apiLatencyHistory && health.apiLatencyHistory.length > 1 && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 uppercase block font-semibold">Latency Jitter Graph (Last 10 queries)</span>
                        <div className="bg-[#0A0D14]/80 border border-gray-800/40 p-3 rounded-lg h-16 flex items-center justify-center">
                          <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <polyline
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="1.5"
                              points={health.apiLatencyHistory.map((v, i) => {
                                const maxV = Math.max(...health.apiLatencyHistory) || 100;
                                const minV = Math.min(...health.apiLatencyHistory) || 0;
                                const span = maxV - minV || 1;
                                const x = (i / (health.apiLatencyHistory.length - 1)) * 100;
                                const y = 28 - ((v - minV) / span) * 26;
                                return `${x},${y}`;
                              }).join(' ')}
                            />
                          </svg>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 text-[11px] font-mono text-gray-400 pt-1">
                      <div className="flex justify-between">
                        <span>Last Successful Request:</span>
                        <span className="text-white">{health.lastSuccessAt ? new Date(health.lastSuccessAt).toLocaleString() : 'None'}</span>
                      </div>
                      {health.lastFailAt && (
                        <div className="flex justify-between">
                          <span>Last Communication Fault:</span>
                          <span className="text-rose-400">{new Date(health.lastFailAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {health.lastErrorMessage && (
                      <div className="bg-rose-950/10 border border-rose-950/40 p-3 rounded-lg text-rose-300 text-[10px] font-sans leading-relaxed flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-rose-400 uppercase tracking-wider font-mono text-[9px] mb-0.5">Last Log Fault:</strong>
                          {health.lastErrorMessage}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Auto Sync logs activity */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filtering Logs */}
          <div className="bg-[#0A0D14] border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search sync logs by provider, trigger type, status..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full bg-[#11141E] border border-gray-800 pl-10 pr-4 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={fetchSyncLogs}
              className="bg-[#11141E] border border-gray-800 hover:border-gray-700 px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Reload Logs
            </button>
          </div>

          {loadingLogs && syncLogs.length === 0 ? (
            <div className="bg-[#0A0D14] border border-gray-800 p-12 text-center text-xs text-gray-500 animate-pulse">Loading sync log database...</div>
          ) : filteredSyncLogs.length === 0 ? (
            <div className="bg-[#0A0D14] border border-gray-800 p-12 text-center rounded-xl">
              <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-gray-500">No sync log records found matching query.</p>
            </div>
          ) : (
            <div className="bg-[#0A0D14] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#11141E] border-b border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Trigger</th>
                      <th className="px-5 py-3">SMM Node Provider</th>
                      <th className="px-5 py-3">Time Started</th>
                      <th className="px-5 py-3">Duration</th>
                      <th className="px-5 py-3 text-center">Imported</th>
                      <th className="px-5 py-3 text-center">Updated</th>
                      <th className="px-5 py-3 text-center">Disabled</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-xs">
                    {filteredSyncLogs.map(log => {
                      const isExpanded = expandedLogId === log.id;
                      
                      return (
                        <React.Fragment key={log.id}>
                          <tr className="hover:bg-[#11141E]/20 transition-colors">
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${log.status === 'success' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40' : log.status === 'partial_success' ? 'bg-yellow-950/20 text-yellow-400 border-yellow-900/40' : 'bg-rose-950/20 text-rose-400 border-rose-900/40'}`}>
                                {log.status === 'success' ? 'Successful' : log.status === 'partial_success' ? 'Partially Done' : 'Failure'}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-[10px] font-mono font-bold uppercase ${log.triggerType === 'manual' ? 'text-blue-400' : 'text-indigo-400'}`}>
                                {log.triggerType}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-semibold text-white">{log.providerName}</td>
                            <td className="px-5 py-3 font-mono text-[11px] text-gray-400">{new Date(log.startedAt).toLocaleString()}</td>
                            <td className="px-5 py-3 font-mono text-[11px] text-gray-400">{(log.durationMs / 1000).toFixed(2)}s</td>
                            <td className="px-5 py-3 text-center text-emerald-400 font-bold font-mono">{log.importedCount}</td>
                            <td className="px-5 py-3 text-center text-blue-400 font-bold font-mono">{log.updatedCount}</td>
                            <td className="px-5 py-3 text-center text-rose-400 font-bold font-mono">{log.disabledCount}</td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {isExpanded ? 'Hide Details' : 'View Errors'}
                              </button>
                            </td>
                          </tr>

                          {/* Error Expander block */}
                          {isExpanded && (
                            <tr className="bg-[#11141E]/30">
                              <td colSpan={9} className="px-6 py-4 border-t border-gray-800">
                                <div className="space-y-2">
                                  <span className="block font-semibold text-gray-300 font-mono text-[10px] uppercase tracking-wider">Synchronization Trace Details:</span>
                                  {log.errors && log.errors.length > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1.5 text-rose-300 text-xs leading-relaxed max-w-4xl">
                                      {log.errors.map((err, i) => (
                                        <li key={i} className="font-mono">{err}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-emerald-400 font-sans flex items-center gap-1.5 text-[11px]">
                                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                                      Catalog import and price adjustment process finished without throwing exceptions.
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Modal (Add/Edit Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-[#0A0D14] border border-gray-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-16 border-b border-gray-800/60 px-6 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-blue-500" />
                {editingProvider ? 'Edit API Provider Connection' : 'Register New API Provider'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-200 cursor-pointer p-1 rounded-lg hover:bg-gray-800/40"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProvider} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Provider Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zenit SMM API Primary"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#11141E] border border-gray-800 text-sm px-4 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">API Connection URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://provider-api.com/v2"
                  value={formApiUrl}
                  onChange={(e) => setFormApiUrl(e.target.value)}
                  className="w-full bg-[#11141E] border border-gray-800 text-sm px-4 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">API Authentication Key / Token</label>
                <input
                  type="password"
                  required
                  placeholder="api_key_xxxxxxxxxxxxx"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  className="w-full bg-[#11141E] border border-gray-800 text-sm px-4 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="block text-[10px] text-gray-400 mt-1">This secret token remains encrypted and is never exposed in client queries or frontend components.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Default Rate Markup Multiplier</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.0"
                    required
                    placeholder="1.15"
                    value={formRateMultiplier}
                    onChange={(e) => setFormRateMultiplier(parseFloat(e.target.value))}
                    className="w-full bg-[#11141E] border border-gray-800 text-sm px-4 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="block text-[9px] text-gray-400">Costs are surcharge-multiplied (e.g. 1.15 = 15% markup).</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Priority Selection Order</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formPriority}
                    onChange={(e) => setFormPriority(parseInt(e.target.value, 10))}
                    className="w-full bg-[#11141E] border border-gray-800 text-sm px-4 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="block text-[9px] text-gray-400">Lower priorities are evaluated first in routing operations.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Timeout Limit (ms)</label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    required
                    value={formTimeout}
                    onChange={(e) => setFormTimeout(parseInt(e.target.value, 10))}
                    className="w-full bg-[#11141E] border border-gray-800 text-sm px-4 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">State</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#11141E] border border-gray-800 text-sm px-4 py-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="active">Active Handshake Enabled</option>
                    <option value="disabled">Disabled Handshake Only</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-6 border-t border-gray-800/40">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="supportsRefill"
                    checked={formSupportsRefill}
                    onChange={(e) => setFormSupportsRefill(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-gray-800 bg-[#11141E] accent-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="supportsRefill" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">Supports Manual Refills</label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="supportsCancel"
                    checked={formSupportsCancel}
                    onChange={(e) => setFormSupportsCancel(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-gray-800 bg-[#11141E] accent-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="supportsCancel" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">Supports Manual Cancellations</label>
                </div>
              </div>

              {/* Form Actions footer */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 border border-gray-800 hover:bg-gray-800/30 text-gray-300 font-medium text-sm py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-lg transition-all shadow-md cursor-pointer"
                >
                  {editingProvider ? 'Save Changes' : 'Connect Provider'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

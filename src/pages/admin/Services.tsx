import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader } from '../../components/Loader';
import { useToast } from '../../components/Toast';
import api from '../../lib/api';
import { Service, Category } from '../../types';
import { 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Sliders, 
  Search, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  XCircle, 
  FolderPlus, 
  Clock, 
  CheckSquare, 
  Square,
  HelpCircle,
  Eye,
  Settings2,
  ListOrdered,
  DollarSign,
  Briefcase
} from 'lucide-react';

export function Services() {
  const { success, error } = useToast();
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'categories'>('services');
  
  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Search
  const [serviceSearch, setServiceSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categorySearch, setCategorySearch] = useState('');

  // Bulk operation states
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Service form states
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [srvId, setSrvId] = useState('');
  const [srvName, setSrvName] = useState('');
  const [srvCategoryId, setSrvCategoryId] = useState('');
  const [srvPrice, setSrvPrice] = useState('');
  const [srvMin, setSrvMin] = useState('');
  const [srvMax, setSrvMax] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvStatus, setSrvStatus] = useState<'active' | 'disabled'>('active');
  const [srvAverageTime, setSrvAverageTime] = useState('Instant');
  const [srvDripfeed, setSrvDripfeed] = useState(false);
  const [srvRefill, setSrvRefill] = useState(false);
  const [srvCancel, setSrvCancel] = useState(false);
  const [srvSortOrder, setSrvSortOrder] = useState('1');
  const [srvProviderId, setSrvProviderId] = useState('');
  const [srvProviderServiceId, setSrvProviderServiceId] = useState('');

  // Category form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Instagram');
  const [catDesc, setCatDesc] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('1');
  const [catStatus, setCatStatus] = useState<'active' | 'disabled'>('active');

  const loadData = async () => {
    try {
      const [catsRes, srvsRes] = await Promise.all([
        api.get<{ categories: Category[] }>('/categories'),
        api.get<{ services: Service[] }>('/services')
      ]);
      setCategories(catsRes.data.categories || []);
      setServices(srvsRes.data.services || []);
      
      // Auto-select category id for new services
      if (catsRes.data.categories && catsRes.data.categories.length > 0) {
        setSrvCategoryId(catsRes.data.categories[0].id);
      }
    } catch (err) {
      console.error('Failed to load catalog data', err);
      error('Data Load Error', 'Could not load social media services and categories.');
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadData();
      setLoading(false);
    }
    init();
  }, []);

  // Bulk toggle helper
  const handleSelectAllServices = () => {
    const visibleServices = getFilteredServices();
    if (selectedServiceIds.length === visibleServices.length) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(visibleServices.map(s => s.id));
    }
  };

  const handleSelectService = (id: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Get filtered items
  const getFilteredServices = () => {
    return services.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
                            s.id.toLowerCase().includes(serviceSearch.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || s.categoryId === categoryFilter || s.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const getFilteredCategories = () => {
    return categories.filter(c => {
      return c.name.toLowerCase().includes(categorySearch.toLowerCase());
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  };

  // Service Save handler
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName || !srvPrice || !srvMin || !srvMax || !srvCategoryId) {
      error('Fields Required', 'Please complete all mandatory service configurations.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/services', {
        id: srvId || undefined,
        name: srvName,
        categoryId: srvCategoryId,
        price: Number(srvPrice),
        min: Number(srvMin),
        max: Number(srvMax),
        description: srvDesc,
        status: srvStatus,
        averageTime: srvAverageTime,
        dripfeed: srvDripfeed,
        refill: srvRefill,
        cancel: srvCancel,
        sortOrder: Number(srvSortOrder),
        providerId: srvProviderId || null,
        providerServiceId: srvProviderServiceId || null,
      });

      success('Service Saved', 'Service configuration committed to catalog database.');
      setShowServiceForm(false);
      resetServiceForm();
      await loadData();
    } catch (err: any) {
      error('Configuration Error', err.response?.data?.error || 'Failed to save SMM service package.');
    } finally {
      setActionLoading(false);
    }
  };

  // Category Save handler
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) {
      error('Fields Required', 'Category name is required.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/categories', {
        id: catId || undefined,
        name: catName,
        icon: catIcon,
        description: catDesc,
        sortOrder: Number(catSortOrder),
        status: catStatus,
      });

      success('Category Saved', 'Service category updated successfully.');
      setShowCategoryForm(false);
      resetCategoryForm();
      await loadData();
    } catch (err: any) {
      error('Configuration Error', err.response?.data?.error || 'Failed to save SMM category.');
    } finally {
      setActionLoading(false);
    }
  };

  // Category and Service deletes
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this SMM service package?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/services/${serviceId}`);
      success('Service Deleted', 'Package permanently removed from catalog.');
      await loadData();
    } catch (err) {
      error('Could not delete', 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const tiedServices = services.filter(s => s.categoryId === id);
    if (tiedServices.length > 0) {
      if (!confirm(`Warning: This category contains ${tiedServices.length} active services. If you delete this category, these services will belong to an orphan category. Continue?`)) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this SMM category?')) return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/categories/${id}`);
      success('Category Deleted', 'Category permanently removed.');
      await loadData();
    } catch (err) {
      error('Could not delete', 'An error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  // Category Reordering
  const handleMoveCategory = async (cat: Category, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === cat.id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    setActionLoading(true);
    try {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const targetCat = categories[targetIndex];

      // Swap sortOrders
      const currentOrder = cat.sortOrder;
      const targetOrder = targetCat.sortOrder;

      // Update both
      await Promise.all([
        api.post('/categories', { ...cat, sortOrder: targetOrder }),
        api.post('/categories', { ...targetCat, sortOrder: currentOrder })
      ]);

      success('Order Adjusted', 'Category layout order updated successfully.');
      await loadData();
    } catch (e) {
      error('Could not sort', 'An error occurred during list reordering.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'enable' | 'disable' | 'delete') => {
    if (selectedServiceIds.length === 0) return;
    
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete all ${selectedServiceIds.length} selected SMM services permanently?`)) return;
    }

    setActionLoading(true);
    try {
      let successCount = 0;
      for (const id of selectedServiceIds) {
        const srv = services.find(s => s.id === id);
        if (!srv) continue;

        if (action === 'delete') {
          await api.delete(`/services/${id}`);
        } else {
          await api.post('/services', {
            ...srv,
            status: action === 'enable' ? 'active' : 'disabled'
          });
        }
        successCount++;
      }

      success('Bulk Operation Complete', `Successfully processed ${successCount} SMM service packages.`);
      setSelectedServiceIds([]);
      await loadData();
    } catch (err) {
      error('Bulk Action Failed', 'An error occurred during a bulk operation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditService = (s: Service) => {
    setSrvId(s.id);
    setSrvName(s.name);
    setSrvCategoryId(s.categoryId || '');
    setSrvPrice(s.price.toString());
    setSrvMin(s.min.toString());
    setSrvMax(s.max.toString());
    setSrvDesc(s.description);
    setSrvStatus(s.status);
    setSrvAverageTime(s.averageTime || 'Instant');
    setSrvDripfeed(!!s.dripfeed);
    setSrvRefill(!!s.refill);
    setSrvCancel(!!s.cancel);
    setSrvSortOrder((s.sortOrder || 1).toString());
    setSrvProviderId(s.providerId || '');
    setSrvProviderServiceId(s.providerServiceId || '');
    
    setShowServiceForm(true);
    // Smooth scroll to top of editor
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditCategory = (c: Category) => {
    setCatId(c.id);
    setCatName(c.name);
    setCatIcon(c.icon || 'Instagram');
    setCatDesc(c.description || '');
    setCatSortOrder((c.sortOrder || 1).toString());
    setCatStatus(c.status);

    setShowCategoryForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetServiceForm = () => {
    setSrvId('');
    setSrvName('');
    if (categories.length > 0) {
      setSrvCategoryId(categories[0].id);
    } else {
      setSrvCategoryId('');
    }
    setSrvPrice('');
    setSrvMin('');
    setSrvMax('');
    setSrvDesc('');
    setSrvStatus('active');
    setSrvAverageTime('Instant');
    setSrvDripfeed(false);
    setSrvRefill(false);
    setSrvCancel(false);
    setSrvSortOrder('1');
    setSrvProviderId('');
    setSrvProviderServiceId('');
  };

  const resetCategoryForm = () => {
    setCatId('');
    setCatName('');
    setCatIcon('Instagram');
    setCatDesc('');
    setCatSortOrder((categories.length + 1).toString());
    setCatStatus('active');
  };

  if (loading) return <Loader />;

  const filteredServices = getFilteredServices();
  const filteredCategories = getFilteredCategories();

  return (
    <div className="space-y-8 font-sans text-gray-200">
      {/* Upper Navigation / Control Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/15 pb-6">
        <div>
          <h3 className="text-2xl font-display font-bold text-white tracking-tight">SMM Service Catalog Engine</h3>
          <p className="text-gray-400 text-xs mt-1">
            Build categories, design social delivery plans, configure price ratios, or adjust thresholds.
          </p>
        </div>

        {/* Dual Mode Switcher */}
        <div className="flex bg-[#0A0D15] p-1 rounded-xl border border-blue-900/10">
          <button
            id="subtab-services"
            onClick={() => setActiveSubTab('services')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeSubTab === 'services' 
                ? 'bg-amber-500 text-black shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Services ({services.length})
          </button>
          <button
            id="subtab-categories"
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
              activeSubTab === 'categories' 
                ? 'bg-amber-500 text-black shadow-md' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Categories ({categories.length})
          </button>
        </div>
      </div>

      {/* Action Buttons Header */}
      <div className="flex justify-end">
        {activeSubTab === 'services' ? (
          <button
            id="admin-add-srv-btn"
            onClick={() => {
              if (showServiceForm) {
                setShowServiceForm(false);
              } else {
                resetServiceForm();
                setShowServiceForm(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            {showServiceForm ? 'Collapse Editor' : 'Create Social Service'}
          </button>
        ) : (
          <button
            id="admin-add-cat-btn"
            onClick={() => {
              if (showCategoryForm) {
                setShowCategoryForm(false);
              } else {
                resetCategoryForm();
                setShowCategoryForm(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4.5 h-4.5" />
            {showCategoryForm ? 'Collapse Editor' : 'Create New Category'}
          </button>
        )}
      </div>

      {/* SERVICE EDITING / CREATION FORM */}
      <AnimatePresence>
        {activeSubTab === 'services' && showServiceForm && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-[#0A0D15] border border-blue-900/20 p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-amber-500 to-orange-500" />
            <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-amber-400 mb-6 flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              {srvId ? `Edit Service Package [ID: ${srvId}]` : 'Create SMM Service Package'}
            </h4>

            <form onSubmit={handleSaveService} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Service Package Name</label>
                  <input
                    id="srv-name-input"
                    type="text"
                    value={srvName}
                    onChange={(e) => setSrvName(e.target.value)}
                    placeholder="Instagram Real Followers [No Drop - High Quality - 30D Refill]"
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category Assignment</label>
                  <select
                    id="srv-category-select"
                    value={srvCategoryId}
                    onChange={(e) => setSrvCategoryId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Price Per 1,000 ($)
                  </label>
                  <input
                    id="srv-price-input"
                    type="number"
                    step="0.0001"
                    placeholder="1.95"
                    value={srvPrice}
                    onChange={(e) => setSrvPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Minimum Quantity</label>
                  <input
                    id="srv-min-input"
                    type="number"
                    placeholder="100"
                    value={srvMin}
                    onChange={(e) => setSrvMin(e.target.value)}
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Maximum Quantity</label>
                  <input
                    id="srv-max-input"
                    type="number"
                    placeholder="10000"
                    value={srvMax}
                    onChange={(e) => setSrvMax(e.target.value)}
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Average Delivery Time
                  </label>
                  <input
                    id="srv-avg-input"
                    type="text"
                    placeholder="0-2 Hours (Instant)"
                    value={srvAverageTime}
                    onChange={(e) => setSrvAverageTime(e.target.value)}
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-6 bg-[#06080E]/40 p-4 rounded-2xl border border-blue-950/20">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <input
                    id="srv-dripfeed-cb"
                    type="checkbox"
                    checked={srvDripfeed}
                    onChange={(e) => setSrvDripfeed(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-[#06080E]"
                  />
                  <label htmlFor="srv-dripfeed-cb" className="text-xs font-semibold text-gray-300 uppercase cursor-pointer select-none">Dripfeed</label>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <input
                    id="srv-refill-cb"
                    type="checkbox"
                    checked={srvRefill}
                    onChange={(e) => setSrvRefill(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-[#06080E]"
                  />
                  <label htmlFor="srv-refill-cb" className="text-xs font-semibold text-gray-300 uppercase cursor-pointer select-none">Refill Button</label>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <input
                    id="srv-cancel-cb"
                    type="checkbox"
                    checked={srvCancel}
                    onChange={(e) => setSrvCancel(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-[#06080E]"
                  />
                  <label htmlFor="srv-cancel-cb" className="text-xs font-semibold text-gray-300 uppercase cursor-pointer select-none">Cancellable</label>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                  <select
                    id="srv-status-select"
                    value={srvStatus}
                    onChange={(e) => setSrvStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-[#06080E] border border-blue-900/10 rounded-lg text-xs text-gray-200"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sorting Index</label>
                  <input
                    id="srv-sort-input"
                    type="number"
                    value={srvSortOrder}
                    onChange={(e) => setSrvSortOrder(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#06080E] border border-blue-900/10 rounded-lg text-xs text-gray-200"
                  />
                </div>
              </div>

              {/* Provider Integration Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
                <div>
                  <label className="block text-xs font-bold text-amber-500/80 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" /> API Provider Source
                  </label>
                  <input
                    id="srv-provider-input"
                    type="text"
                    value={srvProviderId}
                    onChange={(e) => setSrvProviderId(e.target.value)}
                    placeholder="e.g. jupitersmm (leave empty for manual fulfillment)"
                    className="w-full px-4 py-3 bg-[#06080E] border border-amber-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-500/80 uppercase tracking-wider mb-2">Provider Service ID (Mapping)</label>
                  <input
                    id="srv-provider-id-input"
                    type="text"
                    value={srvProviderServiceId}
                    onChange={(e) => setSrvProviderServiceId(e.target.value)}
                    placeholder="e.g. 1092"
                    className="w-full px-4 py-3 bg-[#06080E] border border-amber-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Package Details */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Service Package Description / Quality Guidelines</label>
                <textarea
                  id="srv-desc-input"
                  rows={4}
                  value={srvDesc}
                  onChange={(e) => setSrvDesc(e.target.value)}
                  placeholder="Provide precise delivery parameters, speed per day details, drop ratios, and support guarantees..."
                  className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  id="srv-cancel-editor-btn"
                  type="button"
                  onClick={() => setShowServiceForm(false)}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="srv-submit-btn"
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Service Configuration'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CATEGORY EDITING / CREATION FORM */}
      <AnimatePresence>
        {activeSubTab === 'categories' && showCategoryForm && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-[#0A0D15] border border-blue-900/20 p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-amber-500 to-orange-500" />
            <h4 className="text-sm font-mono font-bold uppercase tracking-wider text-amber-400 mb-6 flex items-center gap-2">
              <FolderPlus className="w-4 h-4" />
              {catId ? `Edit Category [ID: ${catId}]` : 'Create SMM Category'}
            </h4>

            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category Display Name</label>
                  <input
                    id="cat-name-input"
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Instagram Premium Services"
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lucide Icon Alias / Keyword</label>
                  <select
                    id="cat-icon-select"
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Youtube">Youtube</option>
                    <option value="Video">TikTok (Video)</option>
                    <option value="Send">Telegram (Send)</option>
                    <option value="Heart">Social Likes (Heart)</option>
                    <option value="Globe">Global Panel (Globe)</option>
                    <option value="Sliders">System Default (Sliders)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sort Order</label>
                    <input
                      id="cat-sort-input"
                      type="number"
                      value={catSortOrder}
                      onChange={(e) => setCatSortOrder(e.target.value)}
                      className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                    <select
                      id="cat-status-select"
                      value={catStatus}
                      onChange={(e) => setCatStatus(e.target.value as any)}
                      className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category Guidelines / Description</label>
                <textarea
                  id="cat-desc-input"
                  rows={3}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Short, helpful notes displayed to clients browsing this category..."
                  className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  id="cat-cancel-editor-btn"
                  type="button"
                  onClick={() => setShowCategoryForm(false)}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="cat-submit-btn"
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH AND FILTERS FLOATING SHELF */}
      <div className="bg-[#0A0D15]/60 border border-blue-900/10 p-5 rounded-2xl flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
          <input
            id="admin-search-input"
            type="text"
            value={activeSubTab === 'services' ? serviceSearch : categorySearch}
            onChange={(e) => activeSubTab === 'services' ? setServiceSearch(e.target.value) : setCategorySearch(e.target.value)}
            placeholder={activeSubTab === 'services' ? 'Search service packages by name or ID...' : 'Search categories...'}
            className="w-full pl-11 pr-4 py-2.5 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600"
          />
        </div>

        {activeSubTab === 'services' && (
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Category</span>
              <select
                id="admin-cat-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-[#06080E] border border-blue-900/10 rounded-lg text-xs text-gray-300 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Status</span>
              <select
                id="admin-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#06080E] border border-blue-900/10 rounded-lg text-xs text-gray-300 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* BULK OPERATION TOOLBAR (Only active if services selected) */}
      {activeSubTab === 'services' && selectedServiceIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(245,158,11,0.05)]"
        >
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-200">
              Bulk actions active: <strong className="font-bold font-mono text-white bg-amber-500/20 px-2 py-0.5 rounded ml-1">{selectedServiceIds.length}</strong> services selected.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="bulk-enable-btn"
              onClick={() => handleBulkAction('enable')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Bulk Enable
            </button>
            <button
              id="bulk-disable-btn"
              onClick={() => handleBulkAction('disable')}
              className="px-3.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/25 text-rose-300 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Bulk Disable
            </button>
            <button
              id="bulk-delete-btn"
              onClick={() => handleBulkAction('delete')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Bulk Delete
            </button>
            <button
              id="bulk-cancel-btn"
              onClick={() => setSelectedServiceIds([])}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-semibold rounded-lg cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </motion.div>
      )}

      {/* CORE TABLES / CONTENT BLOCKS */}
      <div className="bg-[#0A0D15] border border-blue-900/10 rounded-2xl p-6 relative overflow-hidden">
        {activeSubTab === 'services' ? (
          <div>
            {filteredServices.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Sliders className="w-12 h-12 text-gray-600 mx-auto" />
                <h4 className="text-sm font-semibold text-gray-400">No Services Found</h4>
                <p className="text-xs text-gray-600">No social delivery packages matching your filter parameters exist.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-blue-900/5 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="pb-3 w-10 text-center">
                        <button
                          id="bulk-select-all-header"
                          onClick={handleSelectAllServices}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          {selectedServiceIds.length === filteredServices.length ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="pb-3 pl-2">ID</th>
                      <th className="pb-3">SMM Service Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3 text-right">Price/1k</th>
                      <th className="pb-3 text-center">Min / Max</th>
                      <th className="pb-3 text-center">Refill</th>
                      <th className="pb-3 text-center">Provider</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-900/5 text-xs font-medium">
                    {filteredServices.map((s) => {
                      const isSelected = selectedServiceIds.includes(s.id);
                      return (
                        <tr 
                          key={s.id} 
                          className={`hover:bg-[#070A11]/40 transition-colors ${
                            isSelected ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-4 text-center">
                            <button
                              id={`select-srv-${s.id}`}
                              onClick={() => handleSelectService(s.id)}
                              className="text-gray-500 hover:text-white transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 pl-2 font-mono text-[10px] text-gray-500">{s.id}</td>
                          <td className="py-4 text-gray-200 pr-4 max-w-xs sm:max-w-md">
                            <div className="font-semibold text-gray-200 line-clamp-1">{s.name}</div>
                            {s.averageTime && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 mt-1 font-mono">
                                <Clock className="w-3 h-3" /> Average: {s.averageTime}
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-amber-500 text-[10px] tracking-wider uppercase font-mono font-bold">
                            {s.category}
                          </td>
                          <td className="py-4 text-right font-mono font-bold text-emerald-400 text-xs">
                            ${(s.price || s.ratePerThousand || 0).toFixed(4)}
                          </td>
                          <td className="py-4 text-center font-mono text-gray-500 text-[10px]">
                            {s.min || s.minQuantity} / {s.max || s.maxQuantity}
                          </td>
                          <td className="py-4 text-center">
                            {s.refill ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">REFILL</span>
                            ) : (
                              <span className="text-gray-600 text-[9px]">-</span>
                            )}
                          </td>
                          <td className="py-4 text-center font-mono text-[10px] text-blue-400">
                            {s.providerId ? `${s.providerId} (${s.providerServiceId})` : <span className="text-gray-600">-</span>}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-extrabold uppercase ${
                              s.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                id={`edit-srv-${s.id}`}
                                onClick={() => handleEditService(s)}
                                className="p-1.5 bg-blue-600/10 border border-blue-500/15 rounded-lg hover:bg-blue-600/25 text-blue-400 transition-colors cursor-pointer"
                                title="Edit Service details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`delete-srv-${s.id}`}
                                onClick={() => handleDeleteService(s.id)}
                                className="p-1.5 bg-rose-600/10 border border-rose-500/15 rounded-lg hover:bg-rose-600/25 text-rose-400 transition-colors cursor-pointer"
                                title="Permanently delete service"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        ) : (
          <div>
            {/* CATEGORIES CONFIGURATOR TAB */}
            {filteredCategories.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Layers className="w-12 h-12 text-gray-600 mx-auto" />
                <h4 className="text-sm font-semibold text-gray-400">No Categories Found</h4>
                <p className="text-xs text-gray-600">Create service categories to categorize SMM plans.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-blue-900/5 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Sorting index</th>
                      <th className="pb-3">ID</th>
                      <th className="pb-3">Category Name</th>
                      <th className="pb-3">Icon Key</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3 text-center">Services Linked</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-900/5 text-xs font-medium">
                    {filteredCategories.map((c, index) => {
                      const linkedServicesCount = services.filter(s => s.categoryId === c.id || s.category === c.name).length;
                      return (
                        <tr key={c.id} className="hover:bg-[#070A11]/30 transition-colors">
                          <td className="py-4 pl-2">
                            <div className="flex items-center gap-1">
                              <span className="font-mono bg-[#06080E] px-2 py-1 rounded border border-blue-900/10 text-amber-500 text-[10px] font-bold">
                                #{c.sortOrder}
                              </span>
                              <div className="flex flex-col">
                                <button
                                  id={`move-up-cat-${c.id}`}
                                  disabled={index === 0}
                                  onClick={() => handleMoveCategory(c, 'up')}
                                  className={`p-0.5 hover:text-white transition-colors cursor-pointer ${index === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400'}`}
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  id={`move-down-cat-${c.id}`}
                                  disabled={index === filteredCategories.length - 1}
                                  onClick={() => handleMoveCategory(c, 'down')}
                                  className={`p-0.5 hover:text-white transition-colors cursor-pointer ${index === filteredCategories.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400'}`}
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-[10px] text-gray-500">{c.id}</td>
                          <td className="py-4 text-gray-200 font-bold text-sm">{c.name}</td>
                          <td className="py-4">
                            <span className="inline-flex items-center gap-1 bg-blue-950/20 px-2 py-0.5 border border-blue-900/10 rounded-lg text-blue-400 font-mono text-[10px]">
                              {c.icon || 'Sliders'}
                            </span>
                          </td>
                          <td className="py-4 text-gray-400 max-w-xs truncate">{c.description || <span className="text-gray-600">No description provided</span>}</td>
                          <td className="py-4 text-center font-mono font-bold text-amber-500">
                            {linkedServicesCount}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[9px] font-extrabold uppercase ${
                              c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                id={`edit-cat-${c.id}`}
                                onClick={() => handleEditCategory(c)}
                                className="p-1.5 bg-blue-600/10 border border-blue-500/15 rounded-lg hover:bg-blue-600/25 text-blue-400 transition-colors cursor-pointer"
                                title="Edit category"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`delete-cat-${c.id}`}
                                onClick={() => handleDeleteCategory(c.id)}
                                className="p-1.5 bg-rose-600/10 border border-rose-500/15 rounded-lg hover:bg-rose-600/25 text-rose-400 transition-colors cursor-pointer"
                                title="Delete category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        )}
      </div>
    </div>
  );
}

export default Services;

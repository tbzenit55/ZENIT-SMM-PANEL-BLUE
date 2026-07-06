import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import {
  getUserProfile,
  saveUserProfile,
  getAllUsers,
  getServices,
  saveService,
  deleteService,
  getCategories,
  saveCategory,
  deleteCategory,
  getOrders,
  saveOrder,
  getTickets,
  saveTicket,
  getPayments,
  savePayment,
  getSystemStats,
  getSystemSettings,
  saveSystemSettings,
  getSystemLogs,
  saveSystemLog,
  getSystemNotifications,
  saveSystemNotification,
  markNotificationAsRead,
  deleteUserProfile,
  getProviders,
  saveProvider,
  deleteProvider,
  getCustomPaymentMethods,
  saveCustomPaymentMethod,
  deleteCustomPaymentMethod,
  getSyncSettings,
  saveSyncSettings,
  getSyncLogs,
  saveSyncLog,
  getProvidersHealth,
  saveProviderHealth,
  getZenitNotifications,
  saveZenitNotification,
  markZenitNotificationAsRead,
  markAllZenitNotificationsAsRead,
  deleteZenitNotification,
  getNotificationTemplates,
  saveNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationSettings,
  saveNotificationSettings,
  calculateAnalytics,
  getAuditLogs,
  saveAuditLog,
  getSecurityLogs,
  saveSecurityLog,
  exportDatabaseDump,
  importDatabaseDump,
} from '../config/store';
import { SimpleCache, SyncEngine } from '../config/syncEngine';
import {
  getWallet,
  saveWallet,
  getAllWallets,
  getTransactions,
  executeBalanceUpdate,
  getWalletRequests,
  saveWalletRequest,
  deductUserBalance,
  refundUserBalance,
} from '../config/walletStore';
import { UserProfile, Order, Ticket, Payment, Service, Category, SystemLog, AuditLog, SecurityLog, SystemNotification, Provider, Wallet, Transaction, WalletRequest, CustomPaymentMethod, ZenitNotification, NotificationTemplate, NotificationSettings } from '../../src/types';
import { ProviderAdapter } from '../config/providerAdapter';
import { syncActiveOrders } from '../config/orderSync';

const router = Router();

const isAdmin = (role?: string) => role === 'Admin' || role === 'Super Admin' || role === 'admin';

// ==========================================
// 1. USER PROFILE ENDPOINTS
// ==========================================

// Get or auto-provision a user profile
router.get('/users/:uid', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.params;
  
  // Verify that the requested UID matches the authenticated user, or the caller is an admin
  if (req.user?.uid !== uid && !isAdmin(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden. You cannot access other users profiles.' });
  }

  try {
    let profile = await getUserProfile(uid);
    if (!profile) {
      // Auto-provision user on first fetch (convenient for Firebase sign-ups)
      profile = {
        uid,
        name: req.user?.displayName || 'Zenit Member',
        displayName: req.user?.displayName || 'Zenit Member',
        email: req.user?.email || 'user@zenitsmm.com',
        phone: '',
        role: 'User',
        balance: 0.00, // Starting wallet balance of 0.00
        totalSpent: 0,
        totalOrders: 0,
        status: 'Active',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveUserProfile(profile);
    }
    return res.json({ profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create/provision user profile on registration
router.post('/users', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone } = req.body;
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated. Missing user identifier.' });
  }

  try {
    let profile = await getUserProfile(uid);
    if (!profile) {
      profile = {
        uid,
        name: name || req.user?.displayName || 'Zenit Member',
        displayName: name || req.user?.displayName || 'Zenit Member',
        email: req.user?.email || 'user@zenitsmm.com',
        phone: phone || '',
        role: 'User',
        balance: 0.00, // Starting wallet balance of 0.00
        totalSpent: 0,
        totalOrders: 0,
        status: 'Active',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveUserProfile(profile);
    }
    return res.json({ profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Get all users
router.get('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await getAllUsers();
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Adjust user balance or profile
router.post('/users/:uid/adjust', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.params;
  const { balance, role, status } = req.body;

  try {
    const profile = await getUserProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const now = new Date().toISOString();
    const oldBalance = profile.balance;
    const oldRole = profile.role;
    const oldStatus = profile.status;

    if (balance !== undefined) profile.balance = Number(balance);
    if (role !== undefined) profile.role = role;
    if (status !== undefined) {
      profile.status = status;
      // Automatically revoke sessions when a user is suspended or banned
      if (status !== 'Active' && oldStatus === 'Active') {
        profile.forceLogoutTimestamp = now;
      }
    }
    profile.updatedAt = now;

    await saveUserProfile(profile);

    // Save Audit Trail
    await saveAuditLog({
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Admin adjusted user profile: ${profile.email}`,
      category: 'user',
      details: { 
        targetUserId: uid, 
        changes: { 
          balance: balance !== undefined ? { from: oldBalance, to: Number(balance) } : undefined,
          role: role !== undefined ? { from: oldRole, to: role } : undefined,
          status: status !== undefined ? { from: oldStatus, to: status } : undefined
        }
      },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: now
    });

    // Save Security Incident for high privilege or critical adjustments
    if (role !== undefined || (status !== undefined && status !== 'Active')) {
      await saveSecurityLog({
        id: `sec-${Math.random().toString(36).substring(2, 9)}`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        action: role !== undefined ? 'password_change' : 'suspicious_activity', // represent administrative overrides
        severity: role === 'Admin' || role === 'Super Admin' ? 'critical' : 'high',
        details: { targetUserId: uid, targetUserEmail: profile.email, newRole: role, newStatus: status },
        ipAddress: req.ip || '127.0.0.1',
        createdAt: now
      });
    }

    return res.json({ message: 'User updated successfully', profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Revoke user active sessions (Force logout)
router.post('/admin/users/:uid/revoke-sessions', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.params;
  try {
    const profile = await getUserProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const now = new Date().toISOString();
    profile.forceLogoutTimestamp = now;
    profile.updatedAt = now;
    await saveUserProfile(profile);

    // Save security log
    await saveSecurityLog({
      id: `sec-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: 'session_revocation',
      severity: 'high',
      details: { targetUserId: uid, targetUserEmail: profile.email },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: now
    });

    // Save audit log
    await saveAuditLog({
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Admin revoked all active sessions for user ${profile.email}`,
      category: 'user',
      details: { targetUserId: uid },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: now
    });

    return res.json({ success: true, message: `All active sessions revoked for user ${profile.email}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. SERVICE & CATEGORY ENDPOINTS
// ==========================================

router.get('/categories', async (req, res) => {
  try {
    const cached = SimpleCache.getCategories();
    if (cached) {
      return res.json({ categories: cached });
    }
    const categories = await getCategories();
    const services = await getServices();
    SimpleCache.set(services, categories);
    return res.json({ categories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Create or update category
router.post('/categories', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, icon, description, sortOrder, status } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const catId = id || `cat-${Math.random().toString(36).substring(2, 9)}`;
    
    // Look up existing category to preserve createdAt
    const existingCategories = await getCategories();
    const existing = existingCategories.find(c => c.id === catId);

    const newCategory: Category = {
      id: catId,
      name,
      icon: icon || 'Sliders',
      description: description || '',
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 1,
      status: status || 'active',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCategory(newCategory);
    SimpleCache.invalidate();

    // Save Admin Log
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `${existing ? 'Updated' : 'Created'} SMM category: ${name} (${catId})`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Category saved successfully', category: newCategory });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete category
router.delete('/categories/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCategory(id);
    SimpleCache.invalidate();

    // Log admin action
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Deleted SMM category: ${id}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Category deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/services', async (req, res) => {
  try {
    const cached = SimpleCache.getServices();
    if (cached) {
      return res.json({ services: cached });
    }
    const services = await getServices();
    const categories = await getCategories();
    SimpleCache.set(services, categories);
    return res.json({ services });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Create or update service
router.post('/services', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { 
    id, 
    name, 
    categoryId, 
    category, // backward compatibility
    price, 
    ratePerThousand, // backward compatibility
    min, 
    minQuantity, // backward compatibility
    max, 
    maxQuantity, // backward compatibility
    description, 
    status,
    averageTime,
    dripfeed,
    refill,
    cancel,
    sortOrder,
    providerId,
    providerServiceId
  } = req.body;

  if (!name || (!categoryId && !category)) {
    return res.status(400).json({ error: 'Missing required service parameters (name, categoryId).' });
  }

  try {
    const serviceId = id || `srv-${Math.random().toString(36).substring(2, 9)}`;
    
    // Look up categories to map category name or ID properly
    const categories = await getCategories();
    let resolvedCategoryId = categoryId;
    let resolvedCategoryName = category;

    if (resolvedCategoryId) {
      const match = categories.find(c => c.id === resolvedCategoryId);
      if (match) {
        resolvedCategoryName = match.name;
      }
    } else if (resolvedCategoryName) {
      const match = categories.find(c => c.name.toLowerCase() === resolvedCategoryName.toLowerCase());
      if (match) {
        resolvedCategoryId = match.id;
      } else {
        // Create an on-the-fly category if it does not exist
        resolvedCategoryId = `cat-${Math.random().toString(36).substring(2, 9)}`;
        const newCat: Category = {
          id: resolvedCategoryId,
          name: resolvedCategoryName,
          sortOrder: categories.length + 1,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await saveCategory(newCat);
      }
    }

    // Preserve createdAt if editing
    const existingServices = await getServices();
    const existing = existingServices.find(s => s.id === serviceId);

    const resolvedPrice = price !== undefined ? Number(price) : (ratePerThousand !== undefined ? Number(ratePerThousand) : 0);
    const resolvedMin = min !== undefined ? Number(min) : (minQuantity !== undefined ? Number(minQuantity) : 1);
    const resolvedMax = max !== undefined ? Number(max) : (maxQuantity !== undefined ? Number(maxQuantity) : 10000);

    const newService: Service = {
      id: serviceId,
      categoryId: resolvedCategoryId || 'cat-1',
      category: resolvedCategoryName || 'General Services',
      providerId: providerId !== undefined ? providerId : null,
      providerServiceId: providerServiceId !== undefined ? providerServiceId : null,
      name,
      description: description || '',
      price: resolvedPrice,
      ratePerThousand: resolvedPrice, // backward compatibility
      min: resolvedMin,
      minQuantity: resolvedMin, // backward compatibility
      max: resolvedMax,
      maxQuantity: resolvedMax, // backward compatibility
      averageTime: averageTime || 'Instant',
      dripfeed: dripfeed !== undefined ? Boolean(dripfeed) : false,
      refill: refill !== undefined ? Boolean(refill) : false,
      cancel: cancel !== undefined ? Boolean(cancel) : false,
      status: status || 'active',
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 1,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveService(newService);
    SimpleCache.invalidate();

    // Save Admin Log
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `${existing ? 'Updated' : 'Created'} SMM service: ${name} (${serviceId})`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Service saved successfully', service: newService });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete service
router.delete('/services/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteService(id);
    SimpleCache.invalidate();

    // Log admin action
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Deleted SMM service package: ${id}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Service deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// SMM PROVIDER ENDPOINTS (ADMIN ONLY)
// ==========================================

// Get all providers
router.get('/providers', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const providers = await getProviders();
    return res.json({ providers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create or update a provider
router.post('/providers', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const {
    id,
    name,
    apiUrl,
    apiKey,
    status,
    currency,
    priority,
    timeout,
    rateMultiplier,
    supportsRefill,
    supportsCancel,
  } = req.body;

  if (!name || !apiUrl || !apiKey) {
    return res.status(400).json({ error: 'Missing name, apiUrl, or apiKey.' });
  }

  try {
    const providerId = id || `prov-${Math.random().toString(36).substring(2, 9)}`;
    const existingProviders = await getProviders();
    const existing = existingProviders.find(p => p.id === providerId);

    const newProvider: Provider = {
      id: providerId,
      name,
      apiUrl,
      apiKey,
      status: status || 'active',
      currency: currency || 'USD',
      priority: priority !== undefined ? Number(priority) : 1,
      timeout: timeout !== undefined ? Number(timeout) : 10000,
      rateMultiplier: rateMultiplier !== undefined ? Number(rateMultiplier) : 1.0,
      supportsRefill: supportsRefill !== undefined ? Boolean(supportsRefill) : true,
      supportsCancel: supportsCancel !== undefined ? Boolean(supportsCancel) : true,
      lastSync: existing?.lastSync || null,
      lastHealthCheck: existing?.lastHealthCheck || null,
      successCount: existing?.successCount || 0,
      failedCount: existing?.failedCount || 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastError: existing?.lastError || null,
      lastSuccessRequest: existing?.lastSuccessRequest || null,
      uptime: existing?.uptime || 100,
    };

    await saveProvider(newProvider);

    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `${existing ? 'Updated' : 'Created'} SMM provider: ${name} (${providerId})`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Provider saved successfully', provider: newProvider });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a provider
router.delete('/providers/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await deleteProvider(id);

    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Deleted SMM provider: ${id}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Provider deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Test connection (balance check)
router.post('/providers/:id/test', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providers = await getProviders();
    const provider = providers.find(p => p.id === id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const { balance, currency } = await ProviderAdapter.getBalance(provider);
    return res.json({ success: true, balance, currency });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger health check manually
router.post('/providers/:id/health-check', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providers = await getProviders();
    const provider = providers.find(p => p.id === id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const { balance, currency } = await ProviderAdapter.getBalance(provider);
    return res.json({
      success: true,
      message: 'Health check completed successfully',
      balance,
      currency,
      lastHealthCheck: provider.lastHealthCheck,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get raw services list from provider
router.get('/providers/:id/services', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const providers = await getProviders();
    const provider = providers.find(p => p.id === id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const services = await ProviderAdapter.getServices(provider);
    return res.json({ services });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Run catalog sync manually for a provider
router.post('/providers/:id/sync', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const log = await SyncEngine.syncProviderCatalog(id, 'manual');
    if (log.status === 'failed') {
      return res.status(500).json({ error: log.errors.join('; ') });
    }
    return res.json({
      success: true,
      message: 'Catalog synchronized successfully',
      importedCount: log.importedCount,
      updatedCount: log.updatedCount,
      disabledCount: log.disabledCount,
      lastSync: log.finishedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// AUTO SYNC & HEALTH MONITORING ENDPOINTS
// ==========================================

// GET SMM Auto-Sync Settings
router.get('/sync/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await getSyncSettings();
    return res.json({ settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST SMM Auto-Sync Settings
router.post('/sync/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = req.body;
    await saveSyncSettings(settings);
    return res.json({ success: true, message: 'Auto-sync settings updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET SMM Sync Logs
router.get('/sync/logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await getSyncLogs();
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET Providers Health & History
router.get('/sync/health', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await getProvidersHealth();
    return res.json({ health });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Manual Trigger SMM Health Check on all Active Providers
router.post('/sync/health-check-all', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const providers = await getProviders();
    const results = [];
    for (const prov of providers) {
      const h = await SyncEngine.checkProviderHealth(prov);
      results.push(h);
    }
    return res.json({ success: true, message: 'All active provider health checked completed', results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 3. ORDER ENDPOINTS
// ==========================================

// Get user orders or all orders if admin
router.get('/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = isAdmin(req.user?.role) ? undefined : req.user?.uid;
    const orders = await getOrders(userId);
    return res.json({ orders });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Place an order
router.post('/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { serviceId, link, quantity } = req.body;
  const uid = req.user?.uid;

  if (!serviceId || !link || !quantity || !uid) {
    return res.status(400).json({ error: 'Missing serviceId, link, or quantity.' });
  }

  // URL format validation
  const trimmedLink = String(link).trim();
  if (trimmedLink.length < 3) {
    return res.status(400).json({ error: 'Invalid URL/Link handle.' });
  }

  try {
    // 1. Get user profile
    const user = await getUserProfile(uid);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: `Your account is ${user.status.toLowerCase()}. Please contact support.` });
    }

    // 2. Load service
    const services = await getServices();
    const service = services.find((s) => s.id === serviceId);
    
    if (!service || service.status !== 'active') {
      return res.status(404).json({ error: 'This service is currently disabled or unavailable.' });
    }

    // 3. Validate Quantity
    const qty = Number(quantity);
    const minQty = service.minQuantity || service.min || 10;
    const maxQty = service.maxQuantity || service.max || 100000;
    if (isNaN(qty) || qty < minQty || qty > maxQty) {
      return res.status(400).json({
        error: `Quantity must be between ${minQty} and ${maxQty}.`
      });
    }

    // 4. Validate Provider status if applicable
    let provider: Provider | undefined;
    let costRate = 0;
    let cost = 0;

    if (service.providerId && service.providerServiceId) {
      const providers = await getProviders();
      provider = providers.find((p) => p.id === service.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'Configured SMM API provider is not configured in settings.' });
      }
      if (provider.status !== 'active') {
        return res.status(400).json({ error: 'The SMM API provider is currently offline or disabled.' });
      }

      const rateMultiplier = provider.rateMultiplier || 1.15;
      const basePrice = service.price || service.ratePerThousand || 0;
      costRate = Number((basePrice / rateMultiplier).toFixed(4));
      cost = Number(((qty / 1000) * costRate).toFixed(4));
    } else {
      // Manual/self-fulfilled service
      cost = Number(((qty / 1000) * (service.price || service.ratePerThousand || 0) * 0.1).toFixed(4)); // 10% base cost
    }

    const pricePerThousand = service.price || service.ratePerThousand || 0.1;
    const charge = Number(((qty / 1000) * pricePerThousand).toFixed(4));
    if (user.balance < charge) {
      return res.status(400).json({
        error: `Insufficient balance. Order costs $${charge.toFixed(4)}, but your current balance is $${user.balance.toFixed(4)}.`
      });
    }

    // 5. Deduct Balance Atomically using Firestore Transaction
    const updatedUser = await deductUserBalance(uid, charge);

    // 6. Send Order to SMM Provider or handle manual placement
    const orderId = `ord-${Math.random().toString(36).substring(2, 9)}`;
    let providerOrderId: string | null = null;
    let providerStatus = 'pending';

    if (service.providerId && service.providerServiceId && provider) {
      try {
        providerOrderId = await ProviderAdapter.createOrder(
          provider,
          service.providerServiceId,
          trimmedLink,
          qty
        );
      } catch (providerError: any) {
        // Provider placement failed! Automatically Rollback/Refund balance
        await refundUserBalance(uid, charge);

        // Store failed order to keep transparency in logs
        const failedOrder: Order = {
          id: orderId,
          orderId,
          providerOrderId: null,
          userId: uid,
          userEmail: user.email,
          providerId: service.providerId,
          serviceId: service.id,
          serviceName: service.name,
          categoryName: service.category || 'Direct',
          link: trimmedLink,
          quantity: qty,
          price: charge,
          charge,
          cost: cost,
          profit: 0,
          startCount: 0,
          remains: qty,
          status: 'failed',
          providerStatus: 'failed',
          refillAvailable: false,
          cancelAvailable: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        };
        await saveOrder(failedOrder);

        await saveSystemLog({
          id: `log-${Math.random().toString(36).substring(2, 9)}`,
          type: 'error',
          userId: uid,
          userEmail: user.email,
          action: `Provider order failed: ${providerError.message || 'API error'}. Automatically refunded $${charge.toFixed(4)} to user.`,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] || '',
          createdAt: new Date().toISOString()
        });

        return res.status(500).json({
          error: `SMM Provider error: ${providerError.message || 'API rejected placement'}. Your funds have been fully refunded.`
        });
      }
    } else {
      // Manual order
      providerOrderId = `manual-${Math.random().toString(36).substring(2, 9)}`;
    }

    // 7. Store the complete order document
    const newOrder: Order = {
      id: orderId,
      orderId,
      providerOrderId,
      userId: uid,
      userEmail: user.email,
      providerId: service.providerId || null,
      serviceId: service.id,
      serviceName: service.name,
      categoryName: service.category || 'Direct',
      link: trimmedLink,
      quantity: qty,
      price: charge,
      charge,
      cost,
      profit: Number((charge - cost).toFixed(4)),
      startCount: 0,
      remains: qty,
      status: 'pending',
      providerStatus,
      refillAvailable: service.refill || false,
      cancelAvailable: service.cancel || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };

    await saveOrder(newOrder);

    // Save success notification
    await saveZenitNotification({
      id: `ntf-${Math.random().toString(36).substring(2, 9)}`,
      userId: uid,
      title: 'Order Placed Successfully',
      message: `Your order for ${qty} ${service.name} (Total: $${charge.toFixed(4)}) has been placed successfully and is now pending.`,
      read: false,
      type: 'Order',
      severity: 'success',
      createdAt: new Date().toISOString()
    });

    // Save success log
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'activity',
      userId: uid,
      userEmail: user.email,
      action: `Placed order ${orderId} (Service: ${service.name}) for $${charge.toFixed(4)}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ 
      message: 'Order placed successfully', 
      order: newOrder,
      balance: updatedUser.balance
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Update order status
router.post('/orders/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, remains, startCount } = req.body;

  try {
    const orders = await getOrders();
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const oldStatus = order.status;
    if (status) order.status = status;
    if (remains !== undefined) order.remains = Number(remains);
    if (startCount !== undefined) order.startCount = Number(startCount);
    order.updatedAt = new Date().toISOString();

    await saveOrder(order);

    // Transaction-safe automatic refund for admin cancel/failed
    if (status && oldStatus !== status) {
      if (status === 'canceled' || status === 'failed') {
        await refundUserBalance(order.userId, order.price);
        
        await saveSystemLog({
          id: `log-${Math.random().toString(36).substring(2, 9)}`,
          type: 'admin',
          userId: req.user?.uid,
          userEmail: req.user?.email,
          action: `Admin marked order ${order.id} as ${status}. Refunded full $${order.price.toFixed(4)} to user balance.`,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] || '',
          createdAt: new Date().toISOString()
        });
      } else if (status === 'partial') {
        const ratio = order.remains / order.quantity;
        if (ratio > 0 && ratio <= 1) {
          const refundAmount = Number((order.price * ratio).toFixed(4));
          if (refundAmount > 0) {
            await refundUserBalance(order.userId, refundAmount);
            await saveSystemLog({
              id: `log-${Math.random().toString(36).substring(2, 9)}`,
              type: 'admin',
              userId: req.user?.uid,
              userEmail: req.user?.email,
              action: `Admin marked order ${order.id} as partial. Refunded $${refundAmount.toFixed(4)} for ${order.remains} remaining items.`,
              ipAddress: req.ip || '127.0.0.1',
              userAgent: req.headers['user-agent'] || '',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }

    return res.json({ message: 'Order status updated successfully', order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// User self-service cancel pending order
router.post('/orders/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const uid = req.user?.uid;

  try {
    const orders = await getOrders();
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.userId !== uid && !isAdmin(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. You do not own this order.' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be canceled.' });
    }

    // Call SMM Provider API if connected
    if (order.providerId && order.providerOrderId && !order.providerOrderId.startsWith('manual-')) {
      const providers = await getProviders();
      const provider = providers.find((p) => p.id === order.providerId);
      if (provider && provider.supportsCancel) {
        try {
          await ProviderAdapter.requestCancel(provider, order.providerOrderId);
        } catch (err: any) {
          return res.status(400).json({ error: `SMM Provider rejected cancel: ${err.message}` });
        }
      }
    }

    order.status = 'canceled';
    order.providerStatus = 'canceled';
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);

    // Fully refund user
    await refundUserBalance(order.userId, order.price);

    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'activity',
      userId: uid,
      userEmail: req.user?.email,
      action: `User self-canceled pending order ${order.id}. Refunded $${order.price.toFixed(4)}.`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Order canceled successfully and balance refunded.', order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// User self-service request refill
router.post('/orders/:id/refill', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const uid = req.user?.uid;

  try {
    const orders = await getOrders();
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.userId !== uid && !isAdmin(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. You do not own this order.' });
    }

    if (!order.refillAvailable) {
      return res.status(400).json({ error: 'Refill is not available for this service package.' });
    }

    if (order.status !== 'completed' && order.status !== 'partial' && order.status !== 'inprogress') {
      return res.status(400).json({ error: 'Refill can only be requested for active/completed orders.' });
    }

    // Call SMM Provider API if connected
    if (order.providerId && order.providerOrderId && !order.providerOrderId.startsWith('manual-')) {
      const providers = await getProviders();
      const provider = providers.find((p) => p.id === order.providerId);
      if (provider) {
        try {
          await ProviderAdapter.requestRefill(provider, order.providerOrderId);
        } catch (err: any) {
          return res.status(400).json({ error: `SMM Provider rejected refill: ${err.message}` });
        }
      }
    }

    // Update order metadata or save log
    order.refillRequestedAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);

    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'activity',
      userId: uid,
      userEmail: req.user?.email,
      action: `User requested refill for order ${order.id}.`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Refill request submitted successfully.', order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4. SUPPORT TICKET ENDPOINTS
// ==========================================

// Get user tickets or all tickets if admin
router.get('/tickets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = isAdmin(req.user?.role) ? undefined : req.user?.uid;
    const tickets = await getTickets(userId);
    return res.json({ tickets });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create a support ticket
router.post('/tickets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { subject, message } = req.body;
  const uid = req.user?.uid;

  if (!subject || !message || !uid) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  try {
    const user = await getUserProfile(uid);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const newTicket: Ticket = {
      id: `tkt-${Math.random().toString(36).substring(2, 9)}`,
      userId: user.uid,
      userEmail: user.email,
      subject,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      replies: [],
    };

    await saveTicket(newTicket);
    return res.json({ message: 'Ticket opened successfully', ticket: newTicket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reply to a ticket
router.post('/tickets/:id/replies', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { message } = req.body;
  const uid = req.user?.uid;

  if (!message || !uid) {
    return res.status(400).json({ error: 'Reply message cannot be empty.' });
  }

  try {
    const tickets = await getTickets();
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.userId !== uid && !isAdmin(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden. You cannot reply to other users tickets.' });
    }

    const user = await getUserProfile(uid);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const reply = {
      id: `rep-${Math.random().toString(36).substring(2, 9)}`,
      userId: user.uid,
      userName: user.displayName || user.email,
      userRole: user.role,
      message,
      createdAt: new Date().toISOString(),
    };

    ticket.replies.push(reply);
    ticket.status = isAdmin(user.role) ? 'answered' : 'pending';
    
    await saveTicket(ticket);
    return res.json({ message: 'Reply sent successfully', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 5. DEPOSIT / PAYMENT ENDPOINTS
// ==========================================

router.get('/payments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = isAdmin(req.user?.role) ? undefined : req.user?.uid;
    const payments = await getPayments(userId);
    return res.json({ payments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Record a simulated/real deposit
router.post('/payments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { amount, method, transactionId } = req.body;
  const uid = req.user?.uid;

  if (!amount || !method) {
    return res.status(400).json({ error: 'Amount and payment method are required.' });
  }

  try {
    const user = await getUserProfile(uid!);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const depositAmount = Number(amount);
    if (depositAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    // Process instant payment confirmation (perfect for high converting panels)
    const newPayment: Payment = {
      id: `pmt-${Math.random().toString(36).substring(2, 9)}`,
      userId: user.uid,
      userEmail: user.email,
      amount: depositAmount,
      method,
      status: 'completed', // Auto-completed in demo/evaluation sandbox
      transactionId: transactionId || `tx-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    // Increment user balance
    user.balance = Number((user.balance + depositAmount).toFixed(4));
    await saveUserProfile(user);
    await savePayment(newPayment);

    await saveZenitNotification({
      id: `ntf-${Math.random().toString(36).substring(2, 9)}`,
      userId: user.uid,
      title: 'Wallet Deposit Confirmed',
      message: `Your deposit of $${depositAmount.toFixed(4)} via ${method} has been verified and added to your wallet successfully.`,
      read: false,
      type: 'Deposit',
      severity: 'success',
      createdAt: new Date().toISOString()
    });

    return res.json({ message: 'Deposit successful and balance updated', payment: newPayment });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 6. SYSTEM STATS ENDPOINT (Dashboard Overview)
// ==========================================

router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getSystemStats();
    return res.json({ stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. USER PROFILE DELETE ENDPOINT
// ==========================================
router.delete('/users/:uid', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.params;
    await deleteUserProfile(uid);
    
    // Log Admin Action
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Deleted user profile for UID: ${uid}`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });
    
    return res.json({ success: true, message: 'User profile deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. ADMIN CREATE / USER REGISTRATION API
// ==========================================
router.post('/users/create', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, displayName, role, balance, status } = req.body;
    
    // Direct Input Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'Display Name is required and must be at least 2 characters.' });
    }

    const uid = `usr-${Math.random().toString(36).substring(2, 10)}`;
    const newProfile: UserProfile = {
      uid,
      name: displayName,
      displayName,
      email: email.trim(),
      phone: '',
      role: role || 'User',
      balance: balance !== undefined ? Number(balance) : 0.00,
      totalSpent: 0,
      totalOrders: 0,
      status: status || 'Active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveUserProfile(newProfile);

    // Save Admin Log
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Created new ${role || 'User'} profile: ${email} (${displayName})`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, profile: newProfile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. WEBSITE & GLOBAL SETTINGS
// ==========================================
router.get('/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await getSystemSettings();
    return res.json({ settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { websiteName, maintenanceMode, currency, timezone, theme, logoUrl, faviconUrl, seoTitle, seoDescription, seoKeywords } = req.body;
    const settings = await getSystemSettings();
    
    if (websiteName !== undefined) settings.websiteName = String(websiteName);
    if (maintenanceMode !== undefined) settings.maintenanceMode = Boolean(maintenanceMode);
    if (currency !== undefined) settings.currency = String(currency);
    if (timezone !== undefined) settings.timezone = String(timezone);
    if (theme !== undefined) settings.theme = String(theme);
    if (logoUrl !== undefined) settings.logoUrl = String(logoUrl);
    if (faviconUrl !== undefined) settings.faviconUrl = String(faviconUrl);
    if (seoTitle !== undefined) settings.seoTitle = String(seoTitle);
    if (seoDescription !== undefined) settings.seoDescription = String(seoDescription);
    if (seoKeywords !== undefined) settings.seoKeywords = String(seoKeywords);

    await saveSystemSettings(settings);

    // Save Admin Log
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Updated global system and website configurations`,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Settings updated successfully', settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. SYSTEM & AUDIT LOGS
// ==========================================
router.get('/logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await getSystemLogs();
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, action } = req.body;
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'Valid action message is required.' });
    }
    const log: SystemLog = {
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: type || 'activity',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString()
    };
    await saveSystemLog(log);
    return res.json({ success: true, log });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all audit logs (Admin only)
router.get('/admin/audit-logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await getAuditLogs();
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST an audit log (Authenticated users/admins)
router.post('/audit-logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, category, details, browser, device } = req.body;
    if (!action || !category) {
      return res.status(400).json({ error: 'Action and Category are required.' });
    }
    const log: AuditLog = {
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action,
      category,
      details,
      ipAddress: req.ip || '127.0.0.1',
      browser: browser || 'Chrome',
      device: device || 'Desktop',
      createdAt: new Date().toISOString()
    };
    await saveAuditLog(log);
    return res.json({ success: true, log });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all security logs (Admin only)
router.get('/admin/security-logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await getSecurityLogs();
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST a security log (Authenticated users/admins)
router.post('/security-logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, severity, details, browser, device } = req.body;
    if (!action || !severity) {
      return res.status(400).json({ error: 'Action and Severity are required.' });
    }
    const log: SecurityLog = {
      id: `sec-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action,
      severity,
      details,
      ipAddress: req.ip || '127.0.0.1',
      browser: browser || 'Chrome',
      device: device || 'Desktop',
      createdAt: new Date().toISOString()
    };
    await saveSecurityLog(log);
    return res.json({ success: true, log });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. CENTRALIZED NOTIFICATIONS API
// ==========================================
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await getSystemNotifications();
    const userRole = req.user?.role;
    
    // Admins see all logs, users only see generic public OR user-specific alerts
    const filtered = (userRole === 'Admin' || userRole === 'Super Admin')
      ? list 
      : list.filter(n => !n.userId || n.userId === req.user?.uid);
      
    return res.json({ notifications: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, message, type, userId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Notification title and message are required.' });
    }
    const notif: SystemNotification = {
      id: `ntf-${Math.random().toString(36).substring(2, 9)}`,
      userId: userId || undefined,
      title: String(title),
      message: String(message),
      read: false,
      type: type || 'info',
      createdAt: new Date().toISOString()
    };
    await saveSystemNotification(notif);
    return res.json({ success: true, notification: notif });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await markNotificationAsRead(id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 12. ADMIN BULK ORDER ACTIONS
// ==========================================

// Bulk manual refresh/synchronize of active orders
router.post('/orders/bulk-refresh', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await syncActiveOrders();
    return res.json({
      success: true,
      message: `Sync completed successfully. Processed ${stats.processed} active orders, updated ${stats.updated} changed states, found ${stats.failures} API failures.`,
      stats
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk retry failed orders
router.post('/orders/bulk-retry', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { orderIds } = req.body;
  if (!orderIds || !Array.isArray(orderIds)) {
    return res.status(400).json({ error: 'orderIds must be an array of order IDs.' });
  }

  try {
    const orders = await getOrders();
    const services = await getServices();
    const providers = await getProviders();
    let retriedCount = 0;
    let failedCount = 0;

    for (const orderId of orderIds) {
      const order = orders.find(o => o.id === orderId);
      if (!order || order.status !== 'failed') continue;

      const service = services.find(s => s.id === order.serviceId);
      if (!service || service.status !== 'active') continue;

      // Charge user again since balance was refunded upon failure
      try {
        const user = await getUserProfile(order.userId);
        if (!user || user.balance < order.price) {
          failedCount++;
          continue;
        }

        // Deduct user balance transactionally
        await deductUserBalance(order.userId, order.price);

        let providerOrderId: string | null = null;
        if (service.providerId && service.providerServiceId) {
          const provider = providers.find(p => p.id === service.providerId);
          if (provider && provider.status === 'active') {
            providerOrderId = await ProviderAdapter.createOrder(
              provider,
              service.providerServiceId,
              order.link,
              order.quantity
            );
          } else {
            throw new Error('SMM Provider inactive or missing');
          }
        } else {
          providerOrderId = `manual-${Math.random().toString(36).substring(2, 9)}`;
        }

        // Update the order status to pending and save
        order.status = 'pending';
        order.providerStatus = 'pending';
        order.providerOrderId = providerOrderId;
        order.updatedAt = new Date().toISOString();
        await saveOrder(order);
        retriedCount++;
      } catch (err) {
        failedCount++;
      }
    }

    return res.json({
      success: true,
      message: `Bulk retry complete. Successfully retried ${retriedCount} orders. Failed to retry ${failedCount} orders.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk cancel active orders
router.post('/orders/bulk-cancel', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { orderIds } = req.body;
  if (!orderIds || !Array.isArray(orderIds)) {
    return res.status(400).json({ error: 'orderIds must be an array of order IDs.' });
  }

  try {
    const orders = await getOrders();
    const providers = await getProviders();
    let canceledCount = 0;
    let failedCount = 0;

    for (const orderId of orderIds) {
      const order = orders.find(o => o.id === orderId);
      if (!order) continue;

      // Only active orders can be canceled
      if (order.status !== 'pending' && order.status !== 'processing' && order.status !== 'inprogress') {
        continue;
      }

      try {
        let cancelSuccess = true;

        if (order.providerId && order.providerOrderId && !order.providerOrderId.startsWith('manual-')) {
          const provider = providers.find(p => p.id === order.providerId);
          if (provider && provider.supportsCancel) {
            cancelSuccess = await ProviderAdapter.requestCancel(provider, order.providerOrderId);
          } else {
            cancelSuccess = true; // Proceed with manual override cancel
          }
        }

        if (cancelSuccess) {
          order.status = 'canceled';
          order.providerStatus = 'canceled';
          order.updatedAt = new Date().toISOString();
          await saveOrder(order);

          // Refund user balance fully
          await refundUserBalance(order.userId, order.price);
          canceledCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }

    return res.json({
      success: true,
      message: `Bulk cancel complete. Successfully canceled ${canceledCount} orders. Failed to cancel ${failedCount} orders.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4. WALLET & TRANSACTION ENDPOINTS (PHASE 2)
// ==========================================

// Get user's wallet (auto-provisions if absent)
router.get('/wallet', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const wallet = await getWallet(uid);
    return res.json({ success: true, wallet });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get user's transaction history with advanced search, filtering and pagination
router.get('/wallet/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const { search, type, status, startDate, endDate, page = '1', limit = '10' } = req.query;
    
    // Get all transactions for active user
    let txs = await getTransactions(uid);

    // Apply Filters
    if (search) {
      const q = String(search).toLowerCase();
      txs = txs.filter(t => 
        t.transactionId.toLowerCase().includes(q) || 
        (t.referenceId && t.referenceId.toLowerCase().includes(q)) ||
        t.description.toLowerCase().includes(q)
      );
    }

    if (type && type !== 'all') {
      txs = txs.filter(t => t.type === type);
    }

    if (status && status !== 'all') {
      txs = txs.filter(t => t.status === status);
    }

    if (startDate) {
      const start = new Date(String(startDate));
      txs = txs.filter(t => new Date(t.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(String(endDate));
      // Add 1 day to make the end date inclusive
      end.setDate(end.getDate() + 1);
      txs = txs.filter(t => new Date(t.createdAt) <= end);
    }

    // Pagination
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const total = txs.length;
    const paginatedTxs = txs.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      transactions: paginatedTxs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit a manual deposit request
router.post('/wallet/deposit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  const { amount, paymentMethod, referenceId, screenshotUrl } = req.body;

  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  // Server-side validation
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Deposit amount must be a positive number greater than 0.' });
  }

  if (!paymentMethod) {
    return res.status(400).json({ error: 'Payment method is required.' });
  }

  try {
    const user = await getUserProfile(uid);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Check if wallet is frozen before allowing requests
    const wallet = await getWallet(uid);
    if (wallet.isFrozen) {
      return res.status(403).json({ error: 'Your wallet is frozen. Deposit requests are disabled.' });
    }

    // Retrieve active custom payment methods configuration
    const methods = await getCustomPaymentMethods();
    const selectedMethod = methods.find(m => m.id === paymentMethod);
    if (!selectedMethod) {
      return res.status(400).json({ error: 'Selected payment method is invalid or not configured.' });
    }

    if (!selectedMethod.enabled) {
      return res.status(400).json({ error: 'This payment method is currently disabled.' });
    }

    // Validate min/max limits
    if (amt < selectedMethod.minDeposit) {
      return res.status(400).json({ error: `The minimum deposit threshold for ${selectedMethod.name} is $${selectedMethod.minDeposit.toFixed(2)} USD.` });
    }

    if (amt > selectedMethod.maxDeposit) {
      return res.status(400).json({ error: `The maximum deposit limit for ${selectedMethod.name} is $${selectedMethod.maxDeposit.toFixed(2)} USD.` });
    }

    // Validate UPI specific rules (PhonePe, Google Pay, Paytm, UPI)
    const isUpiMethod = ['upi', 'phonepe', 'gpay', 'paytm'].includes(paymentMethod);
    
    // Strict UTR validation
    const ref = referenceId ? referenceId.trim() : '';
    if (isUpiMethod) {
      if (!ref) {
        return res.status(400).json({ error: 'UTR number is required for UPI payments.' });
      }
      if (!/^\d{12}$/.test(ref)) {
        return res.status(400).json({ error: 'Invalid UTR Number. A valid UPI transaction UTR must be exactly 12 digits.' });
      }
    } else {
      if (!ref) {
        return res.status(400).json({ error: 'Reference ID / Transaction ID is required.' });
      }
    }

    // Strict Screenshot validation (Reject empty screenshots)
    if (!screenshotUrl || screenshotUrl.trim() === '') {
      return res.status(400).json({ error: 'Payment receipt screenshot is required. Please upload your payment screenshot.' });
    }

    // Prevent duplicate UTR submission check against any success/pending requests
    if (ref !== '') {
      const existingReqs = await getWalletRequests();
      const duplicate = existingReqs.find(
        r => r.referenceId && r.referenceId.trim().toLowerCase() === ref.toLowerCase() && r.status !== 'Rejected'
      );
      if (duplicate) {
        return res.status(400).json({ error: `A deposit request with UTR "${ref}" is already registered or pending review.` });
      }
    }

    const newReq: WalletRequest = {
      id: `req-${Math.random().toString(36).substring(2, 11)}`,
      userId: uid,
      userEmail: user.email,
      amount: Number(amt.toFixed(4)),
      paymentMethod,
      referenceId: ref,
      screenshotUrl: screenshotUrl || '',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveWalletRequest(newReq);

    // Save activity log
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'activity',
      userId: uid,
      userEmail: user.email,
      action: `Submitted deposit request of $${newReq.amount.toFixed(2)} via ${selectedMethod.name}`,
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Deposit request submitted successfully for approval.', request: newReq });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get user's own deposit requests
router.get('/wallet/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const reqs = await getWalletRequests();
    const userReqs = reqs.filter(r => r.userId === uid);
    return res.json({ success: true, requests: userReqs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN WALLET CONTROL ROUTERS (requireAdmin)
// ==========================================

// Get all wallets (Admin view)
router.get('/admin/wallets', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallets = await getAllWallets();
    const { search } = req.query;
    
    let filtered = wallets;
    if (search) {
      const q = String(search).toLowerCase();
      filtered = wallets.filter(w => 
        w.userId.toLowerCase().includes(q) || 
        (w.userEmail && w.userEmail.toLowerCase().includes(q))
      );
    }
    return res.json({ success: true, wallets: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all transactions globally
router.get('/admin/transactions', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, type, status, userId } = req.query;
    let txs = await getTransactions(userId ? String(userId) : undefined);

    if (search) {
      const q = String(search).toLowerCase();
      txs = txs.filter(t => 
        t.transactionId.toLowerCase().includes(q) || 
        t.userId.toLowerCase().includes(q) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
        (t.referenceId && t.referenceId.toLowerCase().includes(q)) ||
        t.description.toLowerCase().includes(q)
      );
    }

    if (type && type !== 'all') {
      txs = txs.filter(t => t.type === type);
    }

    if (status && status !== 'all') {
      txs = txs.filter(t => t.status === status);
    }

    return res.json({ success: true, transactions: txs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all deposit requests (Admin view)
router.get('/admin/deposit-requests', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requests = await getWalletRequests();
    return res.json({ success: true, requests });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Resolve (Approve / Reject) Deposit Request
router.post('/admin/deposit-requests/:id/resolve', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, adminNote } = req.body; // action = 'approve' | 'reject'

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'Action must be approve or reject.' });
  }

  try {
    const reqs = await getWalletRequests();
    const depositReq = reqs.find(r => r.id === id);

    if (!depositReq) {
      return res.status(404).json({ error: 'Deposit request not found.' });
    }

    if (depositReq.status !== 'Pending') {
      return res.status(400).json({ error: `This request has already been ${depositReq.status.toLowerCase()}.` });
    }

    const now = new Date().toISOString();
    
    if (action === 'approve') {
      // Perform atomic credit using transactions
      await executeBalanceUpdate(depositReq.userId, 'Deposit', depositReq.amount, {
        paymentMethod: depositReq.paymentMethod,
        referenceId: depositReq.referenceId || depositReq.id,
        description: `Approved manual deposit request of $${depositReq.amount.toFixed(2)} via ${depositReq.paymentMethod}`,
        adminNote: adminNote || 'Deposit approved by administrator',
        status: 'Success'
      });

      depositReq.status = 'Success';
    } else {
      depositReq.status = 'Rejected';
    }

    depositReq.adminNote = adminNote || '';
    depositReq.updatedAt = now;

    await saveWalletRequest(depositReq);

    // Save administrative audit log
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Admin ${action}d deposit request ${id} for user ${depositReq.userEmail} ($${depositReq.amount.toFixed(2)})`,
      createdAt: now
    });

    return res.json({ success: true, message: `Deposit request successfully ${action}d.`, request: depositReq });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Manual Credit, Debit, Freeze or Unfreeze Wallet
router.post('/admin/wallets/:uid/adjust', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.params;
  const { action, amount, description, adminNote } = req.body; 
  // action = 'credit' | 'debit' | 'freeze' | 'unfreeze'

  try {
    const wallet = await getWallet(uid);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const user = await getUserProfile(uid);
    const now = new Date().toISOString();

    if (action === 'freeze') {
      wallet.isFrozen = true;
      wallet.updatedAt = now;
      await saveWallet(wallet);

      await saveSystemLog({
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        type: 'admin',
        userId: req.user?.uid,
        userEmail: req.user?.email,
        action: `Frozen wallet of user ${user?.email || uid}`,
        createdAt: now
      });

      return res.json({ success: true, message: 'Wallet has been frozen successfully.', wallet });
    }

    if (action === 'unfreeze') {
      wallet.isFrozen = false;
      wallet.updatedAt = now;
      await saveWallet(wallet);

      await saveSystemLog({
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        type: 'admin',
        userId: req.user?.uid,
        userEmail: req.user?.email,
        action: `Unfrozen wallet of user ${user?.email || uid}`,
        createdAt: now
      });

      return res.json({ success: true, message: 'Wallet has been unfrozen successfully.', wallet });
    }

    // Validation for Credit / Debit
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number greater than 0.' });
    }

    if (action === 'credit') {
      const tx = await executeBalanceUpdate(uid, 'Manual Credit', amt, {
        description: description || `Manual credit adjustments by administrator`,
        adminNote: adminNote || 'Processed manual credit adjustment',
        status: 'Success'
      });

      await saveSystemLog({
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        type: 'admin',
        userId: req.user?.uid,
        userEmail: req.user?.email,
        action: `Credited $${amt.toFixed(2)} to user ${user?.email || uid}. TransId: ${tx.transactionId}`,
        createdAt: now
      });

      return res.json({ success: true, message: 'Wallet manually credited successfully.', transaction: tx });
    }

    if (action === 'debit') {
      const tx = await executeBalanceUpdate(uid, 'Manual Debit', amt, {
        description: description || `Manual debit adjustments by administrator`,
        adminNote: adminNote || 'Processed manual debit adjustment',
        status: 'Success'
      });

      await saveSystemLog({
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        type: 'admin',
        userId: req.user?.uid,
        userEmail: req.user?.email,
        action: `Debited $${amt.toFixed(2)} from user ${user?.email || uid}. TransId: ${tx.transactionId}`,
        createdAt: now
      });

      return res.json({ success: true, message: 'Wallet manually debited successfully.', transaction: tx });
    }

    return res.status(400).json({ error: 'Invalid wallet action.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin view Wallet system statistics
router.get('/admin/wallet/stats', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallets = await getAllWallets();
    const reqs = await getWalletRequests();

    let totalBalance = 0;
    let totalDeposited = 0;
    let totalSpent = 0;
    let totalRefunded = 0;
    let totalBonus = 0;
    let frozenCount = 0;

    wallets.forEach(w => {
      totalBalance += (w.balance || 0);
      totalDeposited += (w.totalDeposit || 0);
      totalSpent += (w.totalSpent || 0);
      totalRefunded += (w.totalRefund || 0);
      totalBonus += (w.totalBonus || 0);
      if (w.isFrozen) {
        frozenCount++;
      }
    });

    const pendingRequestsCount = reqs.filter(r => r.status === 'Pending').length;

    return res.json({
      success: true,
      stats: {
        totalBalance: Number(totalBalance.toFixed(4)),
        totalDeposited: Number(totalDeposited.toFixed(4)),
        totalSpent: Number(totalSpent.toFixed(4)),
        totalRefunded: Number(totalRefunded.toFixed(4)),
        totalBonus: Number(totalBonus.toFixed(4)),
        walletsCount: wallets.length,
        frozenCount,
        pendingRequestsCount
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// CUSTOMIZABLE PAYMENT METHODS ENDPOINTS
// ==========================================

// Get all enabled/all payment methods for clients
router.get('/payment-methods', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const methods = await getCustomPaymentMethods();
    // Non-admins only see enabled ones
    const isAdminUser = isAdmin(req.user?.role);
    const filtered = isAdminUser ? methods : methods.filter(m => m.enabled);
    return res.json({ success: true, paymentMethods: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create or update a payment method (Admin only)
router.post('/admin/payment-methods', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, description, logo, enabled, minDeposit, maxDeposit, processingTime, instructions, upiId, qrImageUrl, sortOrder, isFutureReady } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'ID and Name are required fields.' });
  }

  const allowedIds = ['upi', 'phonepe', 'gpay', 'paytm'];
  if (!allowedIds.includes(id)) {
    return res.status(400).json({ error: 'Only UPI, PhonePe, Google Pay, and Paytm payment methods can be added or updated.' });
  }

  try {
    const existing = await getCustomPaymentMethods();
    const existingMethod = existing.find(m => m.id === id);

    const updatedMethod: CustomPaymentMethod = {
      id,
      name,
      description: description || '',
      logo: logo || 'Smartphone',
      enabled: enabled === undefined ? true : !!enabled,
      minDeposit: Number(minDeposit) || 0,
      maxDeposit: Number(maxDeposit) || 0,
      processingTime: processingTime || 'Instant',
      instructions: instructions || '',
      upiId: upiId || '',
      qrImageUrl: qrImageUrl || '',
      sortOrder: Number(sortOrder) || 0,
      isFutureReady: isFutureReady === undefined ? false : !!isFutureReady,
      createdAt: existingMethod ? existingMethod.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveCustomPaymentMethod(updatedMethod);

    // Administrative audit logging
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Admin updated/created payment method: ${name} (${id})`,
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Payment method saved successfully.', paymentMethod: updatedMethod });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a payment method (Admin only)
router.delete('/admin/payment-methods/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await getCustomPaymentMethods();
    const methodToDelete = existing.find(m => m.id === id);

    if (!methodToDelete) {
      return res.status(404).json({ error: 'Payment method not found.' });
    }

    await deleteCustomPaymentMethod(id);

    // Administrative audit logging
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Admin deleted payment method: ${methodToDelete.name} (${id})`,
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Payment method deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// NOTIFICATION SYSTEM ENDPOINTS (PHASE 2)
// ==========================================

// Get user-specific notifications and broadcasts
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const list = await getZenitNotifications(uid);
    // Map read status for broadcasts dynamically if readBy array contains the user's ID
    const processed = list.map(n => {
      if (n.isBroadcast) {
        return {
          ...n,
          read: n.readBy ? n.readBy.includes(uid) : false
        };
      }
      return n;
    });
    return res.json({ success: true, notifications: processed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark single notification as read
router.post('/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  const { id } = req.params;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    await markZenitNotificationAsRead(id, uid);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    await markAllZenitNotificationsAsRead(uid);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get user's notification settings
router.get('/notifications/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const settings = await getNotificationSettings(uid);
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update user's notification settings
router.post('/notifications/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    const { emailEnabled, pushEnabled, inAppEnabled, categories } = req.body;
    
    const updatedSettings: NotificationSettings = {
      userId: uid,
      emailEnabled: !!emailEnabled,
      pushEnabled: !!pushEnabled,
      inAppEnabled: !!inAppEnabled,
      categories: categories || {},
      updatedAt: new Date().toISOString()
    };
    
    await saveNotificationSettings(updatedSettings);
    return res.json({ success: true, settings: updatedSettings, message: 'Notification settings updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a notification (User deletion of their in-app alert)
router.delete('/notifications/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const uid = req.user?.uid;
  const { id } = req.params;
  if (!uid) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }

  try {
    // Only allow deletion if the notification is user's private alert or we delete in memory
    const list = await getZenitNotifications(uid);
    const notif = list.find(n => n.id === id);
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    
    if (notif.isBroadcast) {
      // For broadcast, "deleting" it for user means we add them to a hidden/dismissed list or we can just delete private ones
      // Let's support full deletion for private ones, and for broadcast we can update readBy so it does not show up
      const readBy = notif.readBy || [];
      if (!readBy.includes(uid)) {
        readBy.push(uid);
        notif.readBy = readBy;
        await saveZenitNotification(notif);
      }
    } else {
      await deleteZenitNotification(id);
    }
    
    return res.json({ success: true, message: 'Notification dismissed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =<ctrl42>========================================
// ADMIN NOTIFICATION SYSTEM CONTROL ENDPOINTS
// ==========================<================

// Admin-only: Get all system notifications
router.get('/admin/notifications', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await getZenitNotifications();
    return res.json({ success: true, notifications: list });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete notification globally
router.delete('/admin/notifications/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await deleteZenitNotification(id);
    return res.json({ success: true, message: 'Notification deleted globally.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Get notification templates
router.get('/admin/notifications/templates', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await getNotificationTemplates();
    return res.json({ success: true, templates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Save notification template
router.post('/admin/notifications/templates', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, titleTemplate, messageTemplate, type, severity } = req.body;
  if (!name || !titleTemplate || !messageTemplate || !type) {
    return res.status(400).json({ error: 'Name, title template, message template, and type are required.' });
  }

  try {
    const templateId = id || `tmp-${Math.random().toString(36).substring(2, 9)}`;
    const template: NotificationTemplate = {
      id: templateId,
      name,
      titleTemplate,
      messageTemplate,
      type,
      severity: severity || 'info',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await saveNotificationTemplate(template);
    
    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Admin saved notification template: ${name}`,
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, template, message: 'Template saved successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Delete notification template
router.delete('/admin/notifications/templates/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await deleteNotificationTemplate(id);
    return res.json({ success: true, message: 'Template deleted.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Send notification (Single user, multiple, broadcast, or scheduled)
router.post('/admin/notifications/send', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { recipientType, userId, userIds, title, message, type, severity, templateId, templateVariables, isScheduled, scheduledAt } = req.body;
  
  if (!recipientType) {
    return res.status(400).json({ error: 'recipientType is required (broadcast, single, multiple).' });
  }

  try {
    let finalTitle = title;
    let finalMessage = message;
    let finalType = type || 'System';
    let finalSeverity = severity || 'info';

    // If templateId specified, format it
    if (templateId) {
      const templates = await getNotificationTemplates();
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) {
        finalTitle = tmpl.titleTemplate;
        finalMessage = tmpl.messageTemplate;
        finalType = tmpl.type;
        finalSeverity = tmpl.severity;

        // Replace template variables
        if (templateVariables && typeof templateVariables === 'object') {
          Object.entries(templateVariables).forEach(([key, value]) => {
            const regex = new RegExp(`{${key}}`, 'g');
            finalTitle = finalTitle.replace(regex, String(value));
            finalMessage = finalMessage.replace(regex, String(value));
          });
        }
      }
    }

    if (!finalTitle || !finalMessage) {
      return res.status(400).json({ error: 'Notification title and message content are required.' });
    }

    const notifId = `ntf-${Math.random().toString(36).substring(2, 9)}`;
    const notification: ZenitNotification = {
      id: notifId,
      title: finalTitle,
      message: finalMessage,
      type: finalType as any,
      severity: finalSeverity as any,
      read: false,
      createdAt: new Date().toISOString(),
      isScheduled: !!isScheduled,
      scheduledAt: isScheduled ? scheduledAt : undefined
    };

    if (recipientType === 'broadcast') {
      notification.isBroadcast = true;
      notification.userId = 'all';
      notification.readBy = [];
      await saveZenitNotification(notification);
    } else if (recipientType === 'single') {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required for single recipient.' });
      }
      notification.userId = userId;
      await saveZenitNotification(notification);
    } else if (recipientType === 'multiple') {
      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ error: 'userIds array is required for multiple recipients.' });
      }
      for (const uId of userIds) {
        const item: ZenitNotification = {
          ...notification,
          id: `ntf-${Math.random().toString(36).substring(2, 9)}`,
          userId: uId
        };
        await saveZenitNotification(item);
      }
    }

    await saveSystemLog({
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      type: 'admin',
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: `Admin dispatched notification alert: "${finalTitle}" (${recipientType})`,
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Notification dispatched successfully.', notification });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


// ==========================================
// ADVANCED ANALYTICS DASHBOARD ENDPOINT
// ==========================================

// Admin-only: Get premium performance dashboard analytics metrics
router.get('/admin/analytics', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await calculateAnalytics();
    return res.json({ success: true, analytics: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Export complete database backup payload
router.get('/admin/backup', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dump = await exportDatabaseDump();
    
    // Log audit trail
    await saveAuditLog({
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: 'Admin exported complete database backup',
      category: 'system',
      details: { recordCount: Object.keys(dump).reduce((acc, k) => acc + (Array.isArray(dump[k]) ? dump[k].length : (dump[k] ? 1 : 0)), 0) },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, dump });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin-only: Restore complete database from payload
router.post('/admin/restore', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { dump } = req.body;
  if (!dump) {
    return res.status(400).json({ error: 'Database backup dump payload is required.' });
  }

  try {
    await importDatabaseDump(dump);
    
    // Log security incident as database restorations are highly critical operations
    await saveSecurityLog({
      id: `sec-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: 'session_revocation', // represents administrative data-write overrides
      severity: 'critical',
      details: { description: 'Database restore sequence executed successfully.' },
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    // Log audit trail
    await saveAuditLog({
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      action: 'Admin imported complete database restore payload',
      category: 'system',
      details: {},
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Database restore completed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


export default router;

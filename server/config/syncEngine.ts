import { Provider, Service, Category, SyncSettings, SyncLog, ProviderHealth } from '../../src/types';
import { 
  getProviders, 
  saveProvider, 
  getServices, 
  saveService, 
  getCategories, 
  saveCategory, 
  getSyncSettings, 
  saveSyncSettings, 
  getSyncLogs, 
  saveSyncLog, 
  getProvidersHealth, 
  saveProviderHealth,
  saveSystemLog,
  saveSystemNotification
} from './store';
import { ProviderAdapter } from './providerAdapter';
import { syncActiveOrders } from './orderSync';

// Simple Cache Store for Services and Categories
export class SimpleCache {
  private static servicesCache: Service[] | null = null;
  private static categoriesCache: Category[] | null = null;
  private static cacheExpiry = 0;
  private static TTL = 300000; // 5 minutes cache TTL

  public static getServices(): Service[] | null {
    if (this.servicesCache && Date.now() < this.cacheExpiry) {
      return this.servicesCache;
    }
    return null;
  }

  public static getCategories(): Category[] | null {
    if (this.categoriesCache && Date.now() < this.cacheExpiry) {
      return this.categoriesCache;
    }
    return null;
  }

  public static set(services: Service[], categories: Category[]) {
    this.servicesCache = services;
    this.categoriesCache = categories;
    this.cacheExpiry = Date.now() + this.TTL;
  }

  public static invalidate() {
    this.servicesCache = null;
    this.categoriesCache = null;
    this.cacheExpiry = 0;
    console.log('[Cache] Services and Categories cache invalidated');
  }
}

// Concurrency mutex locks for each provider to prevent overlapping sync runs
const syncLocks: Record<string, boolean> = {};

/**
 * Main Sync Engine
 */
export class SyncEngine {

  /**
   * Run synchronization catalog manually or automatically for a specific provider.
   */
  public static async syncProviderCatalog(
    providerId: string, 
    triggerType: 'manual' | 'automatic'
  ): Promise<SyncLog> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const syncId = `sync-log-${startTime}-${Math.floor(Math.random() * 1000)}`;

    const providers = await getProviders();
    const provider = providers.find(p => p.id === providerId);

    if (!provider) {
      throw new Error(`Provider with ID ${providerId} not found.`);
    }

    // Check concurrency mutex lock
    if (syncLocks[providerId]) {
      throw new Error(`A synchronization job is already running for SMM Provider [${provider.name}].`);
    }
    syncLocks[providerId] = true;

    let importedCount = 0;
    let updatedCount = 0;
    let disabledCount = 0;
    const errors: string[] = [];
    let status: 'success' | 'partial_success' | 'failed' = 'success';

    try {
      // 1. Fetch settings
      const settings = await getSyncSettings();

      // 2. Fetch remote services via adapter
      let remoteServices: any[] = [];
      const latencyStart = Date.now();
      try {
        remoteServices = await ProviderAdapter.getServices(provider);
      } catch (err: any) {
        errors.push(`Failed to download services catalog: ${err.message}`);
        await this.recordHealthFailure(provider, err.message, Date.now() - latencyStart);
        throw err;
      }
      const responseTime = Date.now() - latencyStart;
      await this.recordHealthSuccess(provider, responseTime);

      // Validate provider response
      if (!Array.isArray(remoteServices)) {
        throw new Error('Provider response validation failed: response is not an array.');
      }

      // Check schema validity of first few services
      if (remoteServices.length > 0) {
        const first = remoteServices[0];
        if (!first.service || !first.name || first.rate === undefined) {
          throw new Error('Provider response validation failed: missing key attributes (service, name, rate).');
        }
      }

      // 3. Fetch existing categories and services
      const localCategories = await getCategories();
      const localServices = await getServices();

      // Build quick lookup map of local category names (lowercase) -> ID
      const localCatMap: Record<string, Category> = {};
      localCategories.forEach(c => {
        localCatMap[c.name.toLowerCase()] = c;
      });

      const activeRemoteServiceIds = new Set<string>();

      // 4. Process each SMM service
      for (const rSrv of remoteServices) {
        const remoteSrvId = String(rSrv.service);
        activeRemoteServiceIds.add(remoteSrvId);

        const rCategoryName = rSrv.category || 'General Services';
        const rCategoryLower = rCategoryName.toLowerCase();

        // Evaluate Category Mapping
        let finalCategoryId = 'cat-1';
        let finalCategoryName = rCategoryName;
        let isHiddenByCategory = false;

        const mapping = settings.categoryMappings.find(
          m => m.providerCategory.toLowerCase() === rCategoryLower
        );

        if (mapping) {
          if (mapping.hidden) {
            isHiddenByCategory = true;
          }
          if (mapping.mappedCategoryId) {
            finalCategoryId = mapping.mappedCategoryId;
            const mappedCat = localCategories.find(c => c.id === finalCategoryId);
            if (mappedCat) {
              finalCategoryName = mappedCat.name;
            }
          } else if (mapping.mappedCategoryName) {
            finalCategoryName = mapping.mappedCategoryName;
            const existingCat = localCatMap[finalCategoryName.toLowerCase()];
            if (existingCat) {
              finalCategoryId = existingCat.id;
            } else {
              // Create dynamic category for merged name
              const newCatId = `cat-sync-${Math.random().toString(36).substring(2, 7)}`;
              const newCat: Category = {
                id: newCatId,
                name: finalCategoryName,
                icon: 'Sliders',
                description: `Auto-merged category during sync: ${finalCategoryName}`,
                sortOrder: localCategories.length + 1,
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await saveCategory(newCat);
              localCategories.push(newCat);
              localCatMap[finalCategoryName.toLowerCase()] = newCat;
              finalCategoryId = newCatId;
            }
          }
        } else {
          // Auto-map category if no mapping exists
          const existingCat = localCatMap[rCategoryLower];
          if (existingCat) {
            finalCategoryId = existingCat.id;
            finalCategoryName = existingCat.name;
          } else {
            // Create a new local category
            const newCatId = `cat-sync-${Math.random().toString(36).substring(2, 7)}`;
            const newCat: Category = {
              id: newCatId,
              name: rCategoryName,
              icon: 'Sliders',
              description: `Auto-generated category from sync for ${rCategoryName}`,
              sortOrder: localCategories.length + 1,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await saveCategory(newCat);
            localCategories.push(newCat);
            localCatMap[rCategoryLower] = newCat;
            finalCategoryId = newCatId;
          }
        }

        // Pricing Management Engine
        const providerCost = parseFloat(rSrv.rate || '0');
        let calculatedPrice = 0;

        // Check if manual override exists and is enabled
        const existingSrv = localServices.find(
          s => s.providerId === providerId && s.providerServiceId === remoteSrvId
        );
        const serviceIdToUse = existingSrv ? existingSrv.id : `srv-sync-temp-${remoteSrvId}`;
        const manualOverride = settings.manualOverrides[serviceIdToUse] || settings.manualOverrides[remoteSrvId];

        if (manualOverride && manualOverride.enabled) {
          calculatedPrice = manualOverride.price;
        } else {
          // Selling price = Cost + Cost * (Global% + Category% + Service%) + FixedProfit
          const globalProfitPercent = settings.globalProfitPercent || 0;
          const categoryProfitPercent = settings.categoryProfitPercent[finalCategoryId] || 0;
          const serviceProfitPercent = settings.serviceProfitPercent[serviceIdToUse] || 0;

          const totalPercentMarkup = (globalProfitPercent + categoryProfitPercent + serviceProfitPercent) / 100;
          const percentageMarkupValue = providerCost * totalPercentMarkup;
          const fixedProfitValue = settings.fixedProfit || 0;

          let finalCalculated = providerCost + percentageMarkupValue + fixedProfitValue;

          // Enforce minimum profit
          const currentProfit = finalCalculated - providerCost;
          if (currentProfit < settings.minimumProfit) {
            finalCalculated = providerCost + settings.minimumProfit;
          }

          // Enforce min & max price bounds
          if (finalCalculated < settings.minPrice) {
            finalCalculated = settings.minPrice;
          }
          if (finalCalculated > settings.maxPrice) {
            finalCalculated = settings.maxPrice;
          }

          calculatedPrice = Number(finalCalculated.toFixed(4));
        }

        // Decide status and visibility
        let finalStatus = settings.defaultStatus || 'active';
        if (isHiddenByCategory) {
          finalStatus = 'disabled';
        }

        // Create or update local service
        if (existingSrv) {
          const updatedSrv: Service = {
            ...existingSrv,
            name: rSrv.name || existingSrv.name,
            categoryId: finalCategoryId,
            category: finalCategoryName,
            price: calculatedPrice,
            ratePerThousand: calculatedPrice,
            min: parseInt(rSrv.min || '10', 10),
            minQuantity: parseInt(rSrv.min || '10', 10),
            max: parseInt(rSrv.max || '10000', 10),
            maxQuantity: parseInt(rSrv.max || '10000', 10),
            description: rSrv.desc || existingSrv.description,
            dripfeed: rSrv.dripfeed ? true : existingSrv.dripfeed,
            refill: rSrv.refill ? true : existingSrv.refill,
            cancel: rSrv.cancel ? true : existingSrv.cancel,
            status: finalStatus as any,
            updatedAt: new Date().toISOString()
          };
          await saveService(updatedSrv);
          updatedCount++;
        } else {
          const newSrvId = `srv-sync-${Math.random().toString(36).substring(2, 7)}`;
          const newSrv: Service = {
            id: newSrvId,
            categoryId: finalCategoryId,
            category: finalCategoryName,
            providerId,
            providerServiceId: remoteSrvId,
            name: rSrv.name,
            description: rSrv.desc || `SMM package synced from ${provider.name}`,
            price: calculatedPrice,
            ratePerThousand: calculatedPrice,
            min: parseInt(rSrv.min || '10', 10),
            minQuantity: parseInt(rSrv.min || '10', 10),
            max: parseInt(rSrv.max || '10000', 10),
            maxQuantity: parseInt(rSrv.max || '10000', 10),
            averageTime: 'Instant',
            dripfeed: rSrv.dripfeed ? true : false,
            refill: rSrv.refill ? true : false,
            cancel: rSrv.cancel ? true : false,
            status: finalStatus as any,
            sortOrder: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await saveService(newSrv);
          importedCount++;
        }
      }

      // 5. Disable removed services
      const currentLocalServices = await getServices();
      for (const localSrv of currentLocalServices) {
        if (
          localSrv.providerId === providerId &&
          localSrv.providerServiceId &&
          !activeRemoteServiceIds.has(localSrv.providerServiceId)
        ) {
          if (localSrv.status !== 'disabled') {
            localSrv.status = 'disabled';
            localSrv.updatedAt = new Date().toISOString();
            await saveService(localSrv);
            disabledCount++;
          }
        }
      }

      // 6. Update provider lastSync
      provider.lastSync = new Date().toISOString();
      provider.updatedAt = new Date().toISOString();
      await saveProvider(provider);

      // Invalidate the cache
      SimpleCache.invalidate();

    } catch (err: any) {
      status = 'failed';
      errors.push(err.message || String(err));
    } finally {
      delete syncLocks[providerId];
    }

    if (errors.length > 0 && importedCount + updatedCount > 0) {
      status = 'partial_success';
    }

    const durationMs = Date.now() - startTime;
    const finishedAt = new Date().toISOString();

    const syncLog: SyncLog = {
      id: syncId,
      providerId,
      providerName: provider.name,
      startedAt,
      finishedAt,
      durationMs,
      importedCount,
      updatedCount,
      disabledCount,
      errors,
      status,
      triggerType
    };

    await saveSyncLog(syncLog);

    await saveSystemLog({
      id: `log-synctrigger-${Date.now()}`,
      type: status === 'failed' ? 'error' : 'admin',
      action: `Catalog sync trigger finished [${provider.name}]. Status: ${status}. Imported: ${importedCount}, Updated: ${updatedCount}, Disabled: ${disabledCount}`,
      createdAt: finishedAt
    });

    return syncLog;
  }

  /**
   * Run background health check on a provider
   */
  public static async checkProviderHealth(provider: Provider): Promise<ProviderHealth> {
    const start = Date.now();
    let isOnline = false;
    let responseTimeMs = 0;
    let errorMessage: string | null = null;

    try {
      const balanceData = await ProviderAdapter.getBalance(provider);
      responseTimeMs = Date.now() - start;
      isOnline = true;

      // Update provider balance and successes
      provider.lastHealthCheck = new Date().toISOString();
      await saveProvider(provider);
      await this.recordHealthSuccess(provider, responseTimeMs);

      // Trigger low-balance notification if needed
      if (balanceData.balance < 10) {
        await saveSystemNotification({
          id: `notif-balance-${provider.id}-${Date.now()}`,
          title: `Low API Balance: ${provider.name}`,
          message: `SMM Provider "${provider.name}" is critically low on credits. Current balance: $${balanceData.balance.toFixed(2)} ${balanceData.currency}. Please top-up.`,
          read: false,
          type: 'warning',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      responseTimeMs = Date.now() - start;
      errorMessage = err.message || 'Connection Timeout';
      await this.recordHealthFailure(provider, errorMessage, responseTimeMs);
    }

    const healthList = await getProvidersHealth();
    const existing = healthList.find(h => h.providerId === provider.id);

    const todayDateStr = new Date().toISOString().split('T')[0];

    let apiLatencyHistory = existing?.apiLatencyHistory || [];
    apiLatencyHistory.push(responseTimeMs);
    if (apiLatencyHistory.length > 10) {
      apiLatencyHistory.shift();
    }

    let dailyStats = existing?.dailyStats || [];
    let todayStat = dailyStats.find(s => s.date === todayDateStr);
    if (!todayStat) {
      todayStat = { date: todayDateStr, requests: 0, failures: 0, avgLatency: 0 };
      dailyStats.push(todayStat);
    }

    todayStat.requests += 1;
    if (!isOnline) {
      todayStat.failures += 1;
    }
    todayStat.avgLatency = Math.round(
      (todayStat.avgLatency * (todayStat.requests - 1) + responseTimeMs) / todayStat.requests
    );

    // Limit dailyStats to last 15 days
    if (dailyStats.length > 15) {
      dailyStats.shift();
    }

    const totalRequests = dailyStats.reduce((acc, s) => acc + s.requests, 0) || 1;
    const totalFailures = dailyStats.reduce((acc, s) => acc + s.failures, 0);
    const successRate = Math.round(((totalRequests - totalFailures) / totalRequests) * 100);
    const failureRate = 100 - successRate;

    const health: ProviderHealth = {
      providerId: provider.id,
      providerName: provider.name,
      isOnline,
      responseTimeMs,
      lastSuccessAt: isOnline ? new Date().toISOString() : (existing?.lastSuccessAt || null),
      lastFailAt: !isOnline ? new Date().toISOString() : (existing?.lastFailAt || null),
      successRate,
      failureRate,
      apiLatencyHistory,
      dailyStats,
      lastErrorMessage: errorMessage
    };

    await saveProviderHealth(health);
    return health;
  }

  private static async recordHealthSuccess(provider: Provider, latency: number) {
    provider.successCount = (provider.successCount || 0) + 1;
    provider.lastHealthCheck = new Date().toISOString();
    provider.lastSuccessRequest = `Ping Latency: ${latency}ms`;
    provider.updatedAt = new Date().toISOString();
    await saveProvider(provider);
  }

  private static async recordHealthFailure(provider: Provider, err: string, latency: number) {
    provider.failedCount = (provider.failedCount || 0) + 1;
    provider.lastHealthCheck = new Date().toISOString();
    provider.lastError = `Ping Fault: ${err} (${latency}ms)`;
    provider.updatedAt = new Date().toISOString();
    await saveProvider(provider);
  }
}

/**
 * Background Scheduler Manager for scheduled jobs
 */
export class SyncScheduler {
  private static timerId: NodeJS.Timeout | null = null;
  private static healthCheckCounter = 0;
  private static isRunningJob = false;

  public static startScheduler() {
    if (this.timerId) return;

    console.log('⏰ SMM Auto Sync Scheduler engine active.');

    // Run every minute
    this.timerId = setInterval(async () => {
      if (this.isRunningJob) return;
      this.isRunningJob = true;

      try {
        const settings = await getSyncSettings();
        const providers = await getProviders();
        const now = Date.now();

        // 1. Order Status Refresh & Failed Request Retry (every 1 minute)
        try {
          const stats = await syncActiveOrders();
          if (stats.processed > 0) {
            console.log(`[Scheduler] Auto Order Status sync: Processed ${stats.processed}, Updated ${stats.updated}`);
          }
        } catch (err: any) {
          console.error('[Scheduler] Order Status sync failed:', err.message);
        }

        // 2. Automatic Catalog Sync (Service Sync)
        if (settings.autoSync) {
          for (const prov of providers) {
            if (prov.status !== 'active') continue;

            const lastSyncTime = prov.lastSync ? new Date(prov.lastSync).getTime() : 0;
            const minutesSinceLastSync = (now - lastSyncTime) / 60000;

            if (minutesSinceLastSync >= settings.syncInterval) {
              console.log(`[Scheduler] Auto Syncing Catalog for provider "${prov.name}" (due after ${settings.syncInterval}m)...`);
              await SyncEngine.syncProviderCatalog(prov.id, 'automatic').catch(err => {
                console.error(`[Scheduler] Auto Sync failed for provider "${prov.name}":`, err.message);
              });
            }
          }
        }

        // 3. Provider Health Check & Balance Refresh (every 10 minutes)
        this.healthCheckCounter++;
        if (this.healthCheckCounter >= 10) {
          this.healthCheckCounter = 0;
          console.log('[Scheduler] Executing SMM Provider Health Checks and Balance Refresh...');
          for (const prov of providers) {
            await SyncEngine.checkProviderHealth(prov).catch(err => {
              console.error(`[Scheduler] Health check failed for provider "${prov.name}":`, err.message);
            });
          }
        }

      } catch (err: any) {
        console.error('[Scheduler] Critical loop error:', err.message);
      } finally {
        this.isRunningJob = false;
      }
    }, 60000);
  }

  public static stopScheduler() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('⏹️ SMM Auto Sync Scheduler engine suspended.');
    }
  }
}

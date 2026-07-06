import { getOrders, saveOrder, getProviders, saveSystemLog, saveAuditLog } from './store';
import { refundUserBalance } from './walletStore';
import { ProviderAdapter } from './providerAdapter';
import { Order, OrderStatus } from '../../src/types';

let isSyncRunning = false;

/**
 * Maps the raw SMM provider status to our standard OrderStatus
 */
function mapProviderStatus(rawStatus: string): OrderStatus {
  const status = rawStatus.toLowerCase().replace(/[^a-z]/g, '');
  if (status === 'pending') return 'pending';
  if (status === 'processing') return 'processing';
  if (status === 'inprogress' || status === 'in_progress') return 'inprogress';
  if (status === 'completed') return 'completed';
  if (status === 'partial') return 'partial';
  if (status === 'canceled' || status === 'cancelled') return 'canceled';
  if (status === 'refunded') return 'refunded';
  return 'pending';
}

/**
 * Synchronizes all active orders with SMM API providers.
 */
export async function syncActiveOrders(): Promise<{ processed: number; updated: number; failures: number }> {
  if (isSyncRunning) {
    return { processed: 0, updated: 0, failures: 0 };
  }
  isSyncRunning = true;

  let processed = 0;
  let updated = 0;
  let failures = 0;

  try {
    const allOrders = await getOrders();
    // Sync orders in active states
    const activeOrders = allOrders.filter(
      (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'inprogress'
    );

    if (activeOrders.length === 0) {
      isSyncRunning = false;
      return { processed: 0, updated: 0, failures: 0 };
    }

    const providers = await getProviders();

    for (const order of activeOrders) {
      processed++;
      const nowStr = new Date().toISOString();

      // Case 1: Manual / Sandbox simulated orders
      if (!order.providerId || order.providerOrderId?.startsWith('manual-')) {
        // Simulate a smooth state machine progression for manual or sandbox orders
        let nextStatus = order.status;
        const elapsedMinutes = (Date.now() - new Date(order.createdAt).getTime()) / 60000;

        if (order.status === 'pending' && elapsedMinutes > 0.5) {
          nextStatus = 'processing';
        } else if (order.status === 'processing' && elapsedMinutes > 2) {
          nextStatus = 'inprogress';
        } else if (order.status === 'inprogress' && elapsedMinutes > 5) {
          nextStatus = 'completed';
        }

        if (nextStatus !== order.status) {
          order.status = nextStatus;
          order.updatedAt = nowStr;
          if (nextStatus === 'completed') {
            order.remains = 0;
            order.completedAt = nowStr;
          }
          await saveOrder(order);
          updated++;
        }
        continue;
      }

      // Case 2: Integrated SMM provider orders
      const provider = providers.find((p) => p.id === order.providerId);
      if (!provider) {
        // If provider was deleted or is missing, mark as failed and refund
        order.status = 'failed';
        order.lastError = 'SMM Provider configuration missing.';
        order.updatedAt = nowStr;
        await saveOrder(order);
        await refundUserBalance(order.userId, order.price);
        failures++;
        continue;
      }

      try {
        const statusResult = await ProviderAdapter.getOrderStatus(provider, order.providerOrderId || '');
        const targetStatus = mapProviderStatus(statusResult.status);

        // Check if there is any change in the order status or metrics
        const statusChanged = order.status !== targetStatus;
        const metricsChanged = order.remains !== statusResult.remains || order.startCount !== statusResult.startCount;

        if (statusChanged || metricsChanged) {
          const oldStatus = order.status;
          order.status = targetStatus;
          order.providerStatus = statusResult.status;
          order.remains = statusResult.remains >= 0 ? statusResult.remains : 0;
          order.startCount = statusResult.startCount >= 0 ? statusResult.startCount : order.startCount;
          order.updatedAt = nowStr;

          if (targetStatus === 'completed') {
            order.completedAt = nowStr;
            order.remains = 0;
          }

          // Handle Refunds: Canceled, Failed, Refunded, or Partial
          if (targetStatus === 'canceled' || targetStatus === 'failed') {
            // Full refund
            await refundUserBalance(order.userId, order.price);
            await saveSystemLog({
              id: `log-sync-refund-${Date.now()}`,
              type: 'activity',
              userId: order.userId,
              userEmail: order.userEmail,
              action: `Order ${order.id} canceled/failed. Automatically refunded full charge of $${order.price.toFixed(4)} to user balance.`,
              createdAt: nowStr,
            });
            await saveAuditLog({
              id: `audit-sync-refund-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId: order.userId,
              userEmail: order.userEmail,
              action: `Order ${order.id} canceled/failed. Automatically refunded full charge of $${order.price.toFixed(4)} to user balance.`,
              category: 'wallet',
              createdAt: nowStr,
            });
          } else if (targetStatus === 'refunded') {
            // Full refund
            await refundUserBalance(order.userId, order.price);
            await saveSystemLog({
              id: `log-sync-refund-${Date.now()}`,
              type: 'activity',
              userId: order.userId,
              userEmail: order.userEmail,
              action: `Order ${order.id} refunded by provider. Automatically returned $${order.price.toFixed(4)} to user balance.`,
              createdAt: nowStr,
            });
            await saveAuditLog({
              id: `audit-sync-refund-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId: order.userId,
              userEmail: order.userEmail,
              action: `Order ${order.id} refunded by provider. Automatically returned $${order.price.toFixed(4)} to user balance.`,
              category: 'wallet',
              createdAt: nowStr,
            });
          } else if (targetStatus === 'partial') {
            // Partial refund for remaining items
            const remainsRatio = order.remains / order.quantity;
            if (remainsRatio > 0 && remainsRatio <= 1) {
              const refundAmount = Number((order.price * remainsRatio).toFixed(4));
              if (refundAmount > 0) {
                await refundUserBalance(order.userId, refundAmount);
                await saveSystemLog({
                  id: `log-sync-partial-${Date.now()}`,
                  type: 'activity',
                  userId: order.userId,
                  userEmail: order.userEmail,
                  action: `Order ${order.id} returned as partial. Refunded $${refundAmount.toFixed(4)} for remaining ${order.remains}/${order.quantity} units.`,
                  createdAt: nowStr,
                });
                await saveAuditLog({
                  id: `audit-sync-partial-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  userId: order.userId,
                  userEmail: order.userEmail,
                  action: `Order ${order.id} returned as partial. Refunded $${refundAmount.toFixed(4)} for remaining ${order.remains}/${order.quantity} units.`,
                  category: 'wallet',
                  createdAt: nowStr,
                });
              }
            }
          }

          await saveOrder(order);
          updated++;
        }
      } catch (err: any) {
        failures++;
        // Log sync fault, but do not stop the synchronization cycle
        console.error(`Failed to sync order ${order.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('Error during automatic order synchronization cycle:', err);
  } finally {
    isSyncRunning = false;
  }

  return { processed, updated, failures };
}

/**
 * Starts a recurring background task to poll order statuses.
 */
let syncIntervalId: NodeJS.Timeout | null = null;

export function startBackgroundOrderSync(intervalMs = 60000): void {
  if (syncIntervalId) return;

  console.log(`⏱️ SMM Order Status Sync engine started. Interval: ${intervalMs / 1000}s`);
  
  // Run first sync immediately
  setTimeout(() => {
    syncActiveOrders().catch(err => console.error('Immediate sync active orders failed:', err));
  }, 2000);

  syncIntervalId = setInterval(async () => {
    try {
      const stats = await syncActiveOrders();
      if (stats.processed > 0) {
        console.log(`[Order Sync] Sync complete: Processed ${stats.processed}, Updated ${stats.updated}, Faults ${stats.failures}`);
      }
    } catch (err) {
      console.error('[Order Sync] Background interval error:', err);
    }
  }, intervalMs);
}

export function stopBackgroundOrderSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('⏹️ SMM Order Status Sync engine stopped.');
  }
}

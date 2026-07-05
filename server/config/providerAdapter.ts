import axios, { AxiosError } from 'axios';
import { Provider, Service } from '../../src/types';
import { saveProvider, saveSystemLog } from './store';

interface SMMService {
  service: string;
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  type?: string;
  desc?: string;
  dripfeed?: string;
  refill?: string;
  cancel?: string;
}

export class ProviderAdapter {
  private static sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * General request method with exponential backoff, timeout support,
   * detailed error logging, and provider statistics updating.
   */
  public static async request(
    provider: Provider,
    action: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const maxRetries = 3;
    let attempt = 0;
    let delay = 1000; // start with 1s

    while (attempt < maxRetries) {
      attempt++;
      try {
        const payload = new URLSearchParams({
          key: provider.apiKey,
          action,
          ...params,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), provider.timeout || 10000);

        const response = await axios.post(provider.apiUrl, payload.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: controller.signal,
          validateStatus: (status) => status === 200, // Reject anything that isn't 200
        });

        clearTimeout(timeoutId);

        // Success logging & updates
        provider.successCount = (provider.successCount || 0) + 1;
        provider.lastHealthCheck = new Date().toISOString();
        provider.lastSuccessRequest = `Action: ${action} - Success`;
        provider.updatedAt = new Date().toISOString();
        await saveProvider(provider);

        // Keep a system log
        await saveSystemLog({
          id: `log-prov-succ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'activity',
          action: `SMM Provider [${provider.name}] action [${action}] succeeded.`,
          createdAt: new Date().toISOString(),
        });

        return response.data;
      } catch (error: any) {
        const isLastAttempt = attempt >= maxRetries;
        let errorMessage = 'Unknown error';
        let isRetryable = false;
        let statusCode = 0;

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          statusCode = axiosError.response?.status || 0;
          errorMessage = axiosError.message;
          if (axiosError.response?.data) {
            errorMessage += ` - ${JSON.stringify(axiosError.response.data)}`;
          }

          // Retryable codes: 429 (Rate Limit), 500, 502, 503, 504, or network/timeout failures
          if (
            statusCode === 429 ||
            statusCode >= 500 ||
            axiosError.code === 'ECONNABORTED' ||
            axiosError.message.includes('timeout') ||
            axiosError.message.includes('Network Error')
          ) {
            isRetryable = true;
          }
        } else if (error.name === 'AbortError') {
          errorMessage = 'Request Timeout';
          isRetryable = true;
        } else {
          errorMessage = error.message || String(error);
        }

        // Save failure details in provider stats
        if (isLastAttempt || !isRetryable) {
          provider.failedCount = (provider.failedCount || 0) + 1;
          provider.lastHealthCheck = new Date().toISOString();
          provider.lastError = `Action: ${action} failed: ${errorMessage} (Attempt ${attempt})`;
          provider.updatedAt = new Date().toISOString();
          await saveProvider(provider);

          await saveSystemLog({
            id: `log-prov-fail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type: 'error',
            action: `SMM Provider [${provider.name}] action [${action}] failed permanently: ${errorMessage}`,
            createdAt: new Date().toISOString(),
          });

          throw new Error(`Provider API error: ${errorMessage}`);
        }

        // Wait with exponential backoff before retrying
        await this.sleep(delay);
        delay *= 2; // exponential backoff
      }
    }
  }

  /**
   * Get provider balance
   */
  public static async getBalance(provider: Provider): Promise<{ balance: number; currency: string }> {
    const data = await this.request(provider, 'balance');
    if (!data || data.error) {
      throw new Error(data?.error || 'Invalid balance response');
    }
    return {
      balance: parseFloat(data.balance || '0'),
      currency: data.currency || 'USD',
    };
  }

  /**
   * Get provider services list
   */
  public static async getServices(provider: Provider): Promise<SMMService[]> {
    const data = await this.request(provider, 'services');
    if (!data) {
      throw new Error('Empty services response');
    }
    if (data.error) {
      throw new Error(data.error);
    }
    if (Array.isArray(data)) {
      return data as SMMService[];
    }
    throw new Error('Services response is not an array');
  }

  /**
   * Create an SMM order on the provider
   */
  public static async createOrder(
    provider: Provider,
    serviceId: string,
    link: string,
    quantity: number,
    additionalParams: Record<string, any> = {}
  ): Promise<string> {
    const data = await this.request(provider, 'add', {
      service: serviceId,
      link,
      quantity: String(quantity),
      ...additionalParams,
    });

    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to place order at SMM Provider');
    }

    if (data.order) {
      return String(data.order);
    }

    throw new Error(`Unexpected order response: ${JSON.stringify(data)}`);
  }

  /**
   * Get order status from SMM provider
   */
  public static async getOrderStatus(
    provider: Provider,
    providerOrderId: string
  ): Promise<{
    status: string;
    charge: number;
    remains: number;
    startCount: number;
  }> {
    const data = await this.request(provider, 'status', {
      order: providerOrderId,
    });

    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to fetch SMM order status');
    }

    return {
      status: String(data.status || 'pending').toLowerCase(),
      charge: parseFloat(data.charge || '0'),
      remains: parseInt(data.remains || '0', 10),
      startCount: parseInt(data.start_count || '0', 10),
    };
  }

  /**
   * Request refill for an order at SMM provider
   */
  public static async requestRefill(provider: Provider, providerOrderId: string): Promise<string> {
    if (!provider.supportsRefill) {
      throw new Error('Provider does not support refill');
    }

    const data = await this.request(provider, 'refill', {
      order: providerOrderId,
    });

    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to request refill from SMM provider');
    }

    if (data.refill) {
      return String(data.refill);
    }

    throw new Error(`Unexpected refill response: ${JSON.stringify(data)}`);
  }

  /**
   * Request cancel for an order at SMM provider
   */
  public static async requestCancel(provider: Provider, providerOrderId: string): Promise<boolean> {
    if (!provider.supportsCancel) {
      throw new Error('Provider does not support cancellation');
    }

    const data = await this.request(provider, 'cancel', {
      order: providerOrderId,
    });

    if (!data || data.error) {
      throw new Error(data?.error || 'Failed to request cancel from SMM provider');
    }

    return true;
  }
}

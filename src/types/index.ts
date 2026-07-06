export type UserRole = 'Super Admin' | 'Admin' | 'User';
export type UserStatus = 'Active' | 'Suspended' | 'Banned';

export interface UserProfile {
  uid: string;
  name: string;
  displayName?: string; // Backward compatibility with components
  email: string;
  phone: string;
  role: UserRole;
  balance: number;
  totalSpent: number;
  totalOrders: number;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  forceLogoutTimestamp?: string;
}

export type ServiceStatus = 'active' | 'disabled';

export interface Service {
  id: string;
  categoryId: string;
  category: string; // Name of category for backward compatibility
  providerId?: string | null;
  providerServiceId?: string | null;
  name: string;
  description: string;
  price: number;
  ratePerThousand: number; // Price for 1000 items (backward compatibility)
  min: number;
  minQuantity: number; // (backward compatibility)
  max: number;
  maxQuantity: number; // (backward compatibility)
  averageTime: string;
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
  status: ServiceStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  sortOrder: number;
  status: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'inprogress' | 'completed' | 'partial' | 'canceled' | 'failed' | 'refunded';

export interface Order {
  id: string; // Document ID, matches orderId
  orderId: string;
  providerOrderId?: string | null;
  userId: string;
  userEmail: string;
  providerId?: string | null;
  serviceId: string;
  serviceName: string;
  categoryName: string;
  link: string;
  quantity: number;
  price: number; // Price charged to the user
  charge: number; // Backward compatibility, matches price
  cost: number; // Provider cost
  profit: number; // price - cost
  startCount: number;
  remains: number;
  status: OrderStatus;
  providerStatus?: string | null;
  refillAvailable?: boolean;
  cancelAvailable?: boolean;
  lastError?: string;
  refillRequestedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export type PaymentMethod = 'stripe' | 'paypal' | 'crypto' | 'perfect_money' | string;
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface CustomPaymentMethod {
  id: string;
  name: string;
  description: string;
  logo: string; // Icon identifier or URL
  enabled: boolean;
  minDeposit: number;
  maxDeposit: number;
  processingTime: string;
  instructions: string;
  upiId?: string;
  qrImageUrl?: string;
  sortOrder: number;
  isFutureReady?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

export type TicketStatus = 'pending' | 'answered' | 'closed';

export interface TicketReply {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: string;
  replies: TicketReply[];
}

export interface SystemStats {
  totalUsers: number;
  totalOrders: number;
  totalSpent: number;
  activeTickets: number;
}

export interface SystemSettings {
  websiteName: string;
  maintenanceMode: boolean;
  currency: string;
  timezone: string;
  theme: string;
  logoUrl: string;
  faviconUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

export interface SystemLog {
  id: string;
  type: 'login' | 'activity' | 'error' | 'admin';
  userId?: string;
  userEmail?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  category: 'user' | 'admin' | 'provider' | 'service' | 'order' | 'settings' | 'wallet' | 'system';
  details?: Record<string, any>;
  ipAddress?: string;
  browser?: string;
  device?: string;
  createdAt: string;
}

export interface SecurityLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: 'login' | 'logout' | 'password_change' | 'failed_login' | 'suspicious_activity' | 'session_revocation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
  ipAddress?: string;
  browser?: string;
  device?: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  userId?: string; // empty means Admin notifications
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  status: 'active' | 'disabled';
  currency: string;
  priority: number;
  timeout: number;
  rateMultiplier: number;
  supportsRefill: boolean;
  supportsCancel: boolean;
  lastSync?: string | null;
  lastHealthCheck?: string | null;
  successCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
  lastSuccessRequest?: string | null;
  uptime?: number;
}

export type TransactionType = 
  | 'Deposit' 
  | 'Order Payment' 
  | 'Refund' 
  | 'Bonus' 
  | 'Manual Credit' 
  | 'Manual Debit' 
  | 'Adjustment';

export type TransactionStatus = 
  | 'Pending' 
  | 'Success' 
  | 'Failed' 
  | 'Rejected' 
  | 'Cancelled';

export interface Wallet {
  userId: string;
  userEmail?: string;
  balance: number;
  lockedBalance: number;
  totalDeposit: number;
  totalSpent: number;
  totalRefund: number;
  totalBonus: number;
  isFrozen?: boolean;
  updatedAt: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  userEmail?: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  referenceId?: string;
  paymentMethod?: string;
  description: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  paymentMethod: string;
  status: 'Pending' | 'Success' | 'Approved' | 'Rejected' | 'Cancelled';
  referenceId?: string;
  screenshotUrl?: string;
  adminNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AUTO SYNC & MONITORING TYPES
// ==========================================

export interface CategoryMapping {
  providerCategory: string;
  mappedCategoryId?: string;
  mappedCategoryName?: string;
  hidden?: boolean;
  sortOrder?: number;
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // in minutes
  defaultStatus: 'active' | 'disabled';
  serviceVisibility: 'all' | 'imported_only' | 'custom';
  globalProfitPercent: number; // e.g. 20 for 20%
  categoryProfitPercent: Record<string, number>; // categoryId -> profitPercent
  serviceProfitPercent: Record<string, number>; // serviceId -> profitPercent
  fixedProfit: number; // fixed amount in USD to add
  minimumProfit: number; // minimum profit in USD to guarantee
  minPrice: number; // lower bound
  maxPrice: number; // upper bound
  categoryMappings: CategoryMapping[];
  manualOverrides: Record<string, { price: number; enabled: boolean }>; // serviceId -> manual override details
}

export interface SyncLog {
  id: string;
  providerId: string;
  providerName: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  importedCount: number;
  updatedCount: number;
  disabledCount: number;
  errors: string[];
  status: 'success' | 'partial_success' | 'failed';
  triggerType: 'manual' | 'automatic';
}

export interface ProviderHealth {
  providerId: string;
  providerName: string;
  isOnline: boolean;
  responseTimeMs: number;
  lastSuccessAt: string | null;
  lastFailAt: string | null;
  successRate: number;
  failureRate: number;
  apiLatencyHistory: number[]; // Last 10 latency measurements
  dailyStats: {
    date: string;
    requests: number;
    failures: number;
    avgLatency: number;
  }[];
  lastErrorMessage?: string | null;
}

// ==========================================
// NOTIFICATION SYSTEM TYPES
// ==========================================

export type NotificationType =
  | 'System'
  | 'Order'
  | 'Wallet'
  | 'Payment'
  | 'Deposit'
  | 'Refund'
  | 'Provider'
  | 'Security'
  | 'Admin'
  | 'Promotion';

export interface ZenitNotification {
  id: string;
  userId?: string; // empty means broadcast or admin notification
  isBroadcast?: boolean;
  title: string;
  message: string;
  read: boolean;
  readBy?: string[]; // Array of user UIDs who have marked this broadcast as read
  type: NotificationType;
  severity: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  scheduledAt?: string;
  isScheduled?: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject?: string;
  titleTemplate: string;
  messageTemplate: string;
  type: NotificationType;
  severity: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  categories: Record<NotificationType, boolean>;
  updatedAt: string;
}

// ==========================================
// ADVANCED ANALYTICS & REPORTS TYPES
// ==========================================

export interface RevenueProfitStats {
  period: string; // e.g. "2026-07-01" or "July 2026"
  revenue: number;
  profit: number;
  cost: number;
  ordersCount: number;
}

export interface AnalyticsDashboardData {
  summary: {
    revenue: {
      today: number;
      weekly: number;
      monthly: number;
      yearly: number;
      growth: number; // percentage
    };
    profit: {
      today: number;
      weekly: number;
      monthly: number;
      yearly: number;
      growth: number;
    };
    orders: {
      total: number;
      success: number;
      failed: number;
      partial: number;
      refunded: number;
      successRate: number;
      averageValue: number;
    };
    users: {
      total: number;
      activeToday: number;
      activeWeekly: number;
      growth: number;
    };
    wallets: {
      totalDeposits: number;
      totalBalance: number;
      averageDeposit: number;
    };
  };
  charts: {
    revenueProfitHistory: RevenueProfitStats[]; // Daily/weekly/monthly history
    ordersStatusDistribution: { status: string; value: number }[];
    categorySales: { category: string; count: number; revenue: number }[];
    providerVolume: { provider: string; count: number; cost: number }[];
  };
  topCustomers: { uid: string; email: string; name: string; totalSpent: number; ordersCount: number }[];
  topServices: { serviceId: string; name: string; category: string; count: number; revenue: number }[];
}






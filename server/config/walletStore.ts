import { getAdminDb, initializeFirebaseAdmin } from './firebase';
import { Wallet, Transaction, WalletRequest, UserProfile, TransactionType, TransactionStatus } from '../../src/types';
import { getUserProfile, saveUserProfile } from './store';

// In-Memory fallback maps
class InMemoryWalletStore {
  wallets: Map<string, Wallet> = new Map();
  transactions: Map<string, Transaction> = new Map();
  requests: Map<string, WalletRequest> = new Map();
}

const memoryWalletDb = new InMemoryWalletStore();

// Generate unique ID helper
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Retrieves a user's wallet. Automatically provisions one if it doesn't exist,
 * syncing it with the user's existing profile balance/spent metrics for backward compatibility.
 */
export async function getWallet(userId: string): Promise<Wallet> {
  const isFirebase = initializeFirebaseAdmin();
  if (isFirebase) {
    try {
      const db = getAdminDb();
      const walletRef = db.collection('wallets').doc(userId);
      const doc = await walletRef.get();
      
      if (doc.exists) {
        return doc.data() as Wallet;
      }
      
      // Auto-provision wallet using existing user metrics
      const userProfile = await getUserProfile(userId);
      const initialBalance = userProfile ? userProfile.balance : 0.00;
      const initialSpent = userProfile ? userProfile.totalSpent : 0.00;
      
      const newWallet: Wallet = {
        userId,
        userEmail: userProfile?.email || 'user@zenitsmm.com',
        balance: Number(initialBalance.toFixed(4)),
        lockedBalance: 0,
        totalDeposit: Number(initialBalance.toFixed(4)), // Count starter credits as deposit or 0
        totalSpent: Number(initialSpent.toFixed(4)),
        totalRefund: 0,
        totalBonus: 0,
        isFrozen: false,
        updatedAt: new Date().toISOString()
      };
      
      await walletRef.set(newWallet);
      return newWallet;
    } catch (err) {
      console.error(`Error in getWallet for ${userId}:`, err);
    }
  }

  // Fallback memory database
  let memWallet = memoryWalletDb.wallets.get(userId);
  if (!memWallet) {
    const userProfile = await getUserProfile(userId);
    const initialBalance = userProfile ? userProfile.balance : 0.00;
    const initialSpent = userProfile ? userProfile.totalSpent : 0.00;

    memWallet = {
      userId,
      userEmail: userProfile?.email || 'user@zenitsmm.com',
      balance: Number(initialBalance.toFixed(4)),
      lockedBalance: 0,
      totalDeposit: Number(initialBalance.toFixed(4)),
      totalSpent: Number(initialSpent.toFixed(4)),
      totalRefund: 0,
      totalBonus: 0,
      isFrozen: false,
      updatedAt: new Date().toISOString()
    };
    memoryWalletDb.wallets.set(userId, memWallet);
  }
  return memWallet;
}

/**
 * Save / update wallet directly (outside transactions, use with caution)
 */
export async function saveWallet(wallet: Wallet): Promise<void> {
  const isFirebase = initializeFirebaseAdmin();
  if (isFirebase) {
    try {
      const db = getAdminDb();
      await db.collection('wallets').doc(wallet.userId).set(wallet);
      return;
    } catch (err) {
      console.error('Error saving wallet to Firestore:', err);
    }
  }
  memoryWalletDb.wallets.set(wallet.userId, wallet);
}

/**
 * Get all wallets (Admin view)
 */
export async function getAllWallets(): Promise<Wallet[]> {
  const isFirebase = initializeFirebaseAdmin();
  if (isFirebase) {
    try {
      const db = getAdminDb();
      const snapshot = await db.collection('wallets').get();
      return snapshot.docs.map((doc: any) => doc.data() as Wallet);
    } catch (err) {
      console.error('Error fetching all wallets:', err);
    }
  }
  return Array.from(memoryWalletDb.wallets.values());
}

/**
 * Get all transactions for a specific user or globally (if userId is empty/all)
 */
export async function getTransactions(userId?: string): Promise<Transaction[]> {
  const isFirebase = initializeFirebaseAdmin();
  if (isFirebase) {
    try {
      const db = getAdminDb();
      let query = db.collection('transactions');
      if (userId && userId !== 'all') {
        const snapshot = await query.where('userId', '==', userId).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map((doc: any) => doc.data() as Transaction);
      } else {
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map((doc: any) => doc.data() as Transaction);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  }

  const allTx = Array.from(memoryWalletDb.transactions.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (userId && userId !== 'all') {
    return allTx.filter(t => t.userId === userId);
  }
  return allTx;
}

/**
 * Create or save a direct transaction entry
 */
export async function saveTransaction(tx: Transaction): Promise<void> {
  const isFirebase = initializeFirebaseAdmin();
  if (isFirebase) {
    try {
      const db = getAdminDb();
      await db.collection('transactions').doc(tx.transactionId).set(tx);
      return;
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  }
  memoryWalletDb.transactions.set(tx.transactionId, tx);
}

/**
 * Core Business Logic: Atomic, transaction-safe wallet balance adjustments.
 * This function guarantees:
 * - Race-condition prevention using Firestore Transactions
 * - Balance validation to prevent negative balances
 * - Absolute synchronization between 'wallets' balance and 'users' balance
 * - Generation of unique Transaction logs
 */
export async function executeBalanceUpdate(
  userId: string,
  type: TransactionType,
  amount: number,
  params: {
    paymentMethod?: string;
    description: string;
    adminNote?: string;
    referenceId?: string;
    status?: TransactionStatus;
  }
): Promise<Transaction> {
  const isFirebase = initializeFirebaseAdmin();
  const txId = generateId('tx');
  const now = new Date().toISOString();
  const status = params.status || 'Success';

  if (isFirebase) {
    const db = getAdminDb();
    const walletRef = db.collection('wallets').doc(userId);
    const userRef = db.collection('users').doc(userId);
    const txRef = db.collection('transactions').doc(txId);

    return await db.runTransaction(async (transaction: any) => {
      // 1. Read existing wallet & user profile
      const walletSnap = await transaction.get(walletRef);
      const userSnap = await transaction.get(userRef);

      let currentWallet: Wallet;
      let currentUser: UserProfile | null = null;

      if (userSnap.exists) {
        currentUser = userSnap.data() as UserProfile;
      }

      if (walletSnap.exists) {
        currentWallet = walletSnap.data() as Wallet;
      } else {
        // Build fresh default wallet if absent
        currentWallet = {
          userId,
          userEmail: currentUser?.email || 'user@zenitsmm.com',
          balance: currentUser ? currentUser.balance : 0.00,
          lockedBalance: 0,
          totalDeposit: currentUser ? currentUser.balance : 0.00,
          totalSpent: currentUser ? currentUser.totalSpent : 0.00,
          totalRefund: 0,
          totalBonus: 0,
          isFrozen: false,
          updatedAt: now
        };
      }

      // Check if wallet is frozen
      if (currentWallet.isFrozen && type !== 'Refund' && type !== 'Adjustment') {
        throw new Error('Transaction rejected. Your wallet has been frozen by the system administrator.');
      }

      const balanceBefore = currentWallet.balance;
      let balanceAfter = balanceBefore;
      
      let nextDeposit = currentWallet.totalDeposit;
      let nextSpent = currentWallet.totalSpent;
      let nextRefund = currentWallet.totalRefund;
      let nextBonus = currentWallet.totalBonus;

      // Apply financial rules based on transaction type
      if (status === 'Success') {
        switch (type) {
          case 'Deposit':
          case 'Manual Credit':
            balanceAfter = Number((balanceBefore + amount).toFixed(4));
            if (type === 'Deposit') {
              nextDeposit = Number((currentWallet.totalDeposit + amount).toFixed(4));
            }
            break;

          case 'Order Payment':
          case 'Manual Debit':
            if (balanceBefore < amount) {
              throw new Error(`Insufficient wallet balance. Requested debit: $${amount.toFixed(4)}, current balance: $${balanceBefore.toFixed(4)}.`);
            }
            balanceAfter = Number((balanceBefore - amount).toFixed(4));
            if (type === 'Order Payment') {
              nextSpent = Number((currentWallet.totalSpent + amount).toFixed(4));
            }
            break;

          case 'Refund':
            balanceAfter = Number((balanceBefore + amount).toFixed(4));
            nextRefund = Number((currentWallet.totalRefund + amount).toFixed(4));
            nextSpent = Number(Math.max(0, currentWallet.totalSpent - amount).toFixed(4));
            break;

          case 'Bonus':
            balanceAfter = Number((balanceBefore + amount).toFixed(4));
            nextBonus = Number((currentWallet.totalBonus + amount).toFixed(4));
            break;

          case 'Adjustment':
            balanceAfter = Number((balanceBefore + amount).toFixed(4));
            if (balanceAfter < 0) {
              throw new Error(`Adjustment of $${amount.toFixed(4)} is rejected as it would yield a negative balance ($${balanceAfter.toFixed(4)}).`);
            }
            break;
        }
      }

      // 2. Build updated Wallet state
      const updatedWallet: Wallet = {
        ...currentWallet,
        balance: balanceAfter,
        totalDeposit: nextDeposit,
        totalSpent: nextSpent,
        totalRefund: nextRefund,
        totalBonus: nextBonus,
        updatedAt: now
      };

      // 3. Build Transaction Log
      const txLog: Transaction = {
        transactionId: txId,
        userId,
        userEmail: currentUser?.email || currentWallet.userEmail || 'user@zenitsmm.com',
        type,
        amount,
        balanceBefore,
        balanceAfter,
        status,
        referenceId: params.referenceId || '',
        paymentMethod: params.paymentMethod || 'Manual',
        description: params.description,
        adminNote: params.adminNote || '',
        createdAt: now,
        updatedAt: now
      };

      // 4. Update Firestore documents atomically
      transaction.set(walletRef, updatedWallet);
      transaction.set(txRef, txLog);

      if (currentUser) {
        transaction.update(userRef, {
          balance: balanceAfter,
          totalSpent: nextSpent,
          updatedAt: now
        });
      }

      return txLog;
    });
  }

  // Memory fallback logic
  const memWallet = await getWallet(userId);
  if (memWallet.isFrozen && type !== 'Refund' && type !== 'Adjustment') {
    throw new Error('Transaction rejected. Your wallet has been frozen by the system administrator.');
  }

  const balanceBefore = memWallet.balance;
  let balanceAfter = balanceBefore;

  if (status === 'Success') {
    switch (type) {
      case 'Deposit':
      case 'Manual Credit':
        balanceAfter = Number((balanceBefore + amount).toFixed(4));
        if (type === 'Deposit') {
          memWallet.totalDeposit = Number((memWallet.totalDeposit + amount).toFixed(4));
        }
        break;

      case 'Order Payment':
      case 'Manual Debit':
        if (balanceBefore < amount) {
          throw new Error(`Insufficient wallet balance. Requested debit: $${amount.toFixed(4)}, current balance: $${balanceBefore.toFixed(4)}.`);
        }
        balanceAfter = Number((balanceBefore - amount).toFixed(4));
        if (type === 'Order Payment') {
          memWallet.totalSpent = Number((memWallet.totalSpent + amount).toFixed(4));
        }
        break;

      case 'Refund':
        balanceAfter = Number((balanceBefore + amount).toFixed(4));
        memWallet.totalRefund = Number((memWallet.totalRefund + amount).toFixed(4));
        memWallet.totalSpent = Number(Math.max(0, memWallet.totalSpent - amount).toFixed(4));
        break;

      case 'Bonus':
        balanceAfter = Number((balanceBefore + amount).toFixed(4));
        memWallet.totalBonus = Number((memWallet.totalBonus + amount).toFixed(4));
        break;

      case 'Adjustment':
        balanceAfter = Number((balanceBefore + amount).toFixed(4));
        if (balanceAfter < 0) {
          throw new Error(`Adjustment of $${amount.toFixed(4)} would result in negative balance.`);
        }
        break;
    }
  }

  memWallet.balance = balanceAfter;
  memWallet.updatedAt = now;
  memoryWalletDb.wallets.set(userId, memWallet);

  const txLog: Transaction = {
    transactionId: txId,
    userId,
    userEmail: memWallet.userEmail || 'user@zenitsmm.com',
    type,
    amount,
    balanceBefore,
    balanceAfter,
    status,
    referenceId: params.referenceId || '',
    paymentMethod: params.paymentMethod || 'Manual',
    description: params.description,
    adminNote: params.adminNote || '',
    createdAt: now,
    updatedAt: now
  };

  memoryWalletDb.transactions.set(txId, txLog);

  // Sync memory user
  const userProfile = await getUserProfile(userId);
  if (userProfile) {
    userProfile.balance = balanceAfter;
    userProfile.totalSpent = memWallet.totalSpent;
    userProfile.updatedAt = now;
    await saveUserProfile(userProfile);
  }

  return txLog;
}

/**
 * Get all Wallet Requests (deposits, manual approval queues)
 */
export async function getWalletRequests(): Promise<WalletRequest[]> {
  const isFirebase = initializeFirebaseAdmin();
  if (isFirebase) {
    try {
      const db = getAdminDb();
      const snapshot = await db.collection('wallet_requests').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((doc: any) => doc.data() as WalletRequest);
    } catch (err) {
      console.error('Error fetching wallet requests:', err);
    }
  }
  return Array.from(memoryWalletDb.requests.values())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Create or save a wallet request
 */
export async function saveWalletRequest(req: WalletRequest): Promise<void> {
  const isFirebase = initializeFirebaseAdmin();
  if (isFirebase) {
    try {
      const db = getAdminDb();
      await db.collection('wallet_requests').doc(req.id).set(req);
      return;
    } catch (err) {
      console.error('Error saving wallet request:', err);
    }
  }
  memoryWalletDb.requests.set(req.id, req);
}

/**
 * Backward compatibility: Deduct user balance via atomic transaction log
 */
export async function deductUserBalance(uid: string, amount: number): Promise<UserProfile> {
  await executeBalanceUpdate(uid, 'Order Payment', amount, {
    description: `Campaign service order placement charge`,
  });
  const user = await getUserProfile(uid);
  if (!user) throw new Error('User profile not found.');
  return user;
}

/**
 * Backward compatibility: Refund user balance via atomic transaction log
 */
export async function refundUserBalance(uid: string, amount: number): Promise<void> {
  await executeBalanceUpdate(uid, 'Refund', amount, {
    description: `Campaign service order partial/full refund`,
  });
}


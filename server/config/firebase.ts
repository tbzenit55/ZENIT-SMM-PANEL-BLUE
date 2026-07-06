import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let isFirebaseAdminInitialized = false;
let db: any = null;
let auth: any = null;

export function initializeFirebaseAdmin(): boolean {
  if (isFirebaseAdminInitialized) return true;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'zenit-smm-panel-7c54f';
    
    // Strict check: Only zenit-smm-panel-7c54f is allowed
    if (projectId !== 'zenit-smm-panel-7c54f') {
      throw new Error(`Invalid Firebase project configuration. Only 'zenit-smm-panel-7c54f' is authorized.`);
    }

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized with service account.');
      isFirebaseAdminInitialized = true;
      return true;
    }

    // In container environments like Cloud Run, we can automatically initialize using Application Default Credentials (ADC) without explicit env vars.
    try {
      initializeApp({
        projectId: projectId
      });
      console.log('Firebase Admin initialized with container default environment configuration.');
      isFirebaseAdminInitialized = true;
      return true;
    } catch (fallbackErr) {
      console.warn(
        '⚠️  Firebase Admin Credentials not fully configured, and container ADC initialization failed. API endpoints will run in sandbox mode with in-memory persistence.',
        fallbackErr
      );
      return false;
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
    return false;
  }
}

export function getAdminDb(): any {
  if (!db) {
    const success = initializeFirebaseAdmin();
    if (success) {
      const app = getApps()[0] || getApp();
      db = getFirestore(app);
    } else {
      throw new Error('Firebase Admin DB is requested but Firebase Admin was not initialized.');
    }
  }
  return db;
}

export function getAdminAuth(): any {
  if (!auth) {
    const success = initializeFirebaseAdmin();
    if (success) {
      const app = getApps()[0] || getApp();
      auth = getAuth(app);
    } else {
      throw new Error('Firebase Admin Auth is requested but Firebase Admin was not initialized.');
    }
  }
  return auth;
}

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let isFirebaseAdminInitialized = false;
let db: any = null;
let auth: any = null;
let firestoreDatabaseId: string | undefined = undefined;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firestoreDatabaseId = config.firestoreDatabaseId;
  }
} catch (e) {
  console.warn('Failed to read firestoreDatabaseId from firebase-applet-config.json', e);
}

export function initializeFirebaseAdmin(): boolean {
  if (isFirebaseAdminInitialized) return true;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfigIR().projectId;
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

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfigIR().projectId
      });
      console.log('Firebase Admin initialized with local environment configuration.');
      isFirebaseAdminInitialized = true;
      return true;
    }

    console.warn(
      '⚠️  Firebase Admin Credentials not fully configured. API endpoints will run in sandbox mode with in-memory persistence.'
    );
    return false;
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
    return false;
  }
}

function firebaseConfigIR(): any {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return {};
}

export function getAdminDb(): any {
  if (!db) {
    const success = initializeFirebaseAdmin();
    if (success) {
      const app = getApps()[0] || getApp();
      db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
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

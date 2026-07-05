import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfigIR from '../../firebase-applet-config.json';

// Client-side Firebase config
const firebaseConfig = {
  apiKey: firebaseConfigIR.apiKey || (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigIR.authDomain || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigIR.projectId || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigIR.storageBucket || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigIR.messagingSenderId || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigIR.appId || (import.meta as any).env?.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: firebaseConfigIR.firestoreDatabaseId,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
  }
  return app;
}

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getClientDb(): Firestore {
  if (!db) {
    // Crucial: The app will break without providing the firestoreDatabaseId if configured
    db = getFirestore(getFirebaseApp(), firebaseConfig.firestoreDatabaseId);
  }
  return db;
}

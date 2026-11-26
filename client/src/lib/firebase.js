import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDcFiKm1P-vUPy11SDGtzhwUhcQew87efU";
export const isFirebaseConfigured = Boolean(
  rawApiKey && rawApiKey !== "your_firebase_api_key"
);

export const firebaseConfig = {
  apiKey: rawApiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "training-assessment-platform.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://training-assessment-platform-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "training-assessment-platform",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "training-assessment-platform.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "762793101420",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:762793101420:web:3a4dbc9a1bdfdb9643b049",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FR5SK5090B",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Guard getAuth() so missing VITE_FIREBASE_API_KEY never crashes the entire SPA at module load time
export let auth = null;
if (isFirebaseConfigured) {
  try {
    auth = getAuth(app);
  } catch (err) {
    console.warn("Firebase Auth initialization skipped:", err?.message);
  }
} else {
  console.warn(
    "Firebase API key is not configured (client/.env VITE_FIREBASE_API_KEY). Running without Firebase Auth."
  );
}

export const firestore = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

export let analytics = null;
if (isFirebaseConfigured) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

/**
 * Secondary Auth instance used by Admin when creating Instructor accounts
 * so creating a teacher in Firebase Auth does not sign out the active Admin.
 */
export function getSecondaryAuth() {
  if (!isFirebaseConfigured) return null;
  try {
    const existing = getApps().find((a) => a.name === "AdminUserCreator");
    const secondaryApp = existing || initializeApp(firebaseConfig, "AdminUserCreator");
    return getAuth(secondaryApp);
  } catch {
    return null;
  }
}


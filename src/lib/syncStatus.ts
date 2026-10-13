import { create } from 'zustand';

/** Firebase web config comes from VITE_FIREBASE_* env vars (see .env.example). */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (v) => typeof v === 'string' && v.length > 0
);

export type SyncState =
  | 'unconfigured' // no Firebase config: the app works locally only
  | 'signed-out'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error';

export interface SyncStatus {
  state: SyncState;
  /** False until Firebase has told us whether a saved session exists. */
  ready: boolean;
  email: string | null;
  lastSyncedAt: number | null;
  error: string | null;
}

export const useSyncStatus = create<SyncStatus>(() => ({
  state: isFirebaseConfigured ? 'signed-out' : 'unconfigured',
  ready: !isFirebaseConfigured,
  email: null,
  lastSyncedAt: null,
  error: null,
}));

export const setSyncStatus = (patch: Partial<SyncStatus>) => useSyncStatus.setState(patch);

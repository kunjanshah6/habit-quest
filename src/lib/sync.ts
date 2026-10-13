import { getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { DocumentReference, Firestore } from 'firebase/firestore';
import { useStore, selectPersistedData } from '../store/useStore';
import type { AppStore } from '../store/useStore';
import { canonicalize, mergeData, parseSyncPayload } from './persistence';
import { firebaseConfig, isFirebaseConfigured, setSyncStatus } from './syncStatus';

/**
 * Cloud sync.
 *
 * The app stays local-first: localStorage is still the primary store and works
 * offline. When signed in, every change is merged into one Firestore document
 * (users/{uid}) and every other signed-in device receives it live.
 *
 * A single document is used for simplicity; Firestore caps documents at 1 MiB,
 * which is roughly several thousand completions.
 */

const OWNER_KEY = 'habit-quest-sync-owner';
const PUSH_DEBOUNCE_MS = 1500;

// Fields whose change should trigger an upload (UI-only state must not).
const SYNCED_KEYS: (keyof AppStore)[] = [
  'habits',
  'completions',
  'userAchievements',
  'settings',
  'totalXP',
  'streakShields',
  'epoch',
  'settingsUpdatedAt',
];

let started = false;
let db: Firestore | null = null;
let ref: DocumentReference | null = null;
let unsubSnapshot: (() => void) | null = null;
let unsubStore: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let pushAgain = false;
/** True right after an explicit sign-in: merge with whatever the account holds. */
let linking = false;

const onOnline = () => schedulePush(0);

function describeError(e: unknown): { offline: boolean; message: string } {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  const offline = code === 'unavailable' || code === 'auth/network-request-failed' || !navigator.onLine;
  const messages: Record<string, string> = {
    'auth/invalid-email': 'That email address is not valid.',
    'auth/missing-password': 'Enter a password.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/network-request-failed': 'No internet connection.',
    'permission-denied': 'Cloud access was denied. Check the Firestore security rules.',
    unavailable: 'Cannot reach the server.',
  };
  const fallback = e instanceof Error ? e.message : 'Something went wrong.';
  return { offline, message: messages[code] ?? fallback };
}

function stopListening() {
  unsubSnapshot?.();
  unsubStore?.();
  unsubSnapshot = null;
  unsubStore = null;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  window.removeEventListener('online', onOnline);
  ref = null;
}

function schedulePush(delay = PUSH_DEBOUNCE_MS) {
  if (!ref) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void push(), delay);
}

/** Merge local data into the cloud document in one transaction. Returns success. */
async function push(): Promise<boolean> {
  if (!ref || !db) return false;
  if (pushing) {
    pushAgain = true;
    return true;
  }
  pushing = true;
  const target = ref;
  setSyncStatus({ state: 'syncing', error: null });
  try {
    const merged = await runTransaction(db, async (tx) => {
      const snap = await tx.get(target);
      const local = selectPersistedData(useStore.getState());
      // An unreadable remote throws here, so it is never overwritten.
      const remote = snap.exists() ? parseSyncPayload(snap.data().payload) : null;
      const result = remote ? mergeData(local, remote) : local;
      if (!remote || canonicalize(result) !== canonicalize(remote)) {
        tx.set(target, { payload: JSON.stringify(result), updatedAt: serverTimestamp(), schema: 1 });
      }
      return result;
    });
    useStore.getState().applyMerged(merged);
    setSyncStatus({ state: 'synced', lastSyncedAt: Date.now(), error: null });
    return true;
  } catch (e) {
    const { offline, message } = describeError(e);
    setSyncStatus(offline ? { state: 'offline', error: null } : { state: 'error', error: message });
    return false;
  } finally {
    pushing = false;
    if (pushAgain) {
      pushAgain = false;
      schedulePush();
    }
  }
}

function begin(user: User) {
  stopListening();
  if (!db) return;

  // Never let one account's data leak into another on a shared device.
  const owner = localStorage.getItem(OWNER_KEY);
  if (owner && owner !== user.uid) useStore.getState().clearLocalData();
  localStorage.setItem(OWNER_KEY, user.uid);

  ref = doc(db, 'users', user.uid);
  setSyncStatus({ state: 'syncing', email: user.email, error: null, ready: true });

  unsubSnapshot = onSnapshot(
    ref,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return; // echo of our own write
      try {
        const remote = snap.exists() ? parseSyncPayload(snap.data().payload) : null;
        if (remote) useStore.getState().applyMerged(remote, { ignoreEpoch: linking });
        linking = false;
        // Upload if the cloud is missing something we have (or has nothing yet).
        const local = selectPersistedData(useStore.getState());
        if (!remote || canonicalize(local) !== canonicalize(remote)) schedulePush(0);
        else setSyncStatus({ state: 'synced', lastSyncedAt: Date.now(), error: null });
      } catch (e) {
        setSyncStatus({ state: 'error', error: describeError(e).message });
      }
    },
    (e) => {
      const { offline, message } = describeError(e);
      setSyncStatus(offline ? { state: 'offline' } : { state: 'error', error: message });
    }
  );

  unsubStore = useStore.subscribe((state, prev) => {
    if (SYNCED_KEYS.some((k) => state[k] !== prev[k])) schedulePush();
  });
  window.addEventListener('online', onOnline);
}

function end() {
  stopListening();
  setSyncStatus({ state: 'signed-out', email: null, lastSyncedAt: null, error: null, ready: true });
}

/** Start listening for sign-in state. Safe to call more than once. */
export function initSync(): void {
  if (!isFirebaseConfigured || started) return;
  started = true;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  db = getFirestore(app);
  onAuthStateChanged(getAuth(app), (user) => (user ? begin(user) : end()));
}

type Result = string | null; // null = success, otherwise a user-facing error message

export async function signUp(email: string, password: string): Promise<Result> {
  try {
    linking = true;
    await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
    return null;
  } catch (e) {
    linking = false;
    return describeError(e).message;
  }
}

export async function signIn(email: string, password: string): Promise<Result> {
  try {
    linking = true;
    await signInWithEmailAndPassword(getAuth(), email.trim(), password);
    return null;
  } catch (e) {
    linking = false;
    return describeError(e).message;
  }
}

export async function resetPassword(email: string): Promise<Result> {
  try {
    await sendPasswordResetEmail(getAuth(), email.trim());
    return null;
  } catch (e) {
    return describeError(e).message;
  }
}

/**
 * Upload any pending changes, sign out, and empty this device so the next person
 * to use it doesn't see (or upload) your data. Your data stays in the cloud.
 */
export async function signOutAndClear(): Promise<Result> {
  if (pushTimer) clearTimeout(pushTimer);
  if (!(await push())) {
    return "Couldn't upload your latest changes. Reconnect to the internet and try again.";
  }
  stopListening(); // so clearing this device below can't trigger an upload
  try {
    await firebaseSignOut(getAuth());
  } catch (e) {
    return describeError(e).message;
  }
  localStorage.removeItem(OWNER_KEY);
  useStore.getState().clearLocalData();
  return null;
}

import { useState } from 'react';
import { Cloud, CloudOff, LogOut } from 'lucide-react';
import { isFirebaseConfigured, useSyncStatus } from '../lib/syncStatus';

// Firebase is loaded on demand so it stays out of the main bundle.
const loadSync = () => import('../lib/sync');

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function CloudSyncSection() {
  const { state, ready, email: accountEmail, lastSyncedAt, error } = useSyncStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isFirebaseConfigured) {
    return (
      <p className="text-white/40 text-xs">
        Cloud sync isn't set up for this build, so your data stays on this device only. See
        FIREBASE_SETUP.md to enable it.
      </p>
    );
  }

  const run = async (action: () => Promise<string | null>, success?: string) => {
    setBusy(true);
    setMessage(null);
    const err = await action();
    setBusy(false);
    if (err) setMessage({ ok: false, text: err });
    else if (success) setMessage({ ok: true, text: success });
  };

  const signedIn = state !== 'signed-out';

  if (!ready) return <p className="text-white/40 text-xs">Checking sign-in…</p>;

  if (signedIn) {
    const label =
      state === 'syncing'
        ? 'Syncing…'
        : state === 'offline'
          ? 'Offline — changes will sync when you reconnect'
          : state === 'error'
            ? 'Sync problem'
            : lastSyncedAt
              ? `Synced at ${formatTime(lastSyncedAt)}`
              : 'Synced';
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {state === 'offline' || state === 'error' ? (
            <CloudOff size={18} className="text-amber-400 mt-0.5 shrink-0" />
          ) : (
            <Cloud size={18} className="text-green-400 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{accountEmail}</p>
            <p className="text-white/40 text-xs" role="status">
              {label}
            </p>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
        </div>
        <p className="text-white/40 text-xs">
          Your habits and progress sync across every device signed in to this account.
        </p>
        <button
          type="button"
          disabled={busy}
          className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1.5 disabled:opacity-50"
          onClick={() =>
            run(async () => (await loadSync()).signOutAndClear(), undefined)
          }
        >
          <LogOut size={13} />
          Sign out (clears this device, keeps your cloud data)
        </button>
        {message && (
          <p role="status" className={`text-xs ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => (await loadSync()).signIn(email, password));
      }}
    >
      <p className="text-white/40 text-xs">
        Sign in to keep your habits in sync across your phone and computer. Anything already on this device
        is merged into your account.
      </p>
      <input
        type="email"
        autoComplete="email"
        required
        className="input-field"
        placeholder="Email"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        autoComplete="current-password"
        required
        minLength={6}
        className="input-field"
        placeholder="Password (6+ characters)"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary py-2 px-3 text-sm disabled:opacity-50">
          Sign in
        </button>
        <button
          type="button"
          disabled={busy || !email || password.length < 6}
          className="btn-primary py-2 px-3 text-sm disabled:opacity-50"
          onClick={() => run(async () => (await loadSync()).signUp(email, password))}
        >
          Create account
        </button>
      </div>
      <button
        type="button"
        disabled={busy || !email}
        className="text-xs text-white/50 hover:text-white disabled:opacity-40"
        onClick={() =>
          run(
            async () => (await loadSync()).resetPassword(email),
            'If that email has an account, a reset link is on its way.'
          )
        }
      >
        Forgot password?
      </button>
      {message && (
        <p role="status" className={`text-xs ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

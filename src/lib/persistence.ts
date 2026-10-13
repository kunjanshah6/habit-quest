import type { Habit, HabitCompletion, UserAchievement, UserSettings } from '../types';
import { ACHIEVEMENTS } from './achievements';

export const BACKUP_APP_ID = 'habit-quest';
export const DEFAULT_STREAK_SHIELDS = 2;

export const DEFAULT_SETTINGS: UserSettings = {
  name: 'Adventurer',
  avatar: '🦸',
  theme: 'dark',
  accentColor: 'blue',
  motivationStyle: 'energetic',
  soundEnabled: true,
  animationsEnabled: true,
  notificationsEnabled: false,
  celebrationsEnabled: true,
};

export interface PersistedData {
  habits: Habit[];
  completions: HabitCompletion[];
  userAchievements: UserAchievement[];
  settings: UserSettings;
  totalXP: number;
  streakShields: number;
  /**
   * Timestamp of the last Reset/Import. When two devices disagree on this, the
   * higher one wins outright instead of being merged, so a reset isn't undone
   * by a device that still has old data.
   */
  epoch: number;
  /** Timestamp of the last settings change; the newer settings win on merge. */
  settingsUpdatedAt: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonNegativeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/**
 * Coerces untrusted data (old localStorage versions, imported files, cloud data)
 * into a valid PersistedData. Malformed entries are dropped; missing fields get defaults.
 */
export function sanitizePersisted(raw: unknown): PersistedData {
  const s = isRecord(raw) ? raw : {};
  const list = (v: unknown) => (Array.isArray(v) ? v : []);

  return {
    habits: list(s.habits).filter(
      (h): h is Habit => isRecord(h) && typeof h.id === 'string' && typeof h.name === 'string'
    ),
    completions: list(s.completions).filter(
      (c): c is HabitCompletion =>
        isRecord(c) &&
        typeof c.id === 'string' &&
        typeof c.habitId === 'string' &&
        typeof c.date === 'string' &&
        typeof c.status === 'string'
    ),
    userAchievements: list(s.userAchievements).filter(
      (a): a is UserAchievement => isRecord(a) && typeof a.achievementId === 'string'
    ),
    settings: { ...DEFAULT_SETTINGS, ...(isRecord(s.settings) ? s.settings : {}) },
    totalXP: nonNegativeNumber(s.totalXP, 0),
    streakShields: nonNegativeNumber(s.streakShields, DEFAULT_STREAK_SHIELDS),
    epoch: nonNegativeNumber(s.epoch, 0),
    settingsUpdatedAt: nonNegativeNumber(s.settingsUpdatedAt, 0),
  };
}

export function serializeBackup(data: PersistedData): string {
  return JSON.stringify(
    { app: BACKUP_APP_ID, exportedAt: new Date().toISOString(), data },
    null,
    2
  );
}

/** Parses a backup file. Throws an Error with a user-facing message if invalid. */
export function parseBackup(text: string): PersistedData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!isRecord(parsed) || parsed.app !== BACKUP_APP_ID || !isRecord(parsed.data)) {
    throw new Error('File is not a HabitQuest backup.');
  }
  if (!Array.isArray(parsed.data.habits) || !Array.isArray(parsed.data.completions)) {
    throw new Error('Backup is missing habit data.');
  }
  return sanitizePersisted(parsed.data);
}

// ---------------------------------------------------------------------------
// Cloud sync helpers
// ---------------------------------------------------------------------------

/** Parses the JSON stored in the cloud. Throws if it isn't a HabitQuest payload. */
export function parseSyncPayload(json: unknown): PersistedData {
  let parsed: unknown;
  try {
    parsed = typeof json === 'string' ? JSON.parse(json) : null;
  } catch {
    parsed = null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.habits) || !Array.isArray(parsed.completions)) {
    throw new Error('Cloud data is unreadable.');
  }
  return sanitizePersisted(parsed);
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (isRecord(v)) {
    const body = Object.keys(v)
      .sort()
      .filter((k) => v[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`);
    return `{${body.join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

function sortedBy<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

/**
 * Order- and key-order-insensitive string form of the data. Two devices that
 * hold the same information produce the same string, which is how sync decides
 * whether anything needs to be written.
 */
export function canonicalize(d: PersistedData): string {
  return stableStringify({
    ...d,
    habits: sortedBy(d.habits, (h) => h.id),
    completions: sortedBy(d.completions, (c) => c.id),
    userAchievements: sortedBy(d.userAchievements, (a) => a.achievementId),
  });
}

/** Union by key. Local order is kept; remote-only items are appended. */
function unionBy<T>(local: T[], remote: T[], key: (item: T) => string, pick: (l: T, r: T) => T): T[] {
  const byKey = new Map<string, T>();
  for (const item of local) byKey.set(key(item), item);
  for (const item of remote) {
    const k = key(item);
    const existing = byKey.get(k);
    byKey.set(k, existing === undefined ? item : pick(existing, item));
  }
  return [...byKey.values()];
}

const pickHabit = (l: Habit, r: Habit): Habit => {
  if (l.archivedAt && r.archivedAt) return r.archivedAt < l.archivedAt ? r : l;
  return r.archivedAt ? r : l; // archiving is never undone by a stale copy
};
const pickCompletion = (l: HabitCompletion, r: HabitCompletion): HabitCompletion =>
  r.completedAt > l.completedAt ? r : l; // the most recent action on that day wins
const pickAchievement = (l: UserAchievement, r: UserAchievement): UserAchievement =>
  r.unlockedAt < l.unlockedAt ? r : l; // keep the earliest unlock time

/**
 * Picks which side's settings survive a merge. This must give the same answer on
 * every device, otherwise two devices would keep overwriting each other forever.
 */
function pickSettings(local: PersistedData, remote: PersistedData): UserSettings {
  if (local.settingsUpdatedAt !== remote.settingsUpdatedAt) {
    return local.settingsUpdatedAt > remote.settingsUpdatedAt ? local.settings : remote.settings;
  }
  // Tie (typically both 0 = never edited since upgrade): prefer settings the user changed,
  // then fall back to a stable ordering so both sides choose the same one.
  const l = stableStringify(local.settings);
  const r = stableStringify(remote.settings);
  const d = stableStringify(DEFAULT_SETTINGS);
  if (l === r) return local.settings;
  if (l === d) return remote.settings;
  if (r === d) return local.settings;
  return l > r ? local.settings : remote.settings;
}

function achievementXP(id: string): number {
  return ACHIEVEMENTS.find((a) => a.id === id)?.xpReward ?? 0;
}

/** XP from completions and achievements that `from` has and `than` doesn't. */
function xpOnlyIn(from: PersistedData, than: PersistedData): number {
  const completionIds = new Set(than.completions.map((c) => c.id));
  const achievementIds = new Set(than.userAchievements.map((a) => a.achievementId));
  return (
    from.completions.filter((c) => !completionIds.has(c.id)).reduce((sum, c) => sum + c.xpEarned, 0) +
    from.userAchievements
      .filter((a) => !achievementIds.has(a.achievementId))
      .reduce((sum, a) => sum + achievementXP(a.achievementId), 0)
  );
}

/**
 * Combines two copies of a user's data.
 *
 * - Different epochs: the higher one wins outright (a Reset/Import beats older data).
 *   Pass `ignoreEpoch` to merge anyway, e.g. when first linking a device to an account.
 * - Habits, completions and achievements are unioned; conflicts resolve as described
 *   by the `pick*` helpers above.
 * - Settings: the most recently changed side wins (see pickSettings for ties).
 * - Streak shields: the lower count wins, so a shield spent anywhere stays spent.
 * - XP: each side's total plus the XP of items only the other side has; the larger wins.
 *   Bonus XP (perfect day, streak milestones) isn't stored per item, so when both
 *   devices earn different bonuses offline this can be slightly low, never double-counted.
 */
export function mergeData(
  local: PersistedData,
  remote: PersistedData,
  opts: { ignoreEpoch?: boolean } = {}
): PersistedData {
  if (!opts.ignoreEpoch && local.epoch !== remote.epoch) {
    return local.epoch > remote.epoch ? local : remote;
  }

  // Symmetric on purpose: merge(a, b) and merge(b, a) must agree, or two devices
  // would keep overwriting each other with different totals.
  const totalXP = Math.max(
    local.totalXP + xpOnlyIn(remote, local),
    remote.totalXP + xpOnlyIn(local, remote)
  );

  return {
    habits: unionBy(local.habits, remote.habits, (h) => h.id, pickHabit),
    completions: unionBy(local.completions, remote.completions, (c) => c.id, pickCompletion),
    userAchievements: unionBy(
      local.userAchievements,
      remote.userAchievements,
      (a) => a.achievementId,
      pickAchievement
    ),
    settings: pickSettings(local, remote),
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt, remote.settingsUpdatedAt),
    totalXP,
    streakShields: Math.min(local.streakShields, remote.streakShields),
    epoch: Math.max(local.epoch, remote.epoch),
  };
}

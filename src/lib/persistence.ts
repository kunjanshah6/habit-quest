import type { Habit, HabitCompletion, UserAchievement, UserSettings } from '../types';

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
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonNegativeNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/**
 * Coerces untrusted data (old localStorage versions, imported files) into a
 * valid PersistedData. Malformed entries are dropped; missing fields get defaults.
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

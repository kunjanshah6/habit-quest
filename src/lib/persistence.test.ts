import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STREAK_SHIELDS,
  parseBackup,
  sanitizePersisted,
  serializeBackup,
} from './persistence';

const habit = {
  id: 'h1',
  userId: 'u',
  name: 'Run',
  icon: 'x',
  category: 'Fitness',
  difficulty: 'easy',
  frequency: 'daily',
  xpReward: 10,
  createdAt: '2024-01-01',
  color: '#fff',
};

const completion = {
  id: 'c1',
  habitId: 'h1',
  userId: 'u',
  date: '2024-06-15',
  status: 'done',
  xpEarned: 10,
  completedAt: '2024-06-15T10:00:00.000Z',
};

describe('sanitizePersisted', () => {
  it.each([null, undefined, 'string', 42, [], true])('returns defaults for %j', (input) => {
    const out = sanitizePersisted(input);
    expect(out.habits).toEqual([]);
    expect(out.completions).toEqual([]);
    expect(out.userAchievements).toEqual([]);
    expect(out.totalXP).toBe(0);
    expect(out.streakShields).toBe(DEFAULT_STREAK_SHIELDS);
    expect(out.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid entries and drops malformed ones', () => {
    const out = sanitizePersisted({
      habits: [habit, { id: 5 }, null, 'x'],
      completions: [completion, { id: 'c2' }],
      userAchievements: [{ achievementId: 'first_step' }, { foo: 1 }],
    });
    expect(out.habits).toHaveLength(1);
    expect(out.completions).toHaveLength(1);
    expect(out.userAchievements).toHaveLength(1);
  });

  it('fills missing settings fields from defaults', () => {
    const out = sanitizePersisted({ settings: { name: 'Sam' } });
    expect(out.settings.name).toBe('Sam');
    expect(out.settings.accentColor).toBe(DEFAULT_SETTINGS.accentColor);
  });

  it('rejects invalid numbers', () => {
    expect(sanitizePersisted({ totalXP: -5 }).totalXP).toBe(0);
    expect(sanitizePersisted({ totalXP: NaN }).totalXP).toBe(0);
    expect(sanitizePersisted({ totalXP: '100' }).totalXP).toBe(0);
    expect(sanitizePersisted({ totalXP: 250 }).totalXP).toBe(250);
  });

  it('preserves 0 shields rather than resetting to the default', () => {
    expect(sanitizePersisted({ streakShields: 0 }).streakShields).toBe(0);
  });

  it('defaults shields when missing (data from older versions)', () => {
    expect(sanitizePersisted({ habits: [habit] }).streakShields).toBe(DEFAULT_STREAK_SHIELDS);
  });
});

describe('serializeBackup / parseBackup', () => {
  const data = sanitizePersisted({
    habits: [habit],
    completions: [completion],
    totalXP: 120,
    streakShields: 1,
    settings: { name: 'Sam' },
  });

  it('round-trips data', () => {
    const restored = parseBackup(serializeBackup(data));
    expect(restored).toEqual(data);
  });

  it('rejects non-JSON', () => {
    expect(() => parseBackup('not json')).toThrow('not valid JSON');
  });

  it('rejects JSON from another app', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', data: {} }))).toThrow('not a HabitQuest backup');
  });

  it('rejects arrays and primitives', () => {
    expect(() => parseBackup('[]')).toThrow('not a HabitQuest backup');
    expect(() => parseBackup('null')).toThrow('not a HabitQuest backup');
  });

  it('rejects a backup with no habit data', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'habit-quest', data: { totalXP: 5 } }))).toThrow(
      'missing habit data'
    );
  });
});

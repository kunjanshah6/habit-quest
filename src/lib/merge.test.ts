import { describe, expect, it } from 'vitest';
import type { Habit, HabitCompletion } from '../types';
import { DEFAULT_SETTINGS, canonicalize, mergeData, parseSyncPayload, sanitizePersisted } from './persistence';
import type { PersistedData } from './persistence';

const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  userId: 'u',
  name: id,
  icon: 'x',
  category: 'Health',
  difficulty: 'easy',
  frequency: 'daily',
  xpReward: 10,
  createdAt: '2024-06-01',
  color: '#fff',
  ...extra,
});

const completion = (id: string, extra: Partial<HabitCompletion> = {}): HabitCompletion => ({
  id,
  habitId: 'h1',
  userId: 'u',
  date: '2024-06-10',
  status: 'done',
  xpEarned: 10,
  completedAt: '2024-06-10T08:00:00.000Z',
  ...extra,
});

const data = (over: Partial<PersistedData> = {}): PersistedData => ({
  ...sanitizePersisted({}),
  ...over,
});

/** merge(a,b) and merge(b,a) must agree, otherwise devices ping-pong forever. */
const converges = (a: PersistedData, b: PersistedData, opts?: { ignoreEpoch?: boolean }) =>
  expect(canonicalize(mergeData(a, b, opts))).toBe(canonicalize(mergeData(b, a, opts)));

describe('mergeData', () => {
  it('unions habits and completions from both sides', () => {
    const a = data({ habits: [habit('h1')], completions: [completion('c1')], totalXP: 10 });
    const b = data({ habits: [habit('h2')], completions: [completion('c2', { habitId: 'h2' })], totalXP: 10 });
    const m = mergeData(a, b);
    expect(m.habits.map((h) => h.id).sort()).toEqual(['h1', 'h2']);
    expect(m.completions.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    converges(a, b);
  });

  it('does not duplicate items both sides already have', () => {
    const a = data({ habits: [habit('h1')], completions: [completion('c1')], totalXP: 10 });
    const m = mergeData(a, a);
    expect(m.habits).toHaveLength(1);
    expect(m.completions).toHaveLength(1);
    expect(m.totalXP).toBe(10);
  });

  it('is idempotent', () => {
    const a = data({ habits: [habit('h1')], completions: [completion('c1')], totalXP: 10 });
    const b = data({ habits: [habit('h2')], totalXP: 50 });
    const once = mergeData(a, b);
    expect(canonicalize(mergeData(once, b))).toBe(canonicalize(once));
    expect(canonicalize(mergeData(once, a))).toBe(canonicalize(once));
  });

  it('keeps the most recent action when both sides changed the same day', () => {
    const early = completion('c1', { status: 'missed', xpEarned: 0, completedAt: '2024-06-10T08:00:00.000Z' });
    const late = completion('c1', { status: 'done', xpEarned: 10, completedAt: '2024-06-10T20:00:00.000Z' });
    const a = data({ completions: [early] });
    const b = data({ completions: [late] });
    expect(mergeData(a, b).completions[0].status).toBe('done');
    converges(a, b);
  });

  it('never un-archives a habit', () => {
    const a = data({ habits: [habit('h1')] });
    const b = data({ habits: [habit('h1', { archivedAt: '2024-06-12T00:00:00.000Z' })] });
    expect(mergeData(a, b).habits[0].archivedAt).toBeDefined();
    expect(mergeData(b, a).habits[0].archivedAt).toBeDefined();
  });

  it('keeps the earliest unlock time for an achievement', () => {
    const a = data({ userAchievements: [{ userId: 'u', achievementId: 'first_step', unlockedAt: '2024-06-05T00:00:00Z' }] });
    const b = data({ userAchievements: [{ userId: 'u', achievementId: 'first_step', unlockedAt: '2024-06-01T00:00:00Z' }] });
    const m = mergeData(a, b);
    expect(m.userAchievements).toHaveLength(1);
    expect(m.userAchievements[0].unlockedAt).toBe('2024-06-01T00:00:00Z');
    converges(a, b);
  });

  describe('streak shields', () => {
    it('a shield spent on either device stays spent', () => {
      expect(mergeData(data({ streakShields: 2 }), data({ streakShields: 1 })).streakShields).toBe(1);
      expect(mergeData(data({ streakShields: 0 }), data({ streakShields: 2 })).streakShields).toBe(0);
    });
  });

  describe('XP', () => {
    it("adds XP for items only the other side has, without double counting", () => {
      // Phone did c1 (10xp), laptop did c2 (10xp) while offline
      const phone = data({ completions: [completion('c1')], totalXP: 10 });
      const laptop = data({ completions: [completion('c2')], totalXP: 10 });
      expect(mergeData(phone, laptop).totalXP).toBe(20);
      expect(mergeData(laptop, phone).totalXP).toBe(20);
    });

    it('keeps bonus XP held by the larger side', () => {
      const big = data({ completions: [completion('c1')], totalXP: 110 }); // includes a 100 bonus
      const small = data({ completions: [completion('c1')], totalXP: 10 });
      expect(mergeData(big, small).totalXP).toBe(110);
      expect(mergeData(small, big).totalXP).toBe(110);
    });

    it('converges even when totals tie but the items differ', () => {
      const a = data({ completions: [completion('c1', { xpEarned: 10 })], totalXP: 15 });
      const b = data({ completions: [completion('c2', { xpEarned: 20 })], totalXP: 15 });
      converges(a, b);
    });
  });

  describe('settings', () => {
    const named = (name: string) => ({ ...DEFAULT_SETTINGS, name });

    it('takes the most recently changed side', () => {
      const old = data({ settings: named('Old'), settingsUpdatedAt: 100 });
      const recent = data({ settings: named('New'), settingsUpdatedAt: 200 });
      expect(mergeData(old, recent).settings.name).toBe('New');
      expect(mergeData(recent, old).settings.name).toBe('New');
    });

    it('prefers customised settings over defaults when neither has a timestamp', () => {
      const defaults = data();
      const custom = data({ settings: named('Sam') });
      expect(mergeData(defaults, custom).settings.name).toBe('Sam');
      expect(mergeData(custom, defaults).settings.name).toBe('Sam');
    });

    it('converges when two customised devices tie', () => {
      converges(data({ settings: named('Alex') }), data({ settings: named('Sam') }));
    });
  });

  describe('epoch (reset / import)', () => {
    const old = data({ epoch: 100, habits: [habit('h1')], completions: [completion('c1')], totalXP: 500 });

    it('a newer reset wins over devices that still have old data', () => {
      const reset = data({ epoch: 200, settingsUpdatedAt: 200 });
      const m = mergeData(old, reset);
      expect(m.habits).toHaveLength(0);
      expect(m.totalXP).toBe(0);
      expect(mergeData(reset, old).habits).toHaveLength(0);
    });

    it('a device holding the older epoch cannot overwrite a newer one', () => {
      const imported = data({ epoch: 300, habits: [habit('h9')], totalXP: 7 });
      expect(mergeData(old, imported).habits.map((h) => h.id)).toEqual(['h9']);
    });

    it('a freshly emptied device (epoch 0) never wipes real data', () => {
      const emptied = data({ epoch: 0 });
      expect(mergeData(emptied, old).habits).toHaveLength(1);
      expect(mergeData(old, emptied).habits).toHaveLength(1);
    });

    it('ignoreEpoch merges instead of letting the higher epoch win (first sign-in)', () => {
      const localOnly = data({ epoch: 50, habits: [habit('local')], totalXP: 0 });
      const cloud = data({ epoch: 100, habits: [habit('cloud')], totalXP: 0 });
      const m = mergeData(localOnly, cloud, { ignoreEpoch: true });
      expect(m.habits.map((h) => h.id).sort()).toEqual(['cloud', 'local']);
      expect(m.epoch).toBe(100);
      converges(localOnly, cloud, { ignoreEpoch: true });
    });
  });
});

describe('canonicalize', () => {
  it('ignores item order and key order', () => {
    const a = data({ habits: [habit('h1'), habit('h2')] });
    const b = data({ habits: [habit('h2'), habit('h1')] });
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('detects real differences', () => {
    expect(canonicalize(data({ totalXP: 1 }))).not.toBe(canonicalize(data({ totalXP: 2 })));
  });
});

describe('parseSyncPayload', () => {
  it('parses a valid payload', () => {
    const json = JSON.stringify(data({ habits: [habit('h1')], totalXP: 5 }));
    expect(parseSyncPayload(json).habits).toHaveLength(1);
  });

  it.each([undefined, null, 5, '', 'not json', '[]', '{"habits":1}', '{"habits":[]}'])(
    'throws for unreadable payload %j (so the cloud copy is never overwritten)',
    (input) => {
      expect(() => parseSyncPayload(input)).toThrow('unreadable');
    }
  );
});

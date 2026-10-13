import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Habit, HabitCompletion } from '../types';
import {
  calculateConsistencyScore,
  getCompletionRate,
  getDailyScore,
  getHabitStreak,
  getLongestStreak,
  getOverallStreak,
  isHabitScheduledOn,
  toDateStr,
} from './streaks';

// Saturday 15 June 2024, local noon
const NOW = new Date(2024, 5, 15, 12, 0, 0);

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    userId: 'u',
    name: 'Test',
    icon: 'x',
    category: 'Health',
    difficulty: 'easy',
    frequency: 'daily',
    xpReward: 10,
    createdAt: '2024-01-01',
    color: '#fff',
    ...overrides,
  };
}

function done(habitId: string, date: string, status: HabitCompletion['status'] = 'done'): HabitCompletion {
  return {
    id: `c_${habitId}_${date}`,
    habitId,
    userId: 'u',
    date,
    status,
    xpEarned: status === 'done' ? 10 : 0,
    completedAt: `${date}T10:00:00.000Z`,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toDateStr', () => {
  it('formats as yyyy-MM-dd in local time', () => {
    expect(toDateStr(new Date(2024, 0, 5, 23, 59))).toBe('2024-01-05');
  });
});

describe('isHabitScheduledOn', () => {
  const saturday = new Date(2024, 5, 15);
  const monday = new Date(2024, 5, 17);

  it('daily is always scheduled', () => {
    const h = makeHabit({ frequency: 'daily' });
    expect(isHabitScheduledOn(h, saturday)).toBe(true);
    expect(isHabitScheduledOn(h, monday)).toBe(true);
  });

  it('weekdays excludes weekends', () => {
    const h = makeHabit({ frequency: 'weekdays' });
    expect(isHabitScheduledOn(h, monday)).toBe(true);
    expect(isHabitScheduledOn(h, saturday)).toBe(false);
  });

  it('weekends excludes weekdays', () => {
    const h = makeHabit({ frequency: 'weekends' });
    expect(isHabitScheduledOn(h, saturday)).toBe(true);
    expect(isHabitScheduledOn(h, monday)).toBe(false);
  });

  it('custom uses customDays (0=Sun)', () => {
    const h = makeHabit({ frequency: 'custom', customDays: [1, 3] });
    expect(isHabitScheduledOn(h, monday)).toBe(true);
    expect(isHabitScheduledOn(h, saturday)).toBe(false);
  });

  it('custom without customDays is never scheduled', () => {
    const h = makeHabit({ frequency: 'custom' });
    expect(isHabitScheduledOn(h, monday)).toBe(false);
  });
});

describe('getHabitStreak', () => {
  const habit = makeHabit();

  it('is 0 with no completions', () => {
    expect(getHabitStreak(habit, [])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    const c = [done('h1', '2024-06-13'), done('h1', '2024-06-14'), done('h1', '2024-06-15')];
    expect(getHabitStreak(habit, c)).toBe(3);
  });

  it('keeps the streak alive if today is not done yet but yesterday was', () => {
    const c = [done('h1', '2024-06-13'), done('h1', '2024-06-14')];
    expect(getHabitStreak(habit, c)).toBe(2);
  });

  it('stops at a gap', () => {
    const c = [done('h1', '2024-06-10'), done('h1', '2024-06-14'), done('h1', '2024-06-15')];
    expect(getHabitStreak(habit, c)).toBe(2);
  });

  it('is 0 if the last completion was two or more days ago', () => {
    expect(getHabitStreak(habit, [done('h1', '2024-06-13')])).toBe(0);
  });

  it('ignores non-done statuses and other habits', () => {
    const c = [
      done('h1', '2024-06-14', 'missed'),
      done('h1', '2024-06-15', 'skipped'),
      done('other', '2024-06-15'),
    ];
    expect(getHabitStreak(habit, c)).toBe(0);
  });

  it('respects the asOf parameter', () => {
    const c = [done('h1', '2024-06-01'), done('h1', '2024-06-02')];
    expect(getHabitStreak(habit, c, '2024-06-02')).toBe(2);
  });
});

describe('getLongestStreak', () => {
  const habit = makeHabit();

  it('is 0 with no completions', () => {
    expect(getLongestStreak(habit, [])).toBe(0);
  });

  it('finds the longest run among several', () => {
    const dates = ['2024-06-01', '2024-06-02', '2024-06-03', '2024-06-05', '2024-06-06'];
    expect(getLongestStreak(habit, dates.map((d) => done('h1', d)))).toBe(3);
  });

  it('counts a single completion as 1', () => {
    expect(getLongestStreak(habit, [done('h1', '2024-06-01')])).toBe(1);
  });

  it('is independent of input order', () => {
    const dates = ['2024-06-03', '2024-06-01', '2024-06-02'];
    expect(getLongestStreak(habit, dates.map((d) => done('h1', d)))).toBe(3);
  });

  it('ignores non-done statuses', () => {
    const c = [done('h1', '2024-06-01'), done('h1', '2024-06-02', 'missed'), done('h1', '2024-06-03')];
    expect(getLongestStreak(habit, c)).toBe(1);
  });
});

describe('getCompletionRate', () => {
  it('is 0 when nothing was scheduled', () => {
    const h = makeHabit({ createdAt: '2024-06-16' });
    expect(getCompletionRate(h, [], 10)).toBe(0);
  });

  it('computes the percentage over scheduled days since creation', () => {
    // Created Jun 10: Jun 10..15 = 6 scheduled days within a 10-day window
    const h = makeHabit({ createdAt: '2024-06-10' });
    const c = ['2024-06-10', '2024-06-12', '2024-06-15'].map((d) => done('h1', d));
    expect(getCompletionRate(h, c, 10)).toBe(50);
  });

  it('only counts scheduled days', () => {
    // Weekdays since Jun 10 (Mon): Mon-Fri Jun 10-14 = 5 scheduled; Sat 15 excluded
    const h = makeHabit({ createdAt: '2024-06-10', frequency: 'weekdays' });
    const c = ['2024-06-10', '2024-06-11'].map((d) => done('h1', d));
    expect(getCompletionRate(h, c, 10)).toBe(40);
  });
});

describe('calculateConsistencyScore', () => {
  it('is 0 with no habits', () => {
    expect(calculateConsistencyScore([], [])).toBe(0);
  });

  it('averages the per-habit rates', () => {
    const a = makeHabit({ id: 'a', createdAt: '2024-06-14' });
    const b = makeHabit({ id: 'b', createdAt: '2024-06-14' });
    // window covers Jun 14 and 15 → 2 scheduled each; a: 2/2 = 100, b: 0/2 = 0
    const c = [done('a', '2024-06-14'), done('a', '2024-06-15')];
    expect(calculateConsistencyScore([a, b], c, 5)).toBe(50);
  });
});

describe('getOverallStreak', () => {
  it('is 0 with no habits', () => {
    expect(getOverallStreak([], [])).toBe(0);
  });

  it('counts days where at least one scheduled habit was done', () => {
    const h = makeHabit();
    const c = [done('h1', '2024-06-13'), done('h1', '2024-06-14'), done('h1', '2024-06-15')];
    expect(getOverallStreak([h], c)).toBe(3);
  });

  it('is 0 when today has no completions', () => {
    expect(getOverallStreak([makeHabit()], [done('h1', '2024-06-14')])).toBe(0);
  });

  it('skips days with no scheduled habits without breaking the streak', () => {
    // Weekday habit: Sat 15 and Sun 16 are unscheduled; Fri 14 and Thu 13 done.
    vi.setSystemTime(new Date(2024, 5, 16, 12)); // Sunday
    const h = makeHabit({ frequency: 'weekdays' });
    const c = [done('h1', '2024-06-13'), done('h1', '2024-06-14')];
    expect(getOverallStreak([h], c)).toBe(2);
  });
});

describe('getDailyScore', () => {
  it('is 0 when nothing is scheduled', () => {
    expect(getDailyScore([], [], '2024-06-15')).toBe(0);
  });

  it('never exceeds 100', () => {
    const h = makeHabit({ createdAt: '2024-01-01' });
    const c = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(2024, 5, 15 - i);
      return done('h1', toDateStr(d));
    });
    expect(getDailyScore([h], c, '2024-06-15')).toBeLessThanOrEqual(100);
  });

  it('is lower when fewer habits are done', () => {
    const a = makeHabit({ id: 'a' });
    const b = makeHabit({ id: 'b' });
    const one = getDailyScore([a, b], [done('a', '2024-06-15')], '2024-06-15');
    const both = getDailyScore([a, b], [done('a', '2024-06-15'), done('b', '2024-06-15')], '2024-06-15');
    expect(both).toBeGreaterThan(one);
  });
});

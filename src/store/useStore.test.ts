import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppStore } from './useStore';

// Saturday 15 June 2024, local noon
const NOW = new Date(2024, 5, 15, 12, 0, 0);

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

// zustand's persist middleware reads `window.localStorage`, which doesn't exist in node.
function stubBrowserStorage(storage: Storage) {
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage });
}

let useStore: typeof import('./useStore').useStore;
let selectUserStats: typeof import('./useStore').selectUserStats;

beforeAll(async () => {
  stubBrowserStorage(createMemoryStorage());
  ({ useStore, selectUserStats } = await import('./useStore'));
});

const newHabit = (overrides: Partial<Parameters<AppStore['addHabit']>[0]> = {}) => ({
  name: 'Run',
  icon: 'x',
  category: 'Fitness' as const,
  difficulty: 'easy' as const,
  frequency: 'daily' as const,
  xpReward: 10,
  color: '#fff',
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  useStore.getState().resetAllData();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('addHabit', () => {
  it('assigns unique ids', () => {
    const { addHabit } = useStore.getState();
    addHabit(newHabit());
    addHabit(newHabit());
    const [a, b] = useStore.getState().habits;
    expect(a.id).not.toBe(b.id);
  });

  it('sets createdAt to today', () => {
    useStore.getState().addHabit(newHabit());
    expect(useStore.getState().habits[0].createdAt).toBe('2024-06-15');
  });
});

describe('completeHabit', () => {
  it('awards the habit XP and records a completion', () => {
    const s = useStore.getState();
    s.addHabit(newHabit({ xpReward: 20 }));
    // Two habits so the perfect-day bonus doesn't trigger
    s.addHabit(newHabit({ name: 'Read' }));
    const id = useStore.getState().habits[0].id;

    useStore.getState().completeHabit(id, 'done');

    const after = useStore.getState();
    expect(after.completions).toHaveLength(1);
    expect(after.completions[0]).toMatchObject({ habitId: id, date: '2024-06-15', status: 'done', xpEarned: 20 });
    // 20 XP + first_step achievement bonus (> 0)
    expect(after.totalXP).toBeGreaterThanOrEqual(20);
    expect(after.userAchievements.map((a) => a.achievementId)).toContain('first_step');
  });

  it('awards the perfect-day bonus when all of today is done', () => {
    useStore.getState().addHabit(newHabit({ xpReward: 10 }));
    const id = useStore.getState().habits[0].id;

    useStore.getState().completeHabit(id, 'done');

    expect(useStore.getState().celebration?.message).toMatch(/Perfect Day/);
    expect(useStore.getState().totalXP).toBeGreaterThanOrEqual(110);
  });

  it('replaces (not duplicates) a same-day completion and gives no XP for missed', () => {
    useStore.getState().addHabit(newHabit());
    useStore.getState().addHabit(newHabit({ name: 'Read' }));
    const id = useStore.getState().habits[0].id;

    useStore.getState().completeHabit(id, 'done');
    useStore.getState().completeHabit(id, 'missed');

    const comps = useStore.getState().completions.filter((c) => c.habitId === id);
    expect(comps).toHaveLength(1);
    expect(comps[0].status).toBe('missed');
    expect(comps[0].xpEarned).toBe(0);
  });

  it('ignores unknown habit ids', () => {
    useStore.getState().completeHabit('nope', 'done');
    expect(useStore.getState().completions).toHaveLength(0);
    expect(useStore.getState().totalXP).toBe(0);
  });

  it('suppresses celebrations when disabled in settings', () => {
    useStore.getState().updateSettings({ celebrationsEnabled: false });
    useStore.getState().addHabit(newHabit());
    useStore.getState().completeHabit(useStore.getState().habits[0].id, 'done');
    expect(useStore.getState().celebration).toBeNull();
  });
});

describe('archiveHabit', () => {
  it('sets archivedAt without deleting history', () => {
    useStore.getState().addHabit(newHabit());
    const id = useStore.getState().habits[0].id;
    useStore.getState().archiveHabit(id);
    expect(useStore.getState().habits[0].archivedAt).toBeDefined();
  });
});

describe('useStreakShield', () => {
  const setup = () => {
    useStore.getState().addHabit(newHabit());
    return useStore.getState().habits[0].id;
  };

  it("marks yesterday as skipped and spends one shield", () => {
    const id = setup();
    useStore.getState().useStreakShield(id);

    const s = useStore.getState();
    expect(s.streakShields).toBe(1);
    expect(s.completions).toHaveLength(1);
    expect(s.completions[0]).toMatchObject({ habitId: id, date: '2024-06-14', status: 'skipped' });
  });

  it('does not spend a shield when yesterday already has a completion', () => {
    const id = setup();
    useStore.getState().useStreakShield(id);
    useStore.getState().useStreakShield(id);
    expect(useStore.getState().streakShields).toBe(1);
    expect(useStore.getState().completions).toHaveLength(1);
  });

  it('does nothing when no shields remain', () => {
    const id = setup();
    useStore.setState({ streakShields: 0 });
    useStore.getState().useStreakShield(id);
    expect(useStore.getState().completions).toHaveLength(0);
    expect(useStore.getState().streakShields).toBe(0);
  });
});

describe('selectUserStats', () => {
  it('reports real shields and longest streak instead of demo values', () => {
    const empty = selectUserStats(useStore.getState());
    expect(empty.longestStreak).toBe(0);
    expect(empty.streakShields).toBe(2);

    useStore.getState().addHabit(newHabit());
    useStore.setState({
      completions: ['2024-06-11', '2024-06-12', '2024-06-13'].map((date) => ({
        id: `c_${date}`,
        habitId: useStore.getState().habits[0].id,
        userId: 'u',
        date,
        status: 'done' as const,
        xpEarned: 10,
        completedAt: `${date}T10:00:00.000Z`,
      })),
      streakShields: 1,
    });
    const stats = selectUserStats(useStore.getState());
    expect(stats.longestStreak).toBe(3);
    expect(stats.streakShields).toBe(1);
  });
});

describe('export / import / reset', () => {
  it('round-trips through exportData and importData', () => {
    useStore.getState().addHabit(newHabit({ name: 'Backup me' }));
    useStore.getState().completeHabit(useStore.getState().habits[0].id, 'done');
    useStore.getState().updateSettings({ name: 'Sam' });
    const before = useStore.getState();
    const json = before.exportData();
    const expected = {
      habits: before.habits,
      completions: before.completions,
      userAchievements: before.userAchievements,
      totalXP: before.totalXP,
      streakShields: before.streakShields,
      settings: before.settings,
    };

    useStore.getState().resetAllData();
    expect(useStore.getState().habits).toHaveLength(0);

    expect(useStore.getState().importData(json)).toBeNull();
    const after = useStore.getState();
    expect({
      habits: after.habits,
      completions: after.completions,
      userAchievements: after.userAchievements,
      totalXP: after.totalXP,
      streakShields: after.streakShields,
      settings: after.settings,
    }).toEqual(expected);
  });

  it('returns an error and leaves data untouched on invalid input', () => {
    useStore.getState().addHabit(newHabit());
    const error = useStore.getState().importData('{"hello": "world"}');
    expect(error).toMatch(/not a HabitQuest backup/);
    expect(useStore.getState().habits).toHaveLength(1);
  });

  it('resetAllData restores defaults', () => {
    useStore.getState().addHabit(newHabit());
    useStore.setState({ totalXP: 999, streakShields: 0 });
    useStore.getState().resetAllData();
    const s = useStore.getState();
    expect(s.habits).toHaveLength(0);
    expect(s.totalXP).toBe(0);
    expect(s.streakShields).toBe(2);
    expect(s.settings.name).toBe('Adventurer');
  });
});

describe('persist migration', () => {
  it('upgrades a v3 payload that has no streakShields', async () => {
    const v3 = {
      state: {
        habits: [
          {
            id: 'h_old',
            userId: 'u',
            name: 'Old habit',
            icon: 'x',
            category: 'Health',
            difficulty: 'easy',
            frequency: 'daily',
            xpReward: 10,
            createdAt: '2024-01-01',
            color: '#fff',
          },
        ],
        completions: [],
        userAchievements: [],
        settings: { name: 'Kunjan' },
        totalXP: 321,
      },
      version: 3,
    };

    vi.resetModules();
    stubBrowserStorage(createMemoryStorage({ 'habit-quest-storage': JSON.stringify(v3) }));
    const { useStore: fresh } = await import('./useStore');
    await fresh.persist.rehydrate();

    const s = fresh.getState();
    expect(s.habits.map((h) => h.id)).toEqual(['h_old']);
    expect(s.totalXP).toBe(321);
    expect(s.streakShields).toBe(2);
    expect(s.settings.name).toBe('Kunjan');
    expect(s.settings.accentColor).toBe('blue');
  });
});

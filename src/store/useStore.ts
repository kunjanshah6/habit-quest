import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Habit,
  HabitCompletion,
  HabitStatus,
  UserAchievement,
  UserSettings,
  NavPage,
  CelebrationEvent,
} from '../types';
import { USER_ID } from '../lib/seedData';
import { getLevelInfo, XP_REWARDS } from '../lib/levels';
import {
  getHabitStreak,
  getLongestStreak,
  getOverallStreak,
  calculateConsistencyScore,
  toDateStr,
  isHabitScheduledOn,
} from '../lib/streaks';
import { ACHIEVEMENTS } from '../lib/achievements';
import { nanoid } from '../lib/nanoid';
import { DEFAULT_SETTINGS, DEFAULT_STREAK_SHIELDS, sanitizePersisted, serializeBackup, parseBackup } from '../lib/persistence';

export interface AppStore {
  // Data
  habits: Habit[];
  completions: HabitCompletion[];
  userAchievements: UserAchievement[];
  settings: UserSettings;

  // UI State
  activePage: NavPage;
  celebration: CelebrationEvent | null;
  selectedHabitId: string | null;
  showAddHabit: boolean;
  totalXP: number;
  streakShields: number;

  // Actions
  setActivePage: (page: NavPage) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'userId' | 'createdAt'>) => void;
  archiveHabit: (habitId: string) => void;
  completeHabit: (habitId: string, status: HabitStatus) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setSelectedHabit: (habitId: string | null) => void;
  setShowAddHabit: (show: boolean) => void;
  clearCelebration: () => void;
  useStreakShield: (habitId: string) => void;

  /** Export all user data as a JSON string ready to save as a file. */
  exportData: () => string;
  /** Replace all user data from a previously exported backup JSON string.
   *  Returns null on success, or an error message string on failure. */
  importData: (json: string) => string | null;
  /** Permanently wipe all user data and reset to defaults. */
  resetAllData: () => void;

  // Derived (computed on the fly via selectors)
}

function checkAchievements(
  habits: Habit[],
  completions: HabitCompletion[],
  userAchievements: UserAchievement[],
  _totalXP: number,
  level: number,
  newCompletionStatus: HabitStatus,
  completedAt: string
): { newAchievements: UserAchievement[]; bonusXP: number } {
  const unlocked = new Set(userAchievements.map((ua) => ua.achievementId));
  const newAchievements: UserAchievement[] = [];
  let bonusXP = 0;
  const now = new Date().toISOString();

  const totalCompletions = completions.filter((c) => c.status === 'done').length;

  const checkAndAdd = (id: string) => {
    if (!unlocked.has(id)) {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (achievement) {
        newAchievements.push({ userId: USER_ID, achievementId: id, unlockedAt: now });
        bonusXP += achievement.xpReward;
        unlocked.add(id);
      }
    }
  };

  // First habit
  if (totalCompletions >= 1) checkAndAdd('first_step');
  if (totalCompletions >= 100) checkAndAdd('centenarian');
  if (totalCompletions >= 500) checkAndAdd('five_hundred');
  if (habits.length >= 5) checkAndAdd('habit_collector');

  // Level
  if (level >= 10) checkAndAdd('level_10');
  if (level >= 20) checkAndAdd('habit_legend');

  // Streak
  for (const habit of habits) {
    const streak = getHabitStreak(habit, completions);
    if (streak >= 7) checkAndAdd('on_fire');
    if (streak >= 14) checkAndAdd('two_weeks');
    if (streak >= 30) checkAndAdd('diamond_discipline');
    if (streak >= 100) checkAndAdd('centurion');
  }

  // Early bird
  const hour = parseInt(completedAt.split('T')[1]?.split(':')[0] ?? '12');
  if (hour < 8 && newCompletionStatus === 'done') checkAndAdd('early_bird');

  return { newAchievements, bonusXP };
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      habits: [],
      completions: [],
      userAchievements: [],
      settings: DEFAULT_SETTINGS,
      activePage: 'today',
      celebration: null,
      selectedHabitId: null,
      showAddHabit: false,
      totalXP: 0,
      streakShields: DEFAULT_STREAK_SHIELDS,

      setActivePage: (page) => set({ activePage: page }),
      setSelectedHabit: (habitId) => set({ selectedHabitId: habitId }),
      setShowAddHabit: (show) => set({ showAddHabit: show }),
      clearCelebration: () => set({ celebration: null }),

      addHabit: (habitData) => {
        const habit: Habit = {
          ...habitData,
          id: `h_${nanoid(10)}`,
          userId: USER_ID,
          createdAt: toDateStr(new Date()),
        };
        set((state) => ({ habits: [...state.habits, habit] }));
      },

      archiveHabit: (habitId) => {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === habitId ? { ...h, archivedAt: new Date().toISOString() } : h
          ),
        }));
      },

      completeHabit: (habitId, status) => {
        const state = get();
        const dateStr = toDateStr(new Date());
        const habit = state.habits.find((h) => h.id === habitId);
        if (!habit) return;

        // Remove existing completion for today if any
        const filtered = state.completions.filter(
          (c) => !(c.habitId === habitId && c.date === dateStr)
        );

        const completedAt = new Date().toISOString();
        const xpEarned = status === 'done' ? habit.xpReward : 0;

        const newCompletion: HabitCompletion = {
          id: `comp_${habitId}_${dateStr}`,
          habitId,
          userId: USER_ID,
          date: dateStr,
          status,
          xpEarned,
          completedAt,
        };

        const updatedCompletions = [...filtered, newCompletion];

        // Calculate new total XP
        let newTotalXP = state.totalXP + xpEarned;

        // Check perfect day bonus
        const todayHabits = state.habits.filter(
          (h) => !h.archivedAt && isHabitScheduledOn(h, new Date())
        );
        const todayCompletions = updatedCompletions.filter(
          (c) => c.date === dateStr && c.status === 'done'
        );
        const allDone = todayHabits.every((h) =>
          todayCompletions.some((c) => c.habitId === h.id)
        );

        let bonusXP = 0;
        let celebrationEvent: CelebrationEvent | null = null;

        if (allDone && todayHabits.length > 0) {
          bonusXP += XP_REWARDS.perfectDay;
          celebrationEvent = {
            type: 'large',
            message: `Perfect Day! All ${todayHabits.length} quests complete!`,
            xp: XP_REWARDS.perfectDay,
          };
        } else if (status === 'done') {
          const streak = getHabitStreak(habit, updatedCompletions);
          if (streak === 100) {
            bonusXP += XP_REWARDS.streak100;
            celebrationEvent = { type: 'legendary', message: '100-Day Streak! Legendary!', xp: XP_REWARDS.streak100 };
          } else if (streak === 30) {
            bonusXP += XP_REWARDS.streak30;
            celebrationEvent = { type: 'large', message: '30-Day Streak! Incredible!', xp: XP_REWARDS.streak30 };
          } else if (streak === 7) {
            bonusXP += XP_REWARDS.streak7;
            celebrationEvent = { type: 'medium', message: '7-Day Streak! On fire!', xp: XP_REWARDS.streak7 };
          } else if (streak === 3) {
            celebrationEvent = { type: 'small', message: '3-Day Streak! Keep it up!', xp: xpEarned };
          } else {
            celebrationEvent = { type: 'small', message: `+${xpEarned} XP`, xp: xpEarned };
          }
        }

        newTotalXP += bonusXP;

        // Check level up
        const oldLevel = getLevelInfo(state.totalXP);
        const newLevel = getLevelInfo(newTotalXP);
        if (newLevel.level > oldLevel.level) {
          celebrationEvent = {
            type: 'legendary',
            message: `LEVEL UP! You're now Level ${newLevel.level} — ${newLevel.name}!`,
          };
        }

        // Check achievements
        const { newAchievements, bonusXP: achievementXP } = checkAchievements(
          state.habits,
          updatedCompletions,
          state.userAchievements,
          newTotalXP,
          newLevel.level,
          status,
          completedAt
        );

        newTotalXP += achievementXP;

        set({
          completions: updatedCompletions,
          totalXP: newTotalXP,
          userAchievements: [...state.userAchievements, ...newAchievements],
          celebration: state.settings.celebrationsEnabled ? celebrationEvent : null,
        });
      },

      updateSettings: (settings) => {
        set((state) => ({ settings: { ...state.settings, ...settings } }));
      },

      useStreakShield: (habitId) => {
        const state = get();
        if (state.streakShields <= 0) return;

        const yesterday = toDateStr(new Date(Date.now() - 86400000));
        const existing = state.completions.find(
          (c) => c.habitId === habitId && c.date === yesterday
        );
        if (!existing) {
          const shieldComp: HabitCompletion = {
            id: `shield_${habitId}_${yesterday}`,
            habitId,
            userId: USER_ID,
            date: yesterday,
            status: 'skipped',
            xpEarned: 0,
            completedAt: new Date().toISOString(),
          };
          set((s) => ({
            completions: [...s.completions, shieldComp],
            streakShields: s.streakShields - 1,
          }));
        }
      },

      exportData: () => {
        const state = get();
        return serializeBackup({
          habits: state.habits,
          completions: state.completions,
          userAchievements: state.userAchievements,
          settings: state.settings,
          totalXP: state.totalXP,
          streakShields: state.streakShields,
        });
      },

      importData: (json) => {
        try {
          const data = parseBackup(json);
          set({
            habits: data.habits,
            completions: data.completions,
            userAchievements: data.userAchievements,
            settings: data.settings,
            totalXP: data.totalXP,
            streakShields: data.streakShields,
            activePage: 'today',
            celebration: null,
            selectedHabitId: null,
            showAddHabit: false,
          });
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : 'Import failed.';
        }
      },

      resetAllData: () => {
        set({
          habits: [],
          completions: [],
          userAchievements: [],
          settings: DEFAULT_SETTINGS,
          totalXP: 0,
          streakShields: DEFAULT_STREAK_SHIELDS,
          activePage: 'today',
          celebration: null,
          selectedHabitId: null,
          showAddHabit: false,
        });
      },
    }),
    {
      name: 'habit-quest-storage',
      version: 4,
      // Runs when the saved version is older than 4. sanitizePersisted fills in
      // defaults for any missing field (e.g. streakShields) and drops malformed entries.
      migrate: (persisted) => sanitizePersisted(persisted),
      partialize: (state) => ({
        habits: state.habits,
        completions: state.completions,
        userAchievements: state.userAchievements,
        settings: state.settings,
        totalXP: state.totalXP,
        streakShields: state.streakShields,
      }),
    }
  )
);

// Selectors
export const selectActiveHabits = (state: AppStore) =>
  state.habits.filter((h) => !h.archivedAt);

export const selectTodayHabits = (state: AppStore) => {
  const today = new Date();
  return selectActiveHabits(state).filter((h) => isHabitScheduledOn(h, today));
};

export const selectTodayCompletions = (state: AppStore) => {
  const dateStr = toDateStr(new Date());
  return state.completions.filter((c) => c.date === dateStr);
};

export const selectUserStats = (state: AppStore) => {
  const levelInfo = getLevelInfo(state.totalXP);
  const todayStr = toDateStr(new Date());
  const todayCompletions = state.completions.filter(
    (c) => c.date === todayStr && c.status === 'done'
  );
  const dailyXP = todayCompletions.reduce((s, c) => s + c.xpEarned, 0);

  const activeHabits = selectActiveHabits(state);
  const overallStreak = getOverallStreak(activeHabits, state.completions);
  const consistency = calculateConsistencyScore(activeHabits, state.completions);
  const totalCompletions = state.completions.filter((c) => c.status === 'done').length;

  const todayScheduled = activeHabits.filter((h) => isHabitScheduledOn(h, new Date()));
  const completionRate =
    todayScheduled.length > 0
      ? Math.round((todayCompletions.length / todayScheduled.length) * 100)
      : 0;

  // Compute longestStreak from actual completion data
  const longestStreak = activeHabits.reduce(
    (max, habit) => Math.max(max, getLongestStreak(habit, state.completions)),
    0
  );

  return {
    level: levelInfo.level,
    levelName: levelInfo.name,
    xp: state.totalXP,
    xpForCurrentLevel: levelInfo.minXP,
    xpForNextLevel: levelInfo.maxXP,
    currentStreak: overallStreak,
    dailyXP,
    consistencyScore: consistency,
    totalCompletions,
    completionRate,
    streakShields: state.streakShields,
    longestStreak,
    totalAchievements: state.userAchievements.length,
  };
};

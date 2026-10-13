import { format, subDays } from 'date-fns';
import type { Habit, HabitCompletion, UserAchievement } from '../types';

const USER_ID = 'user_demo';

export { USER_ID };

export const SEED_HABITS: Habit[] = [
  {
    id: 'h1',
    userId: USER_ID,
    name: 'Morning Exercise',
    icon: '🏃',
    category: 'Fitness',
    difficulty: 'medium',
    frequency: 'daily',
    xpReward: 20,
    reminderTime: '07:00',
    createdAt: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    color: '#f97316',
  },
  {
    id: 'h2',
    userId: USER_ID,
    name: 'Read 20 Minutes',
    icon: '📚',
    category: 'Learning',
    difficulty: 'easy',
    frequency: 'daily',
    xpReward: 10,
    reminderTime: '21:00',
    createdAt: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    color: '#3b82f6',
  },
  {
    id: 'h3',
    userId: USER_ID,
    name: 'Meditation',
    icon: '🧘',
    category: 'Mindfulness',
    difficulty: 'easy',
    frequency: 'daily',
    xpReward: 10,
    reminderTime: '06:30',
    createdAt: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    color: '#8b5cf6',
  },
  {
    id: 'h4',
    userId: USER_ID,
    name: 'Drink 2L Water',
    icon: '💧',
    category: 'Health',
    difficulty: 'easy',
    frequency: 'daily',
    xpReward: 10,
    createdAt: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    color: '#06b6d4',
  },
  {
    id: 'h5',
    userId: USER_ID,
    name: 'Deep Work',
    icon: '💻',
    category: 'Productivity',
    difficulty: 'hard',
    frequency: 'weekdays',
    xpReward: 30,
    reminderTime: '09:00',
    createdAt: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
    color: '#10b981',
  },
  {
    id: 'h6',
    userId: USER_ID,
    name: 'Sleep Before 11PM',
    icon: '🌙',
    category: 'Health',
    difficulty: 'medium',
    frequency: 'daily',
    xpReward: 20,
    createdAt: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
    color: '#6366f1',
  },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateSeedCompletions(): HabitCompletion[] {
  const completions: HabitCompletion[] = [];

  // Completion probabilities per habit (to make it realistic/interesting)
  const probabilities: Record<string, number> = {
    h1: 0.82,
    h2: 0.91,
    h3: 0.76,
    h4: 0.68,
    h5: 0.84,
    h6: 0.72,
  };

  for (const habit of SEED_HABITS) {
    const startDaysAgo = habit.id === 'h5' ? 60 : habit.id === 'h6' ? 45 : 90;

    for (let i = startDaysAgo; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay();

      // Check frequency
      if (habit.frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
      if (habit.frequency === 'weekends' && dayOfWeek >= 1 && dayOfWeek <= 5) continue;

      // Skip today (user will complete manually)
      if (i === 0) continue;

      const seed = parseInt(habit.id.replace('h', '')) * 10000 + i;
      const rand = seededRandom(seed);
      const prob = probabilities[habit.id] ?? 0.75;

      let status: 'done' | 'missed' | 'skipped' = 'missed';
      if (rand < prob) {
        status = 'done';
      } else if (rand < prob + 0.1) {
        status = 'skipped';
      }

      completions.push({
        id: `comp_${habit.id}_${dateStr}`,
        habitId: habit.id,
        userId: USER_ID,
        date: dateStr,
        status,
        xpEarned: status === 'done' ? habit.xpReward : 0,
        completedAt: `${dateStr}T${String(7 + Math.floor(seededRandom(seed * 2) * 14)).padStart(2, '0')}:${String(Math.floor(seededRandom(seed * 3) * 60)).padStart(2, '0')}:00`,
      });
    }
  }

  return completions;
}

export const SEED_USER_ACHIEVEMENTS: UserAchievement[] = [
  { userId: USER_ID, achievementId: 'first_step', unlockedAt: format(subDays(new Date(), 89), "yyyy-MM-dd'T'HH:mm:ss") },
  { userId: USER_ID, achievementId: 'on_fire', unlockedAt: format(subDays(new Date(), 83), "yyyy-MM-dd'T'HH:mm:ss") },
  { userId: USER_ID, achievementId: 'habit_collector', unlockedAt: format(subDays(new Date(), 60), "yyyy-MM-dd'T'HH:mm:ss") },
  { userId: USER_ID, achievementId: 'two_weeks', unlockedAt: format(subDays(new Date(), 76), "yyyy-MM-dd'T'HH:mm:ss") },
  { userId: USER_ID, achievementId: 'early_bird', unlockedAt: format(subDays(new Date(), 55), "yyyy-MM-dd'T'HH:mm:ss") },
  { userId: USER_ID, achievementId: 'centenarian', unlockedAt: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ss") },
  { userId: USER_ID, achievementId: 'level_10', unlockedAt: format(subDays(new Date(), 20), "yyyy-MM-dd'T'HH:mm:ss") },
];

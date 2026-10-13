import { format, subDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import type { Habit, HabitCompletion } from '../types';

export function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function today(): string {
  return toDateStr(new Date());
}

export function getHabitStreak(
  habit: Habit,
  completions: HabitCompletion[],
  asOf: string = today()
): number {
  const habitCompletions = completions.filter(
    (c) => c.habitId === habit.id && c.status === 'done'
  );
  const completionSet = new Set(habitCompletions.map((c) => c.date));

  let streak = 0;
  let cursor = parseISO(asOf);

  // Check if today is done
  if (!completionSet.has(toDateStr(cursor))) {
    // Maybe check yesterday as current
    cursor = subDays(cursor, 1);
  }

  while (completionSet.has(toDateStr(cursor))) {
    // Check if this day was scheduled
    if (isHabitScheduledOn(habit, cursor)) {
      streak++;
    }
    cursor = subDays(cursor, 1);
  }

  return streak;
}

export function getLongestStreak(habit: Habit, completions: HabitCompletion[]): number {
  const habitCompletions = completions
    .filter((c) => c.habitId === habit.id && c.status === 'done')
    .map((c) => c.date)
    .sort();

  if (habitCompletions.length === 0) return 0;

  let longest = 0;
  let current = 0;
  let prev: Date | null = null;

  for (const dateStr of habitCompletions) {
    const date = parseISO(dateStr);
    if (prev === null) {
      current = 1;
    } else {
      const diff = Math.round(
        (startOfDay(date).getTime() - startOfDay(prev).getTime()) / 86400000
      );
      if (diff === 1) {
        current++;
      } else {
        current = 1;
      }
    }
    if (current > longest) longest = current;
    prev = date;
  }

  return longest;
}

export function isHabitScheduledOn(habit: Habit, date: Date): boolean {
  const day = date.getDay(); // 0=Sun
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return day >= 1 && day <= 5;
    case 'weekends':
      return day === 0 || day === 6;
    case 'custom':
      return (habit.customDays ?? []).includes(day);
    default:
      return true;
  }
}

export function getCompletionRate(
  habit: Habit,
  completions: HabitCompletion[],
  days = 30
): number {
  let scheduled = 0;
  let done = 0;

  for (let i = 0; i < days; i++) {
    const d = subDays(new Date(), i);
    if (isBefore(d, parseISO(habit.createdAt))) continue;
    if (!isHabitScheduledOn(habit, d)) continue;
    scheduled++;
    const dateStr = toDateStr(d);
    const comp = completions.find((c) => c.habitId === habit.id && c.date === dateStr);
    if (comp?.status === 'done') done++;
  }

  return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
}

export function calculateConsistencyScore(
  habits: Habit[],
  completions: HabitCompletion[],
  days = 30
): number {
  if (habits.length === 0) return 0;
  const rates = habits.map((h) => getCompletionRate(h, completions, days));
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}

export function getOverallStreak(habits: Habit[], completions: HabitCompletion[]): number {
  if (habits.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  let daysChecked = 0;

  while (daysChecked <= 365) {
    const dateStr = toDateStr(cursor);
    const scheduledHabits = habits.filter((h) => isHabitScheduledOn(h, cursor));
    if (scheduledHabits.length === 0) {
      cursor = subDays(cursor, 1);
      daysChecked++;
      continue;
    }
    const dayCompletions = completions.filter((c) => c.date === dateStr && c.status === 'done');
    const completedIds = new Set(dayCompletions.map((c) => c.habitId));
    const anyDone = scheduledHabits.some((h) => completedIds.has(h.id));
    if (!anyDone) break;
    streak++;
    cursor = subDays(cursor, 1);
    daysChecked++;
  }

  return streak;
}

export function getDailyScore(
  habits: Habit[],
  completions: HabitCompletion[],
  dateStr: string
): number {
  const date = parseISO(dateStr);
  const scheduled = habits.filter((h) => isHabitScheduledOn(h, date));
  if (scheduled.length === 0) return 0;

  const done = completions.filter(
    (c) => c.date === dateStr && c.status === 'done'
  ).length;

  const baseScore = Math.round((done / scheduled.length) * 70);
  const streak = getOverallStreak(habits, completions);
  const streakBonus = Math.min(streak * 2, 20);
  const consistency = calculateConsistencyScore(habits, completions);
  const consistencyBonus = Math.round((consistency / 100) * 10);

  return Math.min(baseScore + streakBonus + consistencyBonus, 100);
}

export function isAfterCreation(habit: Habit, date: Date): boolean {
  return isAfter(date, parseISO(habit.createdAt)) || 
    toDateStr(date) === toDateStr(parseISO(habit.createdAt));
}

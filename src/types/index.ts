export type HabitStatus = 'done' | 'missed' | 'skipped' | 'pending';
export type HabitDifficulty = 'easy' | 'medium' | 'hard';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type HabitCategory =
  | 'Health'
  | 'Fitness'
  | 'Mindfulness'
  | 'Learning'
  | 'Productivity'
  | 'Finance'
  | 'Social'
  | 'Personal';

export type MotivationStyle = 'calm' | 'energetic' | 'minimal';
export type ThemeAccent = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: string;
  category: HabitCategory;
  difficulty: HabitDifficulty;
  frequency: HabitFrequency;
  customDays?: number[]; // 0=Sun, 1=Mon ... 6=Sat
  xpReward: number;
  reminderTime?: string; // HH:mm
  createdAt: string; // ISO date string
  archivedAt?: string;
  color: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: HabitStatus;
  xpEarned: number;
  completedAt: string; // ISO datetime
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: string;
  xpReward: number;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalXP: number;
  totalCompletions: number;
  consistencyScore: number;
  level: number;
  levelName: string;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  dailyXP: number;
  completionRate: number;
  streakShields: number;
}

export interface UserSettings {
  name: string;
  avatar: string;
  theme: 'dark' | 'light';
  accentColor: ThemeAccent;
  motivationStyle: MotivationStyle;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  notificationsEnabled: boolean;
  celebrationsEnabled: boolean;
}

export interface User {
  id: string;
  settings: UserSettings;
  stats: UserStats;
  createdAt: string;
}

export type NavPage = 'today' | 'insights' | 'history' | 'achievements' | 'profile' | 'settings';

export interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
}

export interface CelebrationEvent {
  type: 'small' | 'medium' | 'large' | 'legendary';
  message: string;
  xp?: number;
}

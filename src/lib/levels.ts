import type { LevelInfo } from '../types';

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Beginner', minXP: 0, maxXP: 200 },
  { level: 2, name: 'Starter', minXP: 200, maxXP: 500 },
  { level: 3, name: 'Builder', minXP: 500, maxXP: 900 },
  { level: 4, name: 'Disciplined', minXP: 900, maxXP: 1400 },
  { level: 5, name: 'Consistent', minXP: 1400, maxXP: 2000 },
  { level: 6, name: 'Focused', minXP: 2000, maxXP: 2800 },
  { level: 7, name: 'Driven', minXP: 2800, maxXP: 3800 },
  { level: 8, name: 'Dedicated', minXP: 3800, maxXP: 5000 },
  { level: 9, name: 'Elite', minXP: 5000, maxXP: 6500 },
  { level: 10, name: 'Habit Hero', minXP: 6500, maxXP: 8500 },
  { level: 11, name: 'Champion', minXP: 8500, maxXP: 11000 },
  { level: 12, name: 'Warrior', minXP: 11000, maxXP: 14000 },
  { level: 13, name: 'Unstoppable', minXP: 14000, maxXP: 18000 },
  { level: 14, name: 'Virtuoso', minXP: 18000, maxXP: 23000 },
  { level: 15, name: 'Expert', minXP: 23000, maxXP: 29000 },
  { level: 16, name: 'Master Mind', minXP: 29000, maxXP: 36000 },
  { level: 17, name: 'Titan', minXP: 36000, maxXP: 44000 },
  { level: 18, name: 'Habit Master', minXP: 44000, maxXP: 53000 },
  { level: 19, name: 'Legendary', minXP: 53000, maxXP: 63000 },
  { level: 20, name: 'Habit Legend', minXP: 63000, maxXP: 75000 },
  { level: 25, name: 'Ascendant', minXP: 75000, maxXP: 100000 },
  { level: 50, name: 'Transcendent', minXP: 100000, maxXP: Infinity },
];

export function getLevelInfo(xp: number): LevelInfo {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.minXP) current = level;
    else break;
  }
  return current;
}

export const XP_REWARDS = {
  easy: 10,
  medium: 20,
  hard: 30,
  perfectDay: 100,
  streak7: 150,
  streak30: 500,
  streak100: 1000,
};

export const CATEGORY_COLORS: Record<string, string> = {
  Health: '#ef4444',
  Fitness: '#f97316',
  Mindfulness: '#8b5cf6',
  Learning: '#3b82f6',
  Productivity: '#06b6d4',
  Finance: '#10b981',
  Social: '#ec4899',
  Personal: '#f59e0b',
};

export const CATEGORY_ICONS: Record<string, string> = {
  Health: '❤️',
  Fitness: '💪',
  Mindfulness: '🧘',
  Learning: '📚',
  Productivity: '⚡',
  Finance: '💰',
  Social: '🤝',
  Personal: '⭐',
};

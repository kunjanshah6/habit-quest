export type MotivationContext =
  | 'morning'
  | 'first_done'
  | 'halfway'
  | 'all_done'
  | 'missed_yesterday'
  | 'streak_at_risk'
  | 'streak_milestone'
  | 'level_up'
  | 'general';

export type MotivationStyle = 'calm' | 'energetic' | 'minimal';

const MESSAGES: Record<MotivationContext, string[]> = {
  morning: [
    "Your next win is one tap away.",
    "You're building something powerful.",
    "One small win today.",
    "Your future self will thank you.",
    "Yesterday you showed up. Let's do it again.",
    "The best time to start is now.",
    "Make today count.",
    "Small steps. Big results.",
    "Rise and build.",
    "A new day, a new opportunity to grow.",
  ],
  first_done: [
    "Nice. Momentum unlocked. ⚡",
    "First one down. Keep it moving.",
    "That's how it starts.",
    "You just made yourself proud.",
    "Great start. Keep the energy going.",
    "One habit closer to the best version of you.",
  ],
  halfway: [
    "You're halfway there. Keep going.",
    "50% done. You've got this.",
    "Halfway through. Don't stop now.",
    "The second half is where legends are made.",
    "You're doing great. Almost there.",
  ],
  all_done: [
    "Perfect day. You showed up for yourself. 🔥",
    "All quests complete. Today was yours.",
    "100%. Nothing left on the table.",
    "You crushed it today.",
    "Every habit checked. That's discipline.",
    "Look at you. Every single one.",
    "Flawless execution. See you tomorrow.",
  ],
  missed_yesterday: [
    "No pressure. Today is a fresh start.",
    "Yesterday doesn't define today. Let's go.",
    "Progress over perfection. Today is what matters.",
    "The comeback starts now.",
    "Every day is a new chance. Start fresh.",
  ],
  streak_at_risk: [
    "Your streak is waiting for you.",
    "One more day to keep it alive.",
    "Don't let the streak slip. You're so close.",
    "Your momentum is on the line. Worth protecting.",
    "Complete today's habits to extend your streak.",
  ],
  streak_milestone: [
    "Streak milestone unlocked! 🔥",
    "You're on a roll — don't stop now.",
    "Another milestone in the books.",
    "Consistency is your superpower.",
    "This is what dedication looks like.",
  ],
  level_up: [
    "LEVEL UP! You've earned it.",
    "New level, new you. Keep climbing.",
    "Power gained. Keep building.",
    "The grind paid off. Level up!",
    "Every level-up is proof of your consistency.",
  ],
  general: [
    "You're only 3 habits away from leveling up.",
    "Your consistency is showing.",
    "Keep the chain going.",
    "You're building something real.",
    "Progress compounds. Stay consistent.",
    "The habits you keep today shape who you become.",
    "82% weekly consistency. That's impressive.",
    "Small wins lead to massive results.",
    "You've come further than you think.",
    "The version of you 30 days from now will be grateful.",
  ],
};

const CALM_PREFIXES = ['Take a breath. ', 'One step at a time. ', ''];
const MINIMAL_TRANSFORMS: Record<string, string> = {
  "You're building something powerful.": "Show up. Build.",
  "Your future self will thank you.": "For future you.",
  "Nice. Momentum unlocked. ⚡": "Momentum.",
  "Perfect day. You showed up for yourself. 🔥": "Perfect day.",
};

export function getMotivationMessage(
  context: MotivationContext,
  style: MotivationStyle = 'energetic',
  streakDays?: number
): string {
  const pool = MESSAGES[context];
  const base = pool[Math.floor(Math.random() * pool.length)];

  if (style === 'minimal') {
    return MINIMAL_TRANSFORMS[base] ?? base.split('.')[0] + '.';
  }

  if (style === 'calm') {
    const prefix = CALM_PREFIXES[Math.floor(Math.random() * CALM_PREFIXES.length)];
    return prefix + base;
  }

  // Energetic
  if (context === 'streak_at_risk' && streakDays) {
    return `Your ${streakDays}-day streak is waiting for you. 🔥`;
  }

  return base;
}

export function getDashboardSubtitle(
  completedCount: number,
  totalCount: number,
  style: MotivationStyle,
  currentStreak: number
): string {
  if (totalCount === 0) return "Create your first habit to begin your journey.";

  const pct = totalCount > 0 ? completedCount / totalCount : 0;

  if (completedCount === 0) {
    if (currentStreak > 0) {
      return getMotivationMessage('streak_at_risk', style, currentStreak);
    }
    return getMotivationMessage('morning', style);
  }
  if (pct === 1) return getMotivationMessage('all_done', style);
  if (pct >= 0.5) return getMotivationMessage('halfway', style);
  if (completedCount === 1) return getMotivationMessage('first_done', style);
  return getMotivationMessage('general', style);
}

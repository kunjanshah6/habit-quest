import { motion } from 'framer-motion';
import { useStore, selectUserStats, selectActiveHabits } from '../store/useStore';
import { ACHIEVEMENTS } from '../lib/achievements';

export function ProfilePage() {
  const store = useStore();
  const stats = selectUserStats(store);
  const activeHabits = selectActiveHabits(store);
  const { settings, userAchievements } = store;

  const levelPct = Math.min(
    ((stats.xp - stats.xpForCurrentLevel) / (stats.xpForNextLevel - stats.xpForCurrentLevel)) * 100,
    100
  );

  const unlockedAchievements = ACHIEVEMENTS.filter((a) =>
    userAchievements.some((ua) => ua.achievementId === a.id)
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 text-center relative overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/8 to-purple-500/8 pointer-events-none" />

        <motion.div
          className="text-6xl mb-3"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {settings.avatar}
        </motion.div>

        <h1 className="text-white font-bold text-2xl">{settings.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="badge bg-brand-500/15 text-brand-400 border border-brand-500/20 text-sm">
            Level {stats.level}
          </span>
          <span className="text-white/50 text-sm">—</span>
          <span className="text-white/70 text-sm font-medium">{stats.levelName}</span>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/40 mb-1.5">
            <span>{stats.xp.toLocaleString()} XP</span>
            <span>{stats.xpForNextLevel.toLocaleString()} XP</span>
          </div>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${levelPct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <p className="text-white/30 text-xs mt-1.5 text-center">
            {Math.max(stats.xpForNextLevel - stats.xp, 0).toLocaleString()} XP to Level {stats.level + 1}
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        {[
          { icon: '🔥', value: `${stats.longestStreak} days`, label: 'Best Streak', color: 'text-amber-400' },
          { icon: '✅', value: stats.totalCompletions.toLocaleString(), label: 'Total Completions', color: 'text-green-400' },
          { icon: '📈', value: `${stats.consistencyScore}%`, label: 'Consistency', color: 'text-brand-400' },
          { icon: '🏆', value: `${userAchievements.length}`, label: 'Achievements', color: 'text-purple-400' },
        ].map(({ icon, value, label, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            className="glass-card p-4 flex items-center gap-3"
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <p className={`font-bold text-lg ${color}`}>{value}</p>
              <p className="text-white/40 text-xs">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Active Habits */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-5"
      >
        <h2 className="text-white font-semibold mb-3">Active Habits ({activeHabits.length})</h2>
        {activeHabits.length === 0 ? (
          <p className="text-white/30 text-sm">No active habits yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeHabits.map((habit) => (
              <span
                key={habit.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: `${habit.color}15`,
                  border: `1px solid ${habit.color}30`,
                  color: habit.color,
                }}
              >
                {habit.icon} {habit.name}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Achievement Badges */}
      {unlockedAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5"
        >
          <h2 className="text-white font-semibold mb-3">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {unlockedAchievements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300 }}
                className="flex flex-col items-center gap-1 p-2"
                title={a.name}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-amber-500/20 bg-amber-500/8">
                  {a.icon}
                </div>
                <span className="text-white/40 text-[10px] text-center max-w-[48px] truncate">{a.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Current Streak */}
      {stats.currentStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 flex items-center gap-4 border border-amber-500/15"
        >
          <motion.div
            className="text-4xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            🔥
          </motion.div>
          <div>
            <p className="text-amber-400 font-bold text-xl">{stats.currentStreak}-Day Streak</p>
            <p className="text-white/40 text-sm">Keep showing up. You're building something real.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

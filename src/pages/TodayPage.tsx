import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Flame, Zap, Trophy, Target, Shield } from 'lucide-react';
import { useStore, selectTodayHabits, selectTodayCompletions, selectUserStats } from '../store/useStore';
import { HabitCard } from '../components/HabitCard';
import { getDashboardSubtitle } from '../lib/motivation';
import { getDailyScore, toDateStr } from '../lib/streaks';

export function TodayPage() {
  const store = useStore();
  const { settings, setShowAddHabit, setSelectedHabit, habits, completions } = store;

  const todayHabits = selectTodayHabits(store);
  const todayCompletions = selectTodayCompletions(store);
  const stats = selectUserStats(store);

  const todayStr = toDateStr(new Date());
  const dailyScore = getDailyScore(habits.filter(h => !h.archivedAt), completions, todayStr);

  const completedCount = todayCompletions.filter((c) => c.status === 'done').length;
  const totalCount = todayHabits.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const subtitle = useMemo(
    () => getDashboardSubtitle(completedCount, totalCount, settings.motivationStyle, stats.currentStreak),
    [completedCount, totalCount, settings.motivationStyle, stats.currentStreak]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const getCompletionForHabit = (habitId: string) =>
    todayCompletions.find((c) => c.habitId === habitId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-white/40 text-sm font-medium">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <h1 className="text-2xl font-bold text-white mt-0.5">
          {greeting}, {settings.name} 👋
        </h1>
        <p className="text-white/50 text-sm mt-1">{subtitle}</p>
      </motion.div>

      {/* Level + Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">Level {stats.level}</span>
              <span className="badge bg-brand-500/15 text-brand-400 border border-brand-500/20">
                {stats.levelName}
              </span>
            </div>
            <p className="text-white/40 text-xs mt-0.5">
              {stats.xp.toLocaleString()} / {stats.xpForNextLevel.toLocaleString()} XP
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-xs">to level up</p>
            <p className="text-brand-400 font-semibold text-sm">
              {Math.max(stats.xpForNextLevel - stats.xp, 0).toLocaleString()} XP
            </p>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min(
                ((stats.xp - stats.xpForCurrentLevel) /
                  (stats.xpForNextLevel - stats.xpForCurrentLevel)) *
                  100,
                100
              )}%`,
            }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 text-amber-400 mb-0.5">
              <Flame size={14} />
              <span className="font-bold text-sm">{stats.currentStreak}</span>
            </div>
            <p className="text-white/30 text-[10px]">Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 text-brand-400 mb-0.5">
              <Zap size={14} />
              <span className="font-bold text-sm">+{stats.dailyXP}</span>
            </div>
            <p className="text-white/30 text-[10px]">Today XP</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 text-purple-400 mb-0.5">
              <Trophy size={14} />
              <span className="font-bold text-sm">{stats.totalAchievements}</span>
            </div>
            <p className="text-white/30 text-[10px]">Badges</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-0.5 text-green-400 mb-0.5">
              <Target size={14} />
              <span className="font-bold text-sm">{stats.consistencyScore}%</span>
            </div>
            <p className="text-white/30 text-[10px]">Rate</p>
          </div>
        </div>
      </motion.div>

      {/* Today's Quest Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white font-semibold text-sm">Today's Quest</h2>
            <p className="text-white/40 text-xs">
              {completedCount} of {totalCount} completed
            </p>
          </div>
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <motion.circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="url(#progressGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - progressPct / 100) }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
              />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-xs">{Math.round(progressPct)}%</span>
            </div>
          </div>
        </div>

        {/* Daily Score */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-white/40 text-xs">Daily Score</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  dailyScore >= 80 ? 'bg-green-500' : dailyScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${dailyScore}%` }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </div>
            <span className={`text-sm font-bold ${
              dailyScore >= 80 ? 'text-green-400' : dailyScore >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {dailyScore}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Habit Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Habits</h2>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowAddHabit(true)}
            className="btn-primary py-1.5 px-3 text-sm"
          >
            <Plus size={15} />
            Add Habit
          </motion.button>
        </div>

        {todayHabits.length === 0 ? (
          <EmptyState onAdd={() => setShowAddHabit(true)} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {todayHabits.map((habit, i) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <HabitCard
                    habit={habit}
                    completion={getCompletionForHabit(habit.id)}
                    onOpenDetails={setSelectedHabit}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Daily Result Summary */}
      {completedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border border-white/5"
        >
          <p className="text-white/70 text-sm font-medium">
            {completedCount === totalCount && totalCount > 0
              ? `🔥 Perfect day! You completed all ${totalCount} quests.`
              : `You've completed ${completedCount} of ${totalCount} quests today.`}
          </p>
          {stats.streakShields > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400/70">
              <Shield size={12} />
              <span>{stats.streakShields} Streak Shields available</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-10 text-center border-dashed border-white/10"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-5xl mb-4"
      >
        🗺️
      </motion.div>
      <h3 className="text-white font-bold text-lg mb-1">Your quest begins here.</h3>
      <p className="text-white/40 text-sm mb-5">Create your first habit and start earning XP.</p>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onAdd}
        className="btn-primary"
      >
        <Plus size={16} />
        Create Habit
      </motion.button>
    </motion.div>
  );
}

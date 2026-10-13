import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Zap, Target, TrendingUp, Archive } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { useStore } from '../store/useStore';
import { getHabitStreak, getLongestStreak, getCompletionRate, isHabitScheduledOn, toDateStr } from '../lib/streaks';

export function HabitDetailsModal() {
  const { selectedHabitId, setSelectedHabit, habits, completions, archiveHabit } = useStore();
  const habit = habits.find((h) => h.id === selectedHabitId);

  const streak = useMemo(
    () => (habit ? getHabitStreak(habit, completions) : 0),
    [habit, completions]
  );
  const longestStreak = useMemo(
    () => (habit ? getLongestStreak(habit, completions) : 0),
    [habit, completions]
  );
  const completionRate = useMemo(
    () => (habit ? getCompletionRate(habit, completions, 30) : 0),
    [habit, completions]
  );
  const totalCompletions = useMemo(
    () => (habit ? completions.filter((c) => c.habitId === habit.id && c.status === 'done').length : 0),
    [habit, completions]
  );
  const totalXPEarned = useMemo(
    () => (habit ? completions.filter((c) => c.habitId === habit.id).reduce((s, c) => s + c.xpEarned, 0) : 0),
    [habit, completions]
  );

  // Last 30 days trend
  const trendData = useMemo(() => {
    if (!habit) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dateStr = toDateStr(date);
      const comp = completions.find((c) => c.habitId === habit.id && c.date === dateStr);
      const scheduled = isHabitScheduledOn(habit, date);
      return {
        date: format(date, 'MMM d'),
        done: comp?.status === 'done' ? 1 : 0,
        missed: comp?.status === 'missed' && scheduled ? 1 : 0,
        opacity: scheduled ? 1 : 0.3,
      };
    });
  }, [habit, completions]);

  // Recent 10
  const recentHistory = useMemo(() => {
    if (!habit) return [];
    return completions
      .filter((c) => c.habitId === habit.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [habit, completions]);

  const handleArchive = () => {
    if (!habit) return;
    if (confirm(`Archive "${habit.name}"? It will no longer appear in Today.`)) {
      archiveHabit(habit.id);
      setSelectedHabit(null);
    }
  };

  return (
    <AnimatePresence>
      {habit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedHabit(null)}
          />

          <motion.div
            className="relative w-full sm:max-w-lg bg-surface-800 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-surface-800 border-b border-white/5 px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
                  >
                    {habit.icon}
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg leading-tight">{habit.name}</h2>
                    <span
                      className="text-xs font-medium"
                      style={{ color: habit.color }}
                    >
                      {habit.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleArchive}
                    className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Archive habit"
                    aria-label="Archive habit"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedHabit(null)}
                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Flame size={16} className="text-amber-400" />, value: `${streak}d`, label: 'Current Streak' },
                  { icon: <TrendingUp size={16} className="text-brand-400" />, value: `${longestStreak}d`, label: 'Best Streak' },
                  { icon: <Target size={16} className="text-green-400" />, value: `${completionRate}%`, label: '30-Day Rate' },
                  { icon: <Zap size={16} className="text-purple-400" />, value: totalXPEarned.toLocaleString(), label: 'Total XP' },
                ].map(({ icon, value, label }) => (
                  <div key={label} className="glass-card p-3.5 flex items-center gap-3">
                    {icon}
                    <div>
                      <p className="text-white font-bold text-base">{value}</p>
                      <p className="text-white/40 text-xs">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between glass-card p-3.5">
                <span className="text-white/60 text-sm">Total Completions</span>
                <span className="text-white font-bold">{totalCompletions}</span>
              </div>

              {/* 30-day trend */}
              <div>
                <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Last 30 Days</h3>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                    <defs>
                      <linearGradient id="habitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={habit.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={habit.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, 1]} />
                    <Tooltip
                      formatter={(v: any) => [v === 1 ? 'Done' : 'Missed', '']}
                      contentStyle={{ background: '#1e2130', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="done"
                      stroke={habit.color}
                      strokeWidth={2}
                      fill="url(#habitGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent History */}
              {recentHistory.length > 0 && (
                <div>
                  <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Recent History</h3>
                  <div className="space-y-1.5">
                    {recentHistory.map((comp) => (
                      <div key={comp.id} className="flex items-center justify-between py-1.5 border-b border-white/4 last:border-0">
                        <span className="text-white/60 text-sm">{format(new Date(comp.date), 'EEE, MMM d')}</span>
                        <div className="flex items-center gap-2">
                          {comp.xpEarned > 0 && (
                            <span className="text-brand-400/70 text-xs">+{comp.xpEarned} XP</span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            comp.status === 'done'
                              ? 'bg-green-500/15 text-green-400'
                              : comp.status === 'missed'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-white/10 text-white/40'
                          }`}>
                            {comp.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Habit meta */}
              <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-white/30 text-xs">Frequency</p>
                  <p className="text-white/70 text-sm capitalize">{habit.frequency}</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs">Difficulty</p>
                  <p className="text-white/70 text-sm capitalize">{habit.difficulty}</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs">XP per completion</p>
                  <p className="text-brand-400 text-sm font-medium">+{habit.xpReward} XP</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs">Created</p>
                  <p className="text-white/70 text-sm">{format(new Date(habit.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

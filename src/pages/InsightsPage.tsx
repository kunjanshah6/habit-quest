import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useStore, selectActiveHabits, selectUserStats } from '../store/useStore';
import {
  getCompletionRate,
  calculateConsistencyScore,
  isHabitScheduledOn,
  toDateStr,
} from '../lib/streaks';


function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-700 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || '#3b82f6' }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? `${p.value}%` : p.value}
        </p>
      ))}
    </div>
  );
}

export function InsightsPage() {
  const store = useStore();
  const activeHabits = selectActiveHabits(store);
  const stats = selectUserStats(store);
  const { completions } = store;

  // Completion trend last 30 days
  const trendData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dateStr = toDateStr(date);
      const scheduled = activeHabits.filter((h) => isHabitScheduledOn(h, date));
      const done = completions.filter((c) => c.date === dateStr && c.status === 'done').length;
      const pct = scheduled.length > 0 ? Math.round((done / scheduled.length) * 100) : 0;
      return {
        date: format(date, 'MMM d'),
        completion: pct,
      };
    });
  }, [activeHabits, completions]);

  // Habit performance
  const habitPerformance = useMemo(() => {
    return activeHabits.map((h) => ({
      name: h.name.length > 14 ? h.name.slice(0, 14) + '…' : h.name,
      fullName: h.name,
      rate: getCompletionRate(h, completions, 30),
      color: h.color,
    })).sort((a, b) => b.rate - a.rate);
  }, [activeHabits, completions]);

  // Weekly pattern
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, dayIndex) => {
      let total = 0, done = 0;
      for (let w = 0; w < 12; w++) {
        // Find dates for this day of week in past 12 weeks
        const date = subDays(new Date(), (new Date().getDay() - dayIndex + 7) % 7 + w * 7);
        if (date > new Date()) continue;
        const dateStr = toDateStr(date);
        const scheduled = activeHabits.filter((h) => isHabitScheduledOn(h, date));
        const dayDone = completions.filter((c) => c.date === dateStr && c.status === 'done').length;
        if (scheduled.length > 0) {
          total++;
          done += Math.round((dayDone / scheduled.length) * 100);
        }
      }
      return { day, rate: total > 0 ? Math.round(done / total) : 0 };
    });
  }, [activeHabits, completions]);

  const consistencyScore = calculateConsistencyScore(activeHabits, completions);

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="max-w-3xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <p className="text-white/40 text-sm mt-0.5">Your habit performance at a glance</p>
      </motion.div>

      {/* Consistency Score */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold mb-1">Consistency Score</h2>
            <p className="text-white/40 text-xs">Based on last 30 days</p>
          </div>
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - consistencyScore / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{consistencyScore}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
          <div className="text-center">
            <p className="text-white font-bold text-lg">{stats.currentStreak}</p>
            <p className="text-white/40 text-xs">Current Streak</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{stats.longestStreak}</p>
            <p className="text-white/40 text-xs">Best Streak</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{stats.totalCompletions}</p>
            <p className="text-white/40 text-xs">Total Done</p>
          </div>
        </div>
      </motion.div>

      {/* Completion Trend */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <h2 className="text-white font-semibold mb-4">Completion Trend</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={6}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="completion"
              name="Completion"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#completionGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#1e2130', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Habit Performance */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <h2 className="text-white font-semibold mb-4">Habit Performance</h2>
        {habitPerformance.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No habit data yet</p>
        ) : (
          <div className="space-y-3">
            {habitPerformance.map((h, i) => (
              <motion.div
                key={h.fullName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="text-white/60 text-xs w-32 truncate">{h.name}</span>
                <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: h.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${h.rate}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                  />
                </div>
                <span className="text-white/70 text-xs font-medium w-8 text-right">{h.rate}%</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Weekly Pattern */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <h2 className="text-white font-semibold mb-4">Weekly Pattern</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barSize={24}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="rate" name="Avg Completion" radius={[4, 4, 0, 0]}>
              {weeklyData.map((_, i) => (
                <Cell
                  key={i}
                  fill={new Date().getDay() === i ? '#3b82f6' : 'rgba(59,130,246,0.35)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Smart Insights */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <h2 className="text-white font-semibold mb-3">💡 Smart Insights</h2>
        <SmartInsights habits={activeHabits} completions={completions} stats={stats} />
      </motion.div>
    </motion.div>
  );
}

function SmartInsights({ habits, completions, stats }: any) {
  const insights = useMemo(() => {
    const msgs = [];
    const best = [...habits].sort(
      (a: any, b: any) => getCompletionRate(b, completions) - getCompletionRate(a, completions)
    )[0];
    if (best) {
      msgs.push(`Your strongest habit is "${best.name}" at ${getCompletionRate(best, completions)}% completion rate.`);
    }
    const worst = [...habits].sort(
      (a: any, b: any) => getCompletionRate(a, completions) - getCompletionRate(b, completions)
    )[0];
    if (worst && worst.id !== best?.id) {
      msgs.push(`"${worst.name}" needs attention — currently at ${getCompletionRate(worst, completions)}% completion.`);
    }
    if (stats.currentStreak >= 7) {
      msgs.push(`You're on a ${stats.currentStreak}-day streak. Your consistency is building real momentum.`);
    }
    if (stats.consistencyScore >= 80) {
      msgs.push(`${stats.consistencyScore}% consistency score — you're in the top tier of habit builders.`);
    }
    if (msgs.length === 0) {
      msgs.push("Complete more habits to unlock personalized insights.");
    }
    return msgs;
  }, [habits, completions, stats]);

  return (
    <div className="space-y-2.5">
      {insights.map((insight: string, i: number) => (
        <div key={i} className="flex gap-2.5 items-start">
          <span className="text-brand-400 mt-0.5">→</span>
          <p className="text-white/60 text-sm">{insight}</p>
        </div>
      ))}
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { isHabitScheduledOn, toDateStr } from '../lib/streaks';

function getDayIntensity(pct: number): string {
  if (pct === 0) return 'bg-white/5 border border-white/5';
  if (pct < 25) return 'bg-red-500/30';
  if (pct < 50) return 'bg-orange-500/40';
  if (pct < 75) return 'bg-amber-400/50';
  if (pct < 100) return 'bg-green-500/60';
  return 'bg-green-400 glow-green';
}

export function HistoryPage() {
  const store = useStore();
  const { completions, habits } = store;
  const activeHabits = useMemo(() => habits.filter((h) => !h.archivedAt), [habits]);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const getDayData = useCallback((date: Date) => {
    const dateStr = toDateStr(date);
    const scheduled = activeHabits.filter((h) => isHabitScheduledOn(h, date));
    const dayCompletions = completions.filter((c) => c.date === dateStr);
    const done = dayCompletions.filter((c) => c.status === 'done').length;
    const missed = dayCompletions.filter((c) => c.status === 'missed').length;
    const skipped = dayCompletions.filter((c) => c.status === 'skipped').length;
    const pct = scheduled.length > 0 ? (done / scheduled.length) * 100 : 0;
    return { scheduled: scheduled.length, done, missed, skipped, pct };
  }, [activeHabits, completions]);

  const selectedData = selectedDate ? getDayData(selectedDate) : null;

  const startDayOfWeek = startOfMonth(viewMonth).getDay();

  // Heatmap for year view (last 52 weeks)
  const heatmapData = useMemo(() => {
    return Array.from({ length: 91 }, (_, i) => {
      const date = subDays(new Date(), 90 - i);
      const { pct } = getDayData(date);
      return { date, pct };
    });
  }, [getDayData]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-white/40 text-sm mt-0.5">Your habit journey over time</p>
      </div>

      {/* Heatmap — 90 day strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        <h2 className="text-white font-semibold mb-3 text-sm">Last 90 Days</h2>
        <div className="flex flex-wrap gap-1">
          {heatmapData.map(({ date, pct }, i) => (
            <motion.button
              key={i}
              title={`${format(date, 'MMM d')} — ${Math.round(pct)}%`}
              onClick={() => setSelectedDate(date)}
              className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-125 ${getDayIntensity(pct)} ${
                selectedDate && isSameDay(date, selectedDate) ? 'ring-1 ring-white/50 scale-125' : ''
              }`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.005 }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-white/30">
          <span>Less</span>
          <div className="flex gap-1">
            {['bg-white/5', 'bg-red-500/30', 'bg-orange-500/40', 'bg-amber-400/50', 'bg-green-500/60', 'bg-green-400'].map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </motion.div>

      {/* Month Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">{format(viewMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="btn-ghost p-1.5"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="btn-ghost p-1.5"
              aria-label="Next month"
              disabled={viewMonth.getMonth() === new Date().getMonth() && viewMonth.getFullYear() === new Date().getFullYear()}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-white/25 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {monthDays.map((date) => {
            const { pct, done, scheduled } = getDayData(date);
            const isFuture = date > new Date();
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <motion.button
                key={date.toISOString()}
                onClick={() => !isFuture && setSelectedDate(date)}
                disabled={isFuture}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all
                  ${isFuture ? 'opacity-20 cursor-default' : 'hover:scale-105 cursor-pointer'}
                  ${isSelected ? 'ring-2 ring-brand-400' : ''}
                  ${isToday ? 'ring-1 ring-white/30' : ''}
                  ${!isFuture && scheduled > 0 ? getDayIntensity(pct) : 'bg-white/3'}
                `}
                whileHover={!isFuture ? { scale: 1.1 } : {}}
              >
                <span className={`font-medium ${isToday ? 'text-white' : 'text-white/70'}`}>
                  {format(date, 'd')}
                </span>
                {!isFuture && done > 0 && (
                  <span className="text-[8px] text-white/50 leading-none">{done}/{scheduled}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Selected day detail */}
      <AnimatePresence mode="wait">
        {selectedDate && selectedData && (
          <motion.div
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-5"
          >
            <h2 className="text-white font-semibold mb-3">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h2>

            {selectedData.scheduled === 0 ? (
              <p className="text-white/30 text-sm">No habits scheduled.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center glass-card p-3">
                    <p className="text-green-400 font-bold text-xl">{selectedData.done}</p>
                    <p className="text-white/40 text-xs">Completed</p>
                  </div>
                  <div className="text-center glass-card p-3">
                    <p className="text-red-400 font-bold text-xl">{selectedData.missed}</p>
                    <p className="text-white/40 text-xs">Missed</p>
                  </div>
                  <div className="text-center glass-card p-3">
                    <p className="text-white/50 font-bold text-xl">{selectedData.skipped}</p>
                    <p className="text-white/40 text-xs">Skipped</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-white/50 text-sm">{selectedData.scheduled} habits tracked</span>
                  <span className={`text-sm font-bold ${
                    selectedData.pct >= 80 ? 'text-green-400' : selectedData.pct >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {Math.round(selectedData.pct)}% daily score
                  </span>
                </div>

                {/* Per-habit detail */}
                <div className="pt-2 space-y-1.5">
                  {activeHabits
                    .filter((h) => isHabitScheduledOn(h, selectedDate))
                    .map((habit) => {
                      const comp = store.completions.find(
                        (c) => c.habitId === habit.id && c.date === toDateStr(selectedDate)
                      );
                      return (
                        <div key={habit.id} className="flex items-center gap-2.5 py-1">
                          <span className="text-base">{habit.icon}</span>
                          <span className="text-white/70 text-sm flex-1">{habit.name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            comp?.status === 'done'
                              ? 'bg-green-500/15 text-green-400'
                              : comp?.status === 'missed'
                              ? 'bg-red-500/15 text-red-400'
                              : comp?.status === 'skipped'
                              ? 'bg-white/10 text-white/40'
                              : 'bg-white/5 text-white/20'
                          }`}>
                            {comp?.status ?? 'pending'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, SkipForward, Flame, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Habit, HabitCompletion, HabitStatus } from '../types';
import { FloatingXP } from './CelebrationOverlay';
import { getHabitStreak } from '../lib/streaks';

interface HabitCardProps {
  habit: Habit;
  completion?: HabitCompletion;
  onOpenDetails: (id: string) => void;
}

export function HabitCard({ habit, completion, onOpenDetails }: HabitCardProps) {
  const { completeHabit, completions } = useStore();
  const [showXP, setShowXP] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);

  const streak = getHabitStreak(habit, completions);
  const status = completion?.status;
  const isDone = status === 'done';
  const isMissed = status === 'missed';
  const isSkipped = status === 'skipped';

  const handleComplete = (newStatus: HabitStatus) => {
    if (newStatus === 'done' && !isDone) {
      setXpAmount(habit.xpReward);
      setShowXP(true);
    }
    completeHabit(habit.id, newStatus);
  };

  const statusStyles = isDone
    ? 'border-green-500/30 bg-green-500/5'
    : isMissed
    ? 'border-red-500/20 bg-red-500/5'
    : isSkipped
    ? 'border-white/10 opacity-60'
    : 'border-white/5 hover:border-white/10';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`relative glass-card p-4 border transition-all duration-200 ${statusStyles}`}
    >
      {showXP && (
        <FloatingXP xp={xpAmount} onComplete={() => setShowXP(false)} />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <button
          onClick={() => onOpenDetails(habit.id)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform hover:scale-110"
          style={{ backgroundColor: `${habit.color}20`, border: `1px solid ${habit.color}40` }}
          aria-label={`Open ${habit.name} details`}
        >
          {habit.icon}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={`font-semibold text-sm truncate cursor-pointer hover:text-brand-400 transition-colors ${isDone ? 'text-white/60 line-through decoration-green-500/50' : 'text-white'}`}
                onClick={() => onOpenDetails(habit.id)}
              >
                {habit.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded-md"
                  style={{ color: habit.color, backgroundColor: `${habit.color}15` }}
                >
                  {habit.category}
                </span>
                {streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-400">
                    <Flame size={11} />
                    {streak}d
                  </span>
                )}
              </div>
            </div>

            {/* XP Badge */}
            <div className="flex items-center gap-0.5 text-xs text-brand-400 flex-shrink-0">
              <Zap size={11} />
              <span>+{habit.xpReward} XP</span>
            </div>
          </div>

          {/* Status indicator */}
          {isDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 mt-2 text-xs text-green-400"
            >
              <Check size={12} />
              <span>Completed!</span>
            </motion.div>
          )}
          {isMissed && (
            <p className="text-xs text-red-400/70 mt-2">Missed — tomorrow is a new start</p>
          )}
          {isSkipped && (
            <p className="text-xs text-white/30 mt-2">Skipped today</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isDone && !isMissed && !isSkipped && (
        <motion.div
          className="flex items-center gap-2 mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleComplete('done')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-sm font-semibold transition-all"
            aria-label={`Mark ${habit.name} as done`}
          >
            <Check size={14} />
            Done
          </motion.button>
          <button
            onClick={() => handleComplete('missed')}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/10 text-sm transition-all"
            aria-label="Mark as missed"
            title="Missed"
          >
            <X size={14} />
          </button>
          <button
            onClick={() => handleComplete('skipped')}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/10 text-sm transition-all"
            aria-label="Skip"
            title="Skip"
          >
            <SkipForward size={14} />
          </button>
        </motion.div>
      )}

      {/* Re-open buttons if done/missed/skipped */}
      {(isDone || isMissed || isSkipped) && (
        <div className="flex gap-2 mt-3">
          {!isDone && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleComplete('done')}
              className="flex items-center gap-1 text-xs text-green-400/70 hover:text-green-400 transition-colors"
            >
              <Check size={12} /> Mark done
            </motion.button>
          )}
          {!isMissed && (
            <button
              onClick={() => handleComplete('missed')}
              className="flex items-center gap-1 text-xs text-white/25 hover:text-white/50 transition-colors"
            >
              <X size={12} /> Missed
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

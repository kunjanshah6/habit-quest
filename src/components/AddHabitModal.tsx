import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { HabitCategory, HabitDifficulty, HabitFrequency } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS, XP_REWARDS } from '../lib/levels';

const CATEGORIES: HabitCategory[] = [
  'Health', 'Fitness', 'Mindfulness', 'Learning', 'Productivity', 'Finance', 'Social', 'Personal',
];

const HABIT_ICONS = ['🏃', '📚', '🧘', '💧', '💻', '🌙', '🎯', '💪', '🍎', '✍️', '🎵', '🚴', '🏋️', '🌱', '💊', '🧹'];

interface FormState {
  name: string;
  icon: string;
  category: HabitCategory;
  difficulty: HabitDifficulty;
  frequency: HabitFrequency;
  customDays: number[];
  reminderTime: string;
  customXP: boolean;
  xpOverride: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AddHabitModal() {
  const { showAddHabit, setShowAddHabit, addHabit } = useStore();

  const [form, setForm] = useState<FormState>({
    name: '',
    icon: '🎯',
    category: 'Personal',
    difficulty: 'medium',
    frequency: 'daily',
    customDays: [],
    reminderTime: '',
    customXP: false,
    xpOverride: 20,
  });

  const autoXP = XP_REWARDS[form.difficulty];
  const xpReward = form.customXP ? form.xpOverride : autoXP;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    addHabit({
      name: form.name.trim(),
      icon: form.icon,
      category: form.category,
      difficulty: form.difficulty,
      frequency: form.frequency,
      customDays: form.frequency === 'custom' ? form.customDays : undefined,
      xpReward,
      reminderTime: form.reminderTime || undefined,
      color: CATEGORY_COLORS[form.category] || '#3b82f6',
    });

    setShowAddHabit(false);
    setForm({
      name: '',
      icon: '🎯',
      category: 'Personal',
      difficulty: 'medium',
      frequency: 'daily',
      customDays: [],
      reminderTime: '',
      customXP: false,
      xpOverride: 20,
    });
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      customDays: f.customDays.includes(day)
        ? f.customDays.filter((d) => d !== day)
        : [...f.customDays, day],
    }));
  };

  return (
    <AnimatePresence>
      {showAddHabit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddHabit(false)}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full sm:max-w-lg bg-surface-800 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-surface-800 border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">New Habit</h2>
                <p className="text-white/40 text-xs">Build your quest</p>
              </div>
              <button
                onClick={() => setShowAddHabit(false)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Habit Name */}
              <div>
                <label className="text-white/70 text-sm font-medium mb-2 block" htmlFor="habit-name">
                  Habit Name
                </label>
                <input
                  id="habit-name"
                  className="input-field"
                  placeholder='e.g. "Read 20 pages"'
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  maxLength={60}
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="text-white/70 text-sm font-medium mb-2 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        form.icon === icon
                          ? 'bg-brand-500/20 border border-brand-500/50 scale-110'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-white/70 text-sm font-medium mb-2 block">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
                        form.category === cat
                          ? 'border scale-105'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70'
                      }`}
                      style={
                        form.category === cat
                          ? {
                              backgroundColor: `${CATEGORY_COLORS[cat]}20`,
                              borderColor: `${CATEGORY_COLORS[cat]}50`,
                              color: CATEGORY_COLORS[cat],
                            }
                          : {}
                      }
                    >
                      <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-white/70 text-sm font-medium mb-2 block">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as HabitDifficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, difficulty: d }))}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                        form.difficulty === d
                          ? d === 'easy'
                            ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                            : d === 'medium'
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                            : 'bg-red-500/20 border border-red-500/40 text-red-400'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70'
                      }`}
                    >
                      {d === 'easy' ? '✦ ' : d === 'medium' ? '✦✦ ' : '✦✦✦ '}
                      {d}
                      <span className="block text-xs mt-0.5 opacity-70">+{XP_REWARDS[d]} XP</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-white/70 text-sm font-medium mb-2 block">Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['daily', 'weekdays', 'weekends', 'custom'] as HabitFrequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, frequency: f }))}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                        form.frequency === f
                          ? 'bg-brand-500/20 border border-brand-500/40 text-brand-400'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/70'
                      }`}
                    >
                      {f === 'daily' ? '📅 Daily' : f === 'weekdays' ? '📆 Weekdays' : f === 'weekends' ? '🌅 Weekends' : '✏️ Custom'}
                    </button>
                  ))}
                </div>

                {form.frequency === 'custom' && (
                  <div className="flex gap-1.5 mt-2">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          form.customDays.includes(i)
                            ? 'bg-brand-500/20 border border-brand-500/40 text-brand-400'
                            : 'bg-white/5 border border-white/10 text-white/40'
                        }`}
                      >
                        {day[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reminder */}
              <div>
                <label className="text-white/70 text-sm font-medium mb-2 block" htmlFor="reminder-time">
                  Reminder Time (optional)
                </label>
                <input
                  id="reminder-time"
                  type="time"
                  className="input-field"
                  value={form.reminderTime}
                  onChange={(e) => setForm((f) => ({ ...f, reminderTime: e.target.value }))}
                />
              </div>

              {/* XP Summary */}
              <div className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-brand-400" />
                  <span className="text-white/70 text-sm">XP Reward</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-brand-400 font-bold text-lg">+{xpReward} XP</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, customXP: !f.customXP }))}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    {form.customXP ? 'Auto' : 'Custom'}
                  </button>
                </div>
              </div>

              {form.customXP && (
                <input
                  type="number"
                  className="input-field"
                  placeholder="Custom XP (1-100)"
                  min={1}
                  max={100}
                  value={form.xpOverride}
                  onChange={(e) => setForm((f) => ({ ...f, xpOverride: Number(e.target.value) }))}
                />
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                className="w-full btn-primary py-3 text-base font-semibold justify-center"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={!form.name.trim()}
              >
                Add Habit
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

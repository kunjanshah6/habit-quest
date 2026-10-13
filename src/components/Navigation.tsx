import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  Home, BarChart2, Calendar, Trophy, User, Settings, Zap
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { NavPage } from '../types';

const NAV_ITEMS: { id: NavPage; label: string; icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'insights', label: 'Insights', icon: BarChart2 },
  { id: 'history', label: 'History', icon: Calendar },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { activePage, setActivePage, settings, totalXP } = useStore();
  const levelInfo = getLevelFromXP(totalXP);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-surface-800 border-r border-white/5 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight">HabitQuest</span>
            <p className="text-white/30 text-xs">Level {levelInfo.level}</p>
          </div>
        </div>
      </div>

      {/* User mini */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setActivePage('profile')}>
          <span className="text-2xl">{settings.avatar}</span>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{settings.name}</p>
            <p className="text-white/40 text-xs">{levelInfo.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={17} className={active ? 'text-brand-400' : ''} />
              {label}
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* XP Bottom */}
      <div className="p-4 border-t border-white/5">
        <div className="glass-card p-3">
          <div className="flex justify-between text-xs text-white/40 mb-1.5">
            <span>Level {levelInfo.level}</span>
            <span>{totalXP.toLocaleString()} XP</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(((totalXP - levelInfo.minXP) / (levelInfo.maxXP - levelInfo.minXP)) * 100, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-white/25 text-xs mt-1.5">
            {Math.max(levelInfo.maxXP - totalXP, 0).toLocaleString()} XP to Level {levelInfo.level + 1}
          </p>
        </div>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const { activePage, setActivePage } = useStore();

  const mobileItems = NAV_ITEMS.slice(0, 5);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-800/95 backdrop-blur-md border-t border-white/5">
      <div className="flex items-center justify-around px-2 py-1 safe-area-inset-bottom">
        {mobileItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px] transition-all duration-150 ${
                active ? 'text-brand-400' : 'text-white/40'
              }`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <motion.div
                animate={{ scale: active ? 1.1 : 1, y: active ? -2 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon size={20} />
              </motion.div>
              <span className="text-[10px] font-medium">{label}</span>
              {active && (
                <motion.div
                  layoutId="bottom-nav-dot"
                  className="w-1 h-1 rounded-full bg-brand-400"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function getLevelFromXP(xp: number) {
  const levels = [
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
  ];
  let cur = levels[0];
  for (const l of levels) {
    if (xp >= l.minXP) cur = l;
    else break;
  }
  return cur;
}

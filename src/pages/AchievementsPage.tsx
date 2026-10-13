import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ACHIEVEMENTS } from '../lib/achievements';

export function AchievementsPage() {
  const { userAchievements } = useStore();
  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

  const unlocked = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));
  const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id));

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 10 },
    show: { opacity: 1, scale: 1, y: 0 },
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <p className="text-white/40 text-sm mt-0.5">
          {unlocked.length} of {ACHIEVEMENTS.length} unlocked
        </p>
      </div>

      {/* Progress */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-4"
      >
        <div className="flex justify-between text-xs text-white/50 mb-2">
          <span>Progress</span>
          <span>{unlocked.length} / {ACHIEVEMENTS.length}</span>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div>
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
            Unlocked 🏆
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {unlocked.map((achievement) => {
              const ua = userAchievements.find((u) => u.achievementId === achievement.id);
              return (
                <motion.div
                  key={achievement.id}
                  variants={itemVariants}
                  className="glass-card p-4 text-center border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/30 transition-all cursor-default"
                >
                  <motion.div
                    className="text-4xl mb-2"
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.5, delay: (achievement.id.length % 5) * 0.1 }}
                  >
                    {achievement.icon}
                  </motion.div>
                  <h3 className="text-white font-semibold text-sm mb-0.5">{achievement.name}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{achievement.description}</p>
                  {ua && (
                    <p className="text-amber-400/60 text-[10px] mt-2">
                      {new Date(ua.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-amber-400/70 font-medium">
                    +{achievement.xpReward} XP
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
            Locked 🔒
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {locked.map((achievement, i) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4 text-center opacity-50 hover:opacity-70 transition-opacity cursor-default"
              >
                <div className="relative inline-block mb-2">
                  <span className="text-4xl grayscale">{achievement.icon}</span>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-700 border border-white/20 flex items-center justify-center">
                    <Lock size={10} className="text-white/50" />
                  </div>
                </div>
                <h3 className="text-white/70 font-semibold text-sm mb-0.5">{achievement.name}</h3>
                <p className="text-white/30 text-xs leading-relaxed">{achievement.description}</p>
                <div className="mt-2 text-xs text-white/25">+{achievement.xpReward} XP</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {unlocked.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-10 text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-5xl mb-3"
          >
            🏆
          </motion.div>
          <h3 className="text-white font-bold text-lg mb-1">Your trophy case awaits.</h3>
          <p className="text-white/40 text-sm">Complete habits and reach milestones to earn achievements.</p>
        </motion.div>
      )}
    </div>
  );
}

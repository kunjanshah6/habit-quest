import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar, BottomNav } from './components/Navigation';
import { TodayPage } from './pages/TodayPage';
import { InsightsPage } from './pages/InsightsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AddHabitModal } from './components/AddHabitModal';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { HabitDetailsModal } from './components/HabitDetailsModal';
import { useStore } from './store/useStore';

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

function PageContent() {
  const { activePage } = useStore();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePage}
        variants={PAGE_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-1 overflow-y-auto"
      >
        {activePage === 'today' && <TodayPage />}
        {activePage === 'insights' && <InsightsPage />}
        {activePage === 'history' && <HistoryPage />}
        {activePage === 'achievements' && <AchievementsPage />}
        {activePage === 'profile' && <ProfilePage />}
        {activePage === 'settings' && <SettingsPage />}
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-500/3 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/3 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <PageContent />
      </main>

      {/* Bottom nav */}
      <BottomNav />

      {/* Modals & Overlays */}
      <AddHabitModal />
      <HabitDetailsModal />
      <CelebrationOverlay />
    </div>
  );
}

export default App;

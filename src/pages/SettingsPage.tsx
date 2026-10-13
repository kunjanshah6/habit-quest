import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { MotivationStyle, ThemeAccent } from '../types';

const AVATARS = ['🦸', '🧙', '🧝', '🧜', '🤸', '🦊', '🐺', '🦁', '🐉', '🌟', '⚡', '🔥'];
const ACCENTS: { id: ThemeAccent; label: string; color: string }[] = [
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'purple', label: 'Purple', color: '#8b5cf6' },
  { id: 'green', label: 'Green', color: '#10b981' },
  { id: 'orange', label: 'Orange', color: '#f97316' },
  { id: 'pink', label: 'Pink', color: '#ec4899' },
];
const MOTIVATION_STYLES: { id: MotivationStyle; label: string; desc: string }[] = [
  { id: 'energetic', label: 'Energetic', desc: 'Let\'s crush today\'s goals! ⚡' },
  { id: 'calm', label: 'Calm', desc: 'Take it one step at a time.' },
  { id: 'minimal', label: 'Minimal', desc: 'Show up. Repeat.' },
];

export function SettingsPage() {
  const { settings, updateSettings, exportData, importData, resetAllData } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dataMessage, setDataMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataMessage({ ok: true, text: 'Backup downloaded.' });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!confirm('Importing replaces all current habits and progress on this device. Continue?')) return;
    const error = importData(await file.text());
    setDataMessage(error ? { ok: false, text: error } : { ok: true, text: 'Backup restored.' });
  };

  const handleReset = () => {
    if (confirm('Permanently delete all habits and progress on this device? This cannot be undone.')) {
      resetAllData();
      setDataMessage({ ok: true, text: 'All data has been reset.' });
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-0.5">Personalize your HabitQuest</p>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <div className="space-y-4">
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 block" htmlFor="settings-name">Name</label>
            <input
              id="settings-name"
              className="input-field"
              value={settings.name}
              onChange={(e) => updateSettings({ name: e.target.value })}
              maxLength={30}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-white/70 text-sm font-medium mb-2 block">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => updateSettings({ avatar: av })}
                  className={`w-10 h-10 rounded-xl text-2xl flex items-center justify-center transition-all ${
                    settings.avatar === av
                      ? 'bg-brand-500/20 border border-brand-500/50 scale-110'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Accent Color">
        <div className="flex gap-3 flex-wrap">
          {ACCENTS.map(({ id, label, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => updateSettings({ accentColor: id })}
              className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all ${
                settings.accentColor === id
                  ? 'border-white/30 scale-105'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-white/60 text-xs">{label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Motivation */}
      <Section title="Motivation Style">
        <div className="space-y-2">
          {MOTIVATION_STYLES.map(({ id, label, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => updateSettings({ motivationStyle: id })}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                settings.motivationStyle === id
                  ? 'bg-brand-500/10 border-brand-500/30 text-white'
                  : 'bg-white/3 border-white/8 text-white/60 hover:border-white/15'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors ${
                  settings.motivationStyle === id ? 'border-brand-400 bg-brand-400' : 'border-white/30'
                }`}
              />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className={`text-xs mt-0.5 ${settings.motivationStyle === id ? 'text-white/50' : 'text-white/30'}`}>
                  "{desc}"
                </p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Toggles */}
      <Section title="Experience">
        <div className="space-y-1">
          {[
            { key: 'soundEnabled' as const, label: 'Sound Effects', desc: 'Play sounds on habit completion' },
            { key: 'animationsEnabled' as const, label: 'Animations', desc: 'Enable microinteractions and celebrations' },
            { key: 'celebrationsEnabled' as const, label: 'Celebration Pop-ups', desc: 'Show celebration overlay on milestones' },
            { key: 'notificationsEnabled' as const, label: 'Notifications', desc: 'Browser push reminders' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-white/35 text-xs">{desc}</p>
              </div>
              <Toggle
                checked={settings[key] as boolean}
                onChange={(v) => updateSettings({ [key]: v })}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Data */}
      <Section title="Your Data">
        <p className="text-white/40 text-xs mb-4">
          Your progress is stored only on this device. Export a backup regularly so you can restore it
          if you clear browser data or switch devices.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary py-2 px-3 text-sm" onClick={handleExport}>
            <Download size={15} />
            Export backup
          </button>
          <button
            type="button"
            className="btn-primary py-2 px-3 text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} />
            Import backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        {dataMessage && (
          <p
            role="status"
            className={`text-xs mt-3 ${dataMessage.ok ? 'text-green-400' : 'text-red-400'}`}
          >
            {dataMessage.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="mt-5 text-xs text-red-400/70 hover:text-red-400 transition-colors"
        >
          Reset all data
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </motion.div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full border transition-all duration-200 ${
        checked ? 'bg-brand-500 border-brand-500' : 'bg-white/10 border-white/20'
      }`}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

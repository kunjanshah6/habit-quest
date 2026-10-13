import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';

// Simple canvas confetti
function launchConfetti(canvas: HTMLCanvasElement, level: 'small' | 'medium' | 'large' | 'legendary') {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const count = level === 'legendary' ? 200 : level === 'large' ? 120 : level === 'medium' ? 60 : 20;
  const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

  const particles: {
    x: number; y: number; vx: number; vy: number;
    color: string; size: number; alpha: number; rotation: number; rotSpeed: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.9) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    });
  }

  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // gravity
      p.alpha -= 0.015;
      p.rotation += p.rotSpeed;
      if (p.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    if (frame < 120 && particles.some((p) => p.alpha > 0)) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  animate();
}

export function CelebrationOverlay() {
  const { celebration, clearCelebration, settings } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (celebration && canvasRef.current && settings.animationsEnabled) {
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      launchConfetti(canvas, celebration.type);
    }
  }, [celebration, settings.animationsEnabled]);

  useEffect(() => {
    if (celebration) {
      const timer = setTimeout(clearCelebration, 3500);
      return () => clearTimeout(timer);
    }
  }, [celebration, clearCelebration]);

  return (
    <AnimatePresence>
      {celebration && (
        <>
          <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ width: '100vw', height: '100vh' }}
          />
          <motion.div
            className="fixed inset-0 z-[99] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`
                relative px-8 py-5 rounded-2xl border text-center pointer-events-auto max-w-sm mx-4
                ${celebration.type === 'legendary'
                  ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30'
                  : celebration.type === 'large'
                  ? 'bg-gradient-to-br from-brand-500/20 to-purple-500/20 border-brand-500/30'
                  : 'bg-surface-700/90 border-white/10'}
                backdrop-blur-md shadow-2xl
              `}
              initial={{ scale: 0.5, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {celebration.type === 'legendary' && (
                <motion.div
                  className="text-5xl mb-2"
                  animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  🏆
                </motion.div>
              )}
              {celebration.type === 'large' && (
                <motion.div className="text-4xl mb-2"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >🔥</motion.div>
              )}
              <h3 className={`font-bold text-xl mb-1 ${
                celebration.type === 'legendary' ? 'text-gradient' : 'text-white'
              }`}>
                {celebration.message}
              </h3>
              {celebration.xp && (
                <p className="text-brand-400 font-semibold text-sm">
                  +{celebration.xp} XP
                </p>
              )}
              <button
                onClick={clearCelebration}
                className="absolute top-2 right-2 p-1 rounded-lg text-white/30 hover:text-white/60 transition-colors"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Floating XP label
export function FloatingXP({ xp, onComplete }: { xp: number; onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 1200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute top-0 right-4 z-20 pointer-events-none"
      initial={{ opacity: 0, y: 0, scale: 0.8 }}
      animate={{ opacity: [0, 1, 1, 0], y: -50, scale: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
    >
      <span className="text-brand-400 font-bold text-base">+{xp} XP</span>
    </motion.div>
  );
}

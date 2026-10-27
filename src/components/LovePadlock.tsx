import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Heart } from 'lucide-react';
import { Sparkles } from '@/components/Sparkles';
import { LockConfig, ThemeConfig } from '@/lib/types';

type Phase = 'locked' | 'unlocking' | 'revealed';

const COLOR_SCHEMES: Record<string, {
  primary: string;
  secondary: string;
  light: string;
  highlight: string;
  glow: string;
  shadow: string;
}> = {
  rose_gold: {
    primary: '#b76e79',
    secondary: '#d99a8e',
    light: '#f0c4b8',
    highlight: '#fce4dc',
    glow: 'rgba(183, 110, 121, 0.55)',
    shadow: 'rgba(120, 60, 70, 0.35)',
  },
  soft_pink: {
    primary: '#ec4899',
    secondary: '#f472b6',
    light: '#fbcfe8',
    highlight: '#fce7f3',
    glow: 'rgba(236, 72, 153, 0.55)',
    shadow: 'rgba(190, 24, 93, 0.3)',
  },
  pastel_red: {
    primary: '#f43f5e',
    secondary: '#fb7185',
    light: '#fda4af',
    highlight: '#fecdd3',
    glow: 'rgba(244, 63, 94, 0.55)',
    shadow: 'rgba(159, 18, 57, 0.3)',
  },
};

interface Props {
  passcode: string;
  lockConfig: LockConfig;
  theme: ThemeConfig;
  recipientName: string;
  onUnlock: () => void;
}

export function LovePadlock({ passcode, lockConfig, theme, recipientName, onUnlock }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState<Phase>('locked');
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = COLOR_SCHEMES[lockConfig.color] ?? COLOR_SCHEMES.rose_gold;
  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const burstHearts = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => {
        const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 70 + Math.random() * 130;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 30,
          size: 10 + Math.random() * 18,
          color: [colors.primary, colors.secondary, colors.light, theme.heart][i % 4],
          delay: Math.random() * 0.15,
        };
      }),
    [colors, theme.heart]
  );

  const glitter = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        left: 50 + (Math.random() - 0.5) * 65,
        top: 38 + (Math.random() - 0.5) * 50,
        size: 4 + Math.random() * 8,
        delay: Math.random() * 0.5,
      })),
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === passcode) {
      setError(false);
      if (prefersReducedMotion) {
        setPhase('revealed');
        setTimeout(onUnlock, 1800);
      } else {
        setPhase('unlocking');
        setTimeout(() => setPhase('revealed'), 1600);
        setTimeout(onUnlock, 3500);
      }
    } else {
      setError(true);
      setValue('');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(timer);
  }, []);

  const shackleOpen = phase !== 'locked';
  const showBurst = phase === 'unlocking';
  const showRevealed = phase === 'revealed';
  const lockMessage = lockConfig.engraved_message || 'Our love is locked here, but my heart will always be yours. ♡';
  const unlockMessage = lockConfig.unlock_message || "You found the key to my heart! Here's a little something made just for you. 💗";

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-10 text-center">
      <Sparkles count={30} color={colors.light} />

      {/* Locked message */}
      {phase === 'locked' && (
        <div className="animate-fade-in-up max-w-md">
          <p className={`font-script text-2xl ${theme.textSoft}`}>For {recipientName || 'you'}</p>
          <h1 className={`mt-3 font-serif-display text-2xl font-bold leading-snug ${theme.text} text-balance sm:text-3xl`}>
            {lockMessage}
          </h1>
        </div>
      )}

      {/* Padlock scene */}
      <div className="relative mt-8" style={{ width: 300, height: 340 }}>
        {/* Glow behind lock */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 260,
            height: 260,
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            animation: phase === 'locked' && !prefersReducedMotion ? 'pulseGlow 3s ease-in-out infinite' : 'none',
          }}
        />

        {/* Burst hearts */}
        {showBurst &&
          burstHearts.map((h) => (
            <svg
              key={h.id}
              viewBox="0 0 24 24"
              className="absolute left-1/2 top-1/2"
              style={{
                width: h.size,
                height: h.size,
                color: h.color,
                animation: `heartBurst 1s ease-out ${h.delay}s forwards`,
                ['--bx' as string]: `${h.x}px`,
                ['--by' as string]: `${h.y}px`,
              }}
            >
              <path
                fill="currentColor"
                d="M12 21s-6.7-4.35-9.5-8.5C.5 9.5 2 5.5 5.5 5.5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3 3.5 0 5 4 3 7C19 16.65 12 21 12 21z"
              />
            </svg>
          ))}

        {/* Glitter */}
        {(showBurst || showRevealed) &&
          glitter.map((g) => (
            <div
              key={g.id}
              className="absolute rounded-full"
              style={{
                left: `${g.left}%`,
                top: `${g.top}%`,
                width: g.size,
                height: g.size,
                background: colors.highlight,
                boxShadow: `0 0 ${g.size * 2.5}px ${colors.light}`,
                animation: `glitterFall 1.2s ease-out ${g.delay}s forwards`,
              }}
            />
          ))}

        {/* Padlock SVG */}
        <svg
          viewBox="0 0 240 300"
          className="absolute inset-0 h-full w-full"
          style={{
            filter: `drop-shadow(0 8px 20px ${colors.shadow})`,
            animation: phase === 'locked' && !prefersReducedMotion ? 'lockBob 4s ease-in-out infinite' : 'none',
          }}
        >
          <defs>
            <linearGradient id="lockBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor={colors.highlight} />
              <stop offset="30%" stopColor={colors.light} />
              <stop offset="65%" stopColor={colors.secondary} />
              <stop offset="100%" stopColor={colors.primary} />
            </linearGradient>
            <linearGradient id="shackleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.highlight} />
              <stop offset="50%" stopColor={colors.secondary} />
              <stop offset="100%" stopColor={colors.primary} />
            </linearGradient>
            <radialGradient id="shineGrad" cx="35%" cy="25%" r="45%">
              <stop offset="0%" stopColor="white" stopOpacity="0.65" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="keyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.highlight} />
              <stop offset="50%" stopColor={colors.secondary} />
              <stop offset="100%" stopColor={colors.primary} />
            </linearGradient>
          </defs>

          {/* Shackle */}
          <g
            style={{
              transform: shackleOpen ? 'rotate(-125deg)' : 'rotate(0deg)',
              transformOrigin: '90px 135px',
              transformBox: 'view-box',
              transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <path
              d="M90,135 L90,85 C90,52 150,52 150,85 L150,135"
              fill="none"
              stroke="url(#shackleGrad)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M87,130 L87,85 C87,54 153,54 153,85 L153,130"
              fill="none"
              stroke="white"
              strokeOpacity="0.25"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* Heart-shaped lock body */}
          <path
            d="M120,278 C120,278 45,216 45,156 C45,126 70,109 95,109 C108,109 120,121 120,133 C120,121 132,109 145,109 C170,109 195,126 195,156 C195,216 120,278 120,278 Z"
            fill="url(#lockBodyGrad)"
            stroke={colors.primary}
            strokeWidth="2"
            strokeOpacity="0.25"
          />

          {/* Shine overlay */}
          <path
            d="M120,278 C120,278 45,216 45,156 C45,126 70,109 95,109 C108,109 120,121 120,133 C120,121 132,109 145,109 C170,109 195,126 195,156 C195,216 120,278 120,278 Z"
            fill="url(#shineGrad)"
          />

          {/* Inner decorative heart outline */}
          <path
            d="M120,252 C120,252 72,212 72,167 C72,147 87,137 102,137 C112,137 118,145 120,155 C122,145 128,137 138,137 C153,137 168,147 168,167 C168,212 120,252 120,252 Z"
            fill="none"
            stroke={colors.highlight}
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />

          {/* Keyhole */}
          <circle cx="120" cy="172" r="9" fill={colors.shadow} />
          <circle cx="120" cy="172" r="6.5" fill={colors.primary} />
          <path d="M120,178 L114,197 L126,197 Z" fill={colors.shadow} />
          <path d="M120,178 L116.5,195 L123.5,195 Z" fill={colors.primary} />

          {/* Engraved initials */}
          <text
            x="120"
            y="228"
            textAnchor="middle"
            fill={colors.shadow}
            fontSize="20"
            fontWeight="700"
            fontFamily="'Dancing Script', cursive"
            opacity="0.75"
          >
            {lockConfig.initials || 'A ♡ S'}
          </text>

          {/* Tiny sparkle dots on lock */}
          <g style={{ animation: !prefersReducedMotion ? 'sparkle 2.5s ease-in-out infinite' : 'none' }}>
            <circle cx="72" cy="152" r="2.5" fill="white" opacity="0.8" />
            <circle cx="172" cy="168" r="2" fill="white" opacity="0.6" />
            <circle cx="98" cy="245" r="2.5" fill="white" opacity="0.7" />
            <circle cx="150" cy="240" r="1.5" fill="white" opacity="0.5" />
          </g>
        </svg>

        {/* Key */}
        <svg
          viewBox="0 0 50 110"
          className="absolute"
          style={{
            right: -20,
            bottom: 30,
            width: 48,
            height: 105,
            filter: `drop-shadow(0 4px 10px ${colors.shadow})`,
            animation: phase === 'locked' && !prefersReducedMotion ? 'keySway 3.5s ease-in-out infinite' : phase === 'unlocking' ? 'keyFloat 0.9s ease-out forwards' : 'none',
            opacity: phase === 'locked' ? 0.85 : phase === 'unlocking' ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        >
          {/* Heart-shaped bow */}
          <path
            d="M25,30 C25,30 10,21 10,11 C10,4 17,2 21,6 C23.5,8.5 25,13 25,15 C25,13 26.5,8.5 29,6 C33,2 40,4 40,11 C40,21 25,30 25,30 Z"
            fill="url(#keyGrad)"
            stroke={colors.primary}
            strokeWidth="1"
            strokeOpacity="0.3"
          />
          {/* Shaft */}
          <rect x="22" y="28" width="6" height="58" rx="2" fill="url(#keyGrad)" />
          {/* Bit */}
          <rect x="22" y="70" width="13" height="5" rx="1" fill="url(#keyGrad)" />
          <rect x="22" y="79" width="10" height="5" rx="1" fill="url(#keyGrad)" />
          {/* Shine */}
          <rect x="23" y="30" width="2" height="54" fill="white" opacity="0.4" />
          <circle cx="25" cy="10" r="1.5" fill="white" opacity="0.5" />
        </svg>
      </div>

      {/* Passcode input */}
      {phase === 'locked' && (
        <form onSubmit={handleSubmit} className="mt-6 w-full max-w-xs animate-fade-in-up">
          <p className={`mb-4 text-sm font-medium ${theme.textSoft}`}>
            Enter your secret code to unlock our love
          </p>
          <div
            className="flex cursor-pointer justify-center gap-2.5"
            onClick={() => inputRef.current?.focus()}
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const filled = i < value.length;
              const isCurrent = i === value.length;
              return (
                <div
                  key={i}
                  className={`flex h-12 w-11 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all duration-200 ${
                    filled
                      ? 'border-pink-400 bg-pink-50/80 text-rose-900'
                      : error
                      ? 'border-rose-300 bg-white'
                      : 'border-pink-200 bg-white/70'
                  } ${isCurrent && !error ? 'border-pink-400 shadow-sm' : ''} ${error ? 'animate-wiggle' : ''}`}
                >
                  {filled ? value[i] : <span className="text-pink-300 text-sm">•</span>}
                </div>
              );
            })}
          </div>
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            maxLength={6}
            value={value}
            onChange={(e) => { setValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(false); }}
            className="absolute h-0 w-0 opacity-0"
            aria-label="Enter 6-digit passcode"
          />
          {error && (
            <p className="mt-3 text-sm text-rose-600 animate-fade-in">
              That's not our code. Try again, my love.
            </p>
          )}
          <button
            type="submit"
            disabled={value.length < 6}
            className={`mt-6 w-full rounded-full ${theme.accentDark} px-6 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100`}
          >
            <span className="inline-flex items-center gap-2">
              <Lock size={18} /> Unlock Our Love
            </span>
          </button>
        </form>
      )}

      {/* Revealed message */}
      {showRevealed && (
        <div className="mt-4 max-w-md animate-scale-in">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${theme.accentSoft}`}>
            <Heart size={28} fill={colors.primary} style={{ color: colors.primary }} className="animate-heartbeat" />
          </div>
          <h1 className={`font-serif-display text-xl font-bold leading-snug ${theme.text} text-balance sm:text-2xl`}>
            {unlockMessage}
          </h1>
          <p className={`mt-4 font-script text-xl ${theme.accent} animate-fade-in`}>
            Opening your surprise…
          </p>
        </div>
      )}
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Sparkles } from '@/components/Sparkles';
import { Confetti } from '@/components/Confetti';
import { MusicPlayer } from '@/components/MusicPlayer';
import { Typewriter } from '@/components/Typewriter';
import { ScratchCard } from '@/components/ScratchCard';
import { LovePadlock } from '@/components/LovePadlock';
import { supabase } from '@/lib/supabase';
import { Surprise, getTheme, QuizQuestion, DEFAULT_LOCK_CONFIG, LockConfig } from '@/lib/types';
import { formatDate, getElapsedCalendar } from '@/lib/utils';
import { Route } from '@/lib/router';
import { Lock } from 'lucide-react';
import {
  Heart,
  Gift,
  Sparkle,
  Mail,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Cake,
  PartyPopper,
  Send,
  Flower2,
} from 'lucide-react';

interface Props {
  slug: string;
  navigate: (r: Route) => void;
}

type Stage = 'opening' | 'experience';

export function ViewPage({ slug, navigate }: Props) {
  const [surprise, setSurprise] = useState<Surprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>('opening');
  const [confetti, setConfetti] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const lockConfig: LockConfig = surprise?.lock_config
    ? { ...DEFAULT_LOCK_CONFIG, ...surprise.lock_config }
    : DEFAULT_LOCK_CONFIG;

  useEffect(() => {
    (async () => {
      if (slug === 'demo') {
        setSurprise(demoSurprise());
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('surprises').select('*').eq('slug', slug).maybeSingle();
      if (data && (data as Surprise).published) setSurprise(data as Surprise);
      else setNotFound(true);
      setLoading(false);
    })();
  }, [slug]);

  const openSurprise = () => {
    setStage('experience');
    setConfetti(true);
    setTimeout(() => setConfetti(false), 100);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50">
        <Heart className="animate-heartbeat text-pink-500" fill="currentColor" size={40} />
      </div>
    );
  }

  if (notFound || !surprise) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pink-50 px-5 text-center">
        <Heart className="text-pink-400" size={40} />
        <p className="font-serif-display text-2xl text-rose-900">This surprise isn't available.</p>
        <p className="text-rose-600">The link may be incomplete or not yet published.</p>
        <button onClick={() => navigate({ name: 'home' })} className="rounded-full bg-pink-600 px-5 py-2 text-white">
          Go home
        </button>
      </div>
    );
  }

  const theme = getTheme(surprise.theme);

  return (
    <div className={`relative min-h-screen overflow-x-hidden bg-gradient-to-b ${theme.bg} ${theme.text}`}>
      <FloatingHearts count={18} color={theme.heart} />
      <Confetti trigger={confetti} />
      {surprise.music_url && stage === 'experience' && (
        <MusicPlayer url={surprise.music_url} accentClass={theme.accent} />
      )}

      {!unlocked ? (
        <LovePadlock
          passcode={surprise.passcode}
          lockConfig={lockConfig}
          theme={theme}
          recipientName={surprise.recipient_name}
          onUnlock={() => setUnlocked(true)}
        />
      ) : stage === 'opening' ? (
        <OpeningScreen surprise={surprise} theme={theme} onOpen={openSurprise} />
      ) : (
        <Experience surprise={surprise} theme={theme} onReplay={() => setStage('opening')} navigate={navigate} />
      )}
    </div>
  );
}

function OpeningScreen({
  surprise,
  theme,
  onOpen,
}: {
  surprise: Surprise;
  theme: ReturnType<typeof getTheme>;
  onOpen: () => void;
}) {
  const [opened, setOpened] = useState(false);

  const handleOpen = () => {
    setOpened(true);
    setTimeout(onOpen, 1400);
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Sparkles count={24} color={theme.heart} />
      <div className="animate-fade-in-up">
        <div className={`mx-auto flex w-fit items-center gap-2 rounded-full ${theme.accentSoft} px-4 py-2 text-sm font-semibold`}>
          <Gift size={16} /> A little gift is waiting for you
        </div>
        <p className={`mt-5 font-script text-2xl ${theme.textSoft}`}>For {surprise.recipient_name || 'you'}</p>
        <h1 className={`mx-auto mt-4 max-w-2xl font-serif-display text-5xl font-bold leading-tight ${theme.text} text-balance md:text-7xl`}>
          {surprise.title}
        </h1>
        <p className={`mx-auto mt-5 max-w-md text-lg ${theme.textSoft}`}>{surprise.subtitle}</p>
      </div>

      <div className={`mt-8 flex items-center gap-2 text-sm font-medium ${theme.textSoft}`}>
        <Heart size={15} fill="currentColor" className="animate-pulse" />
        Tap the envelope when you are ready to open it
        <Heart size={15} fill="currentColor" className="animate-pulse" />
      </div>

      {/* Envelope */}
      <button
        onClick={handleOpen}
        disabled={opened}
        className="group relative mt-12 flex flex-col items-center"
        aria-label="Open your surprise"
      >
        <div
          className="relative h-40 w-56 transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', perspective: '800px' }}
        >
          {/* envelope body */}
          <div className={`absolute inset-0 rounded-lg shadow-xl ${theme.accentDark}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              {opened ? <Mail className="text-white/80" size={40} /> : <Lock className="text-white/80" size={38} />}
            </div>
          </div>
          {/* flap */}
          <div
            className="absolute left-0 right-0 top-0 h-0 w-0 transition-transform duration-700"
            style={{
              borderLeft: '112px solid transparent',
              borderRight: '112px solid transparent',
              borderTop: `80px solid ${theme.heart}`,
              transformOrigin: 'top',
              transform: opened ? 'rotateX(180deg)' : 'rotateX(0deg)',
              opacity: opened ? 0.8 : 1,
            }}
          />
          {/* letter peeking */}
          <div
            className={`absolute left-3 right-3 rounded bg-white p-2 shadow transition-all duration-700 ${theme.text}`}
            style={{
              top: opened ? '-20px' : '20px',
              height: opened ? '120px' : '40px',
            }}
          >
            <p className="font-script text-lg text-rose-700">{surprise.sender_name && `From ${surprise.sender_name}`}</p>
          </div>
        </div>

        <span className={`mt-8 flex items-center gap-2 rounded-full ${theme.accentDark} px-7 py-3.5 font-medium text-white shadow-lg transition group-hover:scale-105`}>
          <Lock size={18} /> {opened ? 'Opening your gift…' : 'Unlock Your Surprise'}
        </span>
      </button>

      {surprise.special_date && <OpeningCounter specialDate={surprise.special_date} theme={theme} />}
    </div>
  );
}

function OpeningCounter({ specialDate, theme }: { specialDate: string; theme: ReturnType<typeof getTheme> }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const start = new Date(`${specialDate}T00:00:00`);
  const difference = start.getTime() - now.getTime();
  if (Number.isNaN(start.getTime())) return null;

  if (difference > 0) {
    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
      <div className={`mt-8 rounded-2xl ${theme.surface} px-5 py-3 text-sm shadow-sm`}>
        <span className={theme.textSoft}>Your special day begins in </span>
        <strong className={theme.text}>{days}d {hours}h {minutes}m {seconds}s</strong>
      </div>
    );
  }

  const elapsed = getElapsedCalendar(specialDate, now);
  if (!elapsed) return null;
  return (
    <div className={`mt-8 rounded-2xl ${theme.surface} px-5 py-3 text-sm shadow-sm`}>
      <span className={theme.textSoft}>Together for </span>
      <strong className={theme.text}>{elapsed.years}y {elapsed.months}m {elapsed.days}d</strong>
    </div>
  );
}

function Experience({
  surprise,
  theme,
  onReplay,
  navigate,
}: {
  surprise: Surprise;
  theme: ReturnType<typeof getTheme>;
  onReplay: () => void;
  navigate: (r: Route) => void;
}) {
  return (
    <div className="relative z-10">
      <Header surprise={surprise} theme={theme} />
      <DateCounter surprise={surprise} theme={theme} />
      <LoveLetter surprise={surprise} theme={theme} />
      <PhotoGallery surprise={surprise} theme={theme} />
      <Reasons surprise={surprise} theme={theme} />
      <ScratchSurprise surprise={surprise} theme={theme} />
      <HugKiss theme={theme} />
      <LoveQuiz surprise={surprise} theme={theme} />
      <HiddenHeart surprise={surprise} theme={theme} />
      <Bouquet theme={theme} />
      <FinalSection surprise={surprise} theme={theme} onReplay={onReplay} navigate={navigate} />
      <Footer surprise={surprise} navigate={navigate} />
    </div>
  );
}

function Header({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  return (
    <header className="px-5 pt-16 text-center animate-fade-in-up">
      <Heart fill={theme.heart} size={36} style={{ color: theme.heart }} className="mx-auto animate-heartbeat" />
      <h1 className={`mx-auto mt-4 max-w-2xl font-serif-display text-4xl font-bold ${theme.text} text-balance md:text-6xl`}>
        {surprise.title}
      </h1>
      <p className={`mx-auto mt-4 max-w-md text-lg ${theme.textSoft}`}>{surprise.subtitle}</p>
      <p className={`mt-6 font-script text-3xl ${theme.accent}`}>For {surprise.recipient_name}</p>
      {surprise.special_date && (
        <p className={`mt-3 text-sm ${theme.textSoft}`}>
          {surprise.date_label}: {formatDate(surprise.special_date)}
        </p>
      )}
    </header>
  );
}

function DateCounter({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!surprise.special_date) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [surprise.special_date]);

  const elapsed = useMemo(() => {
    if (!surprise.special_date) return null;
    const start = new Date(surprise.special_date + 'T00:00:00');
    const diff = now.getTime() - start.getTime();
    if (diff < 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const calendar = getElapsedCalendar(surprise.special_date, now);
    if (!calendar) return null;
    return { hours, mins, secs, ...calendar };
  }, [now, surprise.special_date]);

  if (!elapsed) return null;

  return (
    <section className="mx-auto mt-16 max-w-2xl px-5">
      <div className={`rounded-3xl ${theme.surface} p-7 text-center shadow-lg`}>
        <p className={`font-serif-display text-xl font-semibold ${theme.text}`}>{surprise.date_label || 'Since that special day'}</p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          <Stat label="Years" value={elapsed.years} theme={theme} />
          <Stat label="Months" value={elapsed.months} theme={theme} />
          <Stat label="Days" value={elapsed.days} theme={theme} />
          <Stat label="Hours" value={elapsed.hours} theme={theme} />
        </div>
        <div className="mt-3 flex justify-center gap-4 text-sm">
          <span className={theme.textSoft}>{elapsed.mins}m</span>
          <span className={theme.textSoft}>{elapsed.secs}s</span>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, theme }: { label: string; value: number; theme: ReturnType<typeof getTheme> }) {
  return (
    <div className={`rounded-2xl ${theme.accentSoft} p-3`}>
      <div className={`font-serif-display text-3xl font-bold ${theme.text}`}>{value}</div>
      <div className={`text-xs uppercase tracking-wide ${theme.textSoft}`}>{label}</div>
    </div>
  );
}

function LoveLetter({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  const [open, setOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  return (
    <section className="mx-auto mt-20 max-w-2xl px-5">
      <h2 className={`text-center font-serif-display text-3xl font-bold ${theme.text}`}>A Letter For You</h2>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="group mx-auto mt-8 flex flex-col items-center"
          aria-label="Open the letter"
        >
          <div className={`relative h-36 w-52 rounded-lg shadow-xl ${theme.accentDark}`}>
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Mail size={36} />
            </div>
          </div>
          <span className={`mt-5 flex items-center gap-2 rounded-full border ${theme.accentSoft} px-5 py-2.5 font-medium transition group-hover:scale-105`}>
            <Mail size={18} /> Tap to open
          </span>
        </button>
      ) : (
        <div className={`mt-8 rounded-3xl border-2 border-dashed p-8 shadow-lg animate-scale-in ${theme.surface}`} style={{ borderColor: theme.heart + '55' }}>
          <p className={`font-script text-2xl ${theme.accent}`}>Dear {surprise.recipient_name},</p>
          <div className={`mt-4 whitespace-pre-wrap font-serif-display text-lg leading-relaxed ${theme.text}`}>
            <Typewriter text={surprise.love_letter} speed={18} />
          </div>
          <p className={`mt-6 font-script text-xl ${theme.accent}`}>— {surprise.sender_name || 'Always, me'}</p>

          {surprise.hidden_message && (
            <div className="mt-8 border-t pt-6" style={{ borderColor: theme.heart + '33' }}>
              <button
                onClick={() => setShowHidden((s) => !s)}
                className={`flex items-center gap-2 text-sm font-medium ${theme.accent} hover:underline`}
              >
                <Sparkle size={16} /> {showHidden ? 'Hide secret message' : 'Reveal a secret…'}
              </button>
              {showHidden && (
                <p className={`mt-3 animate-fade-in font-script text-xl italic ${theme.textSoft}`}>
                  {surprise.hidden_message}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PhotoGallery({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (surprise.photos.length === 0) return null;

  const rotations = [-3, 2, -1.5, 4, -2.5, 1, -4, 3, -1, 2.5, -3.5, 1.5];
  const tapeRotations = [-12, 8, -6, 14, -10, 7, -16, 11, -5, 9, -13, 6];

  return (
    <section className="mx-auto mt-20 max-w-4xl px-5">
      <h2 className={`text-center font-serif-display text-3xl font-bold ${theme.text}`}>Our Memories</h2>
      <p className={`mt-2 text-center ${theme.textSoft}`}>Tap any photo to view it full screen.</p>

      {/* Scrapbook board */}
      <div className="relative mt-10 rounded-3xl bg-[#fdf6ec] p-5 shadow-xl paper-texture sm:p-8">
        {/* cork board pin accents */}
        <div className="pointer-events-none absolute left-4 top-4 h-3 w-3 rounded-full bg-rose-300/60 shadow-sm" />
        <div className="pointer-events-none absolute right-4 top-4 h-3 w-3 rounded-full bg-amber-300/60 shadow-sm" />
        <div className="pointer-events-none absolute bottom-4 left-4 h-3 w-3 rounded-full bg-teal-300/50 shadow-sm" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-3 w-3 rounded-full bg-rose-300/60 shadow-sm" />

        {/* Dashed string line */}
        <svg className="pointer-events-none absolute left-8 right-8 top-8 w-[calc(100%-4rem)]" height="20" style={{ overflow: 'visible' }}>
          <line x1="0" y1="10" x2="100%" y2="10" stroke={theme.heart} strokeWidth="1.5" strokeDasharray="4 6" opacity="0.3" />
        </svg>

        <div className="relative grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-7">
          {surprise.photos.map((p, i) => {
            const rot = rotations[i % rotations.length];
            const tapeRot = tapeRotations[i % tapeRotations.length];
            return (
              <div
                key={i}
                className="scrapbook-photo group relative"
                style={{ ['--rot' as string]: `${rot}deg`, ['--tape-rot' as string]: `${tapeRot}deg` }}
              >
                {/* Washi tape */}
                <div
                  className="scrapbook-tape pointer-events-none absolute left-1/2 top-[-10px] z-20 h-6 w-16 -translate-x-1/2 opacity-80"
                  style={{
                    background: i % 2 === 0
                      ? 'repeating-linear-gradient(45deg, rgba(244,114,182,0.45) 0px, rgba(244,114,182,0.45) 4px, rgba(251,191,36,0.45) 4px, rgba(251,191,36,0.45) 8px)'
                      : 'repeating-linear-gradient(-45deg, rgba(45,212,191,0.4) 0px, rgba(45,212,191,0.4) 4px, rgba(96,165,250,0.4) 4px, rgba(96,165,250,0.4) 8px)',
                  }}
                />

                {/* Polaroid frame */}
                <button
                  onClick={() => setLightbox(i)}
                  className="block w-full cursor-pointer rounded-sm bg-white p-2 pb-7 text-left shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:!rotate-0"
                  style={{ transform: `rotate(${rot}deg)` }}
                >
                  <div className="relative aspect-square overflow-hidden rounded-sm bg-gray-100">
                    <img
                      src={p.url}
                      alt={p.caption}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  {p.caption ? (
                    <p className="mt-2 px-1 font-script text-sm leading-tight text-gray-700 line-clamp-2">
                      {p.caption}
                    </p>
                  ) : (
                    <p className="mt-2 px-1 font-script text-sm leading-tight text-gray-400 italic">
                      {p.date ? formatDate(p.date) : 'a memory'}
                    </p>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {lightbox !== null && (
        <Lightbox
          photos={surprise.photos}
          index={lightbox}
          setIndex={setLightbox}
          onClose={() => setLightbox(null)}
          theme={theme}
        />
      )}
    </section>
  );
}

function Lightbox({
  photos,
  index,
  setIndex,
  onClose,
  theme,
}: {
  photos: Surprise['photos'];
  index: number;
  setIndex: (i: number | null) => void;
  onClose: () => void;
  theme: ReturnType<typeof getTheme>;
}) {
  const p = photos[index];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in" onClick={onClose}>
      <button className="absolute right-5 top-5 text-white/80 hover:text-white" onClick={onClose}>
        <X size={28} />
      </button>
      {index > 0 && (
        <button
          className="absolute left-3 text-white/80 hover:text-white"
          onClick={(e) => { e.stopPropagation(); setIndex(index - 1); }}
        >
          <ChevronLeft size={36} />
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          className="absolute right-3 text-white/80 hover:text-white"
          onClick={(e) => { e.stopPropagation(); setIndex(index + 1); }}
        >
          <ChevronRight size={36} />
        </button>
      )}
      <div className="max-h-[85vh] max-w-md animate-scale-in bg-white p-3 pb-10 shadow-2xl" style={{ transform: 'rotate(-1deg)' }} onClick={(e) => e.stopPropagation()}>
        <img src={p.url} alt={p.caption} className="max-h-[65vh] w-full rounded-sm object-contain" />
        {(p.caption || p.date) && (
          <div className="mt-3 px-2 text-center">
            {p.caption && <p className="font-script text-lg text-gray-700">{p.caption}</p>}
            {p.date && <p className="text-sm text-gray-400">{formatDate(p.date)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Reasons({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  const [revealed, setRevealed] = useState<number | null>(null);

  if (surprise.reasons.length === 0) return null;

  return (
    <section className="mx-auto mt-20 max-w-2xl px-5">
      <h2 className={`text-center font-serif-display text-3xl font-bold ${theme.text}`}>Reasons Why I Love You</h2>
      <p className={`mt-2 text-center ${theme.textSoft}`}>Tap each one to reveal.</p>
      <div className="mt-8 space-y-3">
        {surprise.reasons.map((r, i) => (
          <button
            key={i}
            onClick={() => setRevealed(revealed === i ? null : i)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${theme.surface}`}
            style={{ borderColor: theme.heart + '33' }}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${theme.accentSoft} font-semibold`}>
              {revealed === i ? <Heart size={16} fill={theme.heart} style={{ color: theme.heart }} /> : i + 1}
            </span>
            <span className={`text-sm ${revealed === i ? theme.text : theme.textSoft}`}>
              {revealed === i ? r : 'Tap to reveal…'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ScratchSurprise({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  if (!surprise.hidden_message) return null;
  return (
    <section className="mx-auto mt-20 max-w-2xl px-5">
      <h2 className={`text-center font-serif-display text-3xl font-bold ${theme.text}`}>A Scratch Surprise</h2>
      <p className={`mt-2 text-center ${theme.textSoft}`}>Use your finger to scratch the card.</p>
      <div className="mt-8">
        <ScratchCard reveal={surprise.hidden_message} color={theme.heart} accentDark={theme.accentDark} />
      </div>
    </section>
  );
}

function HugKiss({ theme }: { theme: ReturnType<typeof getTheme> }) {
  const [hug, setHug] = useState(false);
  const [kiss, setKiss] = useState(false);

  const send = (which: 'hug' | 'kiss') => {
    if (which === 'hug') {
      setHug(true);
      setTimeout(() => setHug(false), 2000);
    } else {
      setKiss(true);
      setTimeout(() => setKiss(false), 2000);
    }
  };

  return (
    <section className="mx-auto mt-20 max-w-2xl px-5 text-center">
      <h2 className={`font-serif-display text-3xl font-bold ${theme.text}`}>Send Some Love</h2>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={() => send('hug')}
          className={`flex items-center gap-2 rounded-full ${theme.accentDark} px-6 py-3 font-medium text-white shadow-lg transition hover:scale-105`}
        >
          <Heart size={20} fill="currentColor" /> Tap for a Hug
        </button>
        <button
          onClick={() => send('kiss')}
          className={`flex items-center gap-2 rounded-full border-2 px-6 py-3 font-medium transition hover:scale-105`}
          style={{ borderColor: theme.heart, color: theme.heart }}
        >
          <Send size={18} /> Sending You a Kiss
        </button>
      </div>
      {(hug || kiss) && (
        <div className="pointer-events-none mt-6 flex justify-center">
          {hug && (
            <div className="animate-fade-in-up text-5xl">
              🤗
              <p className={`mt-2 font-script text-xl ${theme.accent}`}>A big hug, coming your way!</p>
            </div>
          )}
          {kiss && (
            <div className="animate-fade-in-up text-5xl">
              💋
              <p className={`mt-2 font-script text-xl ${theme.accent}`}>Mwah! Sent with love.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LoveQuiz({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (surprise.quiz.length === 0) return null;

  const correctCount = surprise.quiz.filter((q, i) => answers[i] === q.answer).length;

  return (
    <section className="mx-auto mt-20 max-w-2xl px-5">
      <h2 className={`text-center font-serif-display text-3xl font-bold ${theme.text}`}>Our Love Quiz</h2>
      <p className={`mt-2 text-center ${theme.textSoft}`}>How well do you know us?</p>
      <div className="mt-8 space-y-5">
        {surprise.quiz.map((q: QuizQuestion, i: number) => (
          <div key={i} className={`rounded-2xl border p-5 ${theme.surface}`} style={{ borderColor: theme.heart + '22' }}>
            <p className={`font-serif-display text-lg font-semibold ${theme.text}`}>{q.question}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => {
                const chosen = answers[i] === oi;
                const isCorrect = q.answer === oi;
                const showResult = submitted && chosen;
                return (
                  <button
                    key={oi}
                    onClick={() => !submitted && setAnswers({ ...answers, [i]: oi })}
                    className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition ${
                      submitted
                        ? isCorrect
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : showResult
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-gray-200 text-gray-500'
                        : chosen
                        ? 'border-pink-500 bg-pink-50 ' + theme.text
                        : 'border-gray-200 ' + theme.textSoft + ' hover:border-pink-300'
                    }`}
                  >
                    {opt}
                    {submitted && isCorrect && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < surprise.quiz.length}
          className={`mt-6 w-full rounded-full ${theme.accentDark} py-3.5 font-medium text-white shadow transition hover:scale-[1.01] disabled:opacity-50`}
        >
          See my score
        </button>
      ) : (
        <div className={`mt-6 rounded-2xl ${theme.accentSoft} p-5 text-center`}>
          <p className={`font-serif-display text-2xl font-bold ${theme.text}`}>You got {correctCount}/{surprise.quiz.length}!</p>
          <p className={`mt-1 text-sm ${theme.textSoft}`}>
            {correctCount === surprise.quiz.length ? 'Perfect! You know us by heart.' : 'Every love story has its surprises.'}
          </p>
          <button onClick={() => { setSubmitted(false); setAnswers({}); }} className={`mt-4 text-sm ${theme.accent} hover:underline`}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}

function HiddenHeart({ surprise, theme }: { surprise: Surprise; theme: ReturnType<typeof getTheme> }) {
  const [found, setFound] = useState(false);

  return (
    <section className="mx-auto mt-20 max-w-2xl px-5 text-center">
      <h2 className={`font-serif-display text-3xl font-bold ${theme.text}`}>A Surprise Behind a Heart</h2>
      <p className={`mt-2 ${theme.textSoft}`}>Tap the heart to find a hidden message.</p>
      <button
        onClick={() => setFound(true)}
        className="mt-8 transition hover:scale-110"
        aria-label="Reveal hidden heart message"
      >
        <Heart
          size={72}
          fill={found ? theme.heart : 'none'}
          style={{ color: theme.heart }}
          className={found ? 'animate-heartbeat' : 'animate-pulse-glow'}
        />
      </button>
      {found && (
        <p className={`mx-auto mt-6 max-w-md animate-fade-in-up font-script text-2xl italic ${theme.accent}`}>
          {surprise.hidden_message || 'You are loved more than words can hold.'}
        </p>
      )}
    </section>
  );
}

function Bouquet({ theme }: { theme: ReturnType<typeof getTheme> }) {
  const [petals, setPetals] = useState(false);
  return (
    <section className="mx-auto mt-20 max-w-2xl px-5 text-center">
      <h2 className={`font-serif-display text-3xl font-bold ${theme.text}`}>A Virtual Bouquet</h2>
      <button
        onClick={() => { setPetals(true); setTimeout(() => setPetals(false), 4000); }}
        className={`mt-6 inline-flex items-center gap-2 rounded-full ${theme.accentDark} px-6 py-3 font-medium text-white shadow transition hover:scale-105`}
      >
        <Flower2 size={20} /> Send roses
      </button>
      {petals && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 text-3xl"
              style={{
                left: `${Math.random() * 100}%`,
                animation: `confettiFall ${3 + Math.random() * 3}s linear ${Math.random()}s forwards`,
              }}
            >
              🌹
            </div>
          ))}
        </div>
      )}
      <p className={`mt-4 font-script text-xl ${theme.accent}`}>Roses for the one who makes life bloom.</p>
    </section>
  );
}

function FinalSection({
  surprise,
  theme,
  onReplay,
  navigate,
}: {
  surprise: Surprise;
  theme: ReturnType<typeof getTheme>;
  onReplay: () => void;
  navigate: (r: Route) => void;
}) {
  return (
    <section className="mx-auto mt-24 max-w-2xl px-5 pb-20 text-center">
      <div className={`rounded-3xl ${theme.surface} p-8 shadow-xl`}>
        <PartyPopper className="mx-auto" size={36} style={{ color: theme.heart }} />
        <h2 className={`mt-4 font-serif-display text-4xl font-bold ${theme.text}`}>The Final Surprise</h2>
        <p className={`mx-auto mt-4 max-w-md text-lg leading-relaxed ${theme.textSoft}`}>
          {surprise.final_message || 'Thank you for being my favorite chapter. Replay this whenever you need a reminder.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={onReplay}
            className={`flex items-center gap-2 rounded-full ${theme.accentDark} px-6 py-3 font-medium text-white shadow transition hover:scale-105`}
          >
            <RotateCcw size={18} /> Replay the Surprise
          </button>
          <button
            onClick={() => navigate({ name: 'home' })}
            className={`flex items-center gap-2 rounded-full border px-6 py-3 font-medium ${theme.accent} transition hover:scale-105`}
            style={{ borderColor: theme.heart }}
          >
            <Heart size={18} /> Make your own
          </button>
        </div>
      </div>

      {surprise.occasion === 'birthday' && <BirthdayCake theme={theme} />}
    </section>
  );
}

function BirthdayCake({ theme }: { theme: ReturnType<typeof getTheme> }) {
  const [lit, setLit] = useState(true);
  return (
    <div className="mx-auto mt-12 max-w-xs text-center">
      <div className="relative mx-auto h-40 w-44">
        {/* candles */}
        <div className="absolute top-0 left-1/2 flex -translate-x-1/2 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${lit ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`}
                style={{ boxShadow: lit ? '0 0 12px rgba(251,191,36,0.8)' : 'none' }}
              />
              <div className="h-6 w-1 bg-pink-300" />
            </div>
          ))}
        </div>
        {/* cake */}
        <div className="absolute bottom-0 h-24 w-44 rounded-b-lg rounded-t-md bg-gradient-to-b from-pink-300 to-pink-500 shadow-lg" />
        <div className="absolute bottom-20 h-3 w-44 bg-white rounded-full" />
      </div>
      <button
        onClick={() => setLit(!lit)}
        className={`mt-5 rounded-full ${theme.accentDark} px-5 py-2 text-sm font-medium text-white`}
      >
        {lit ? <span className="flex items-center gap-1.5"><Cake size={16} /> Blow out candles</span> : <span className="flex items-center gap-1.5"><Sparkle size={16} /> Relight</span>}
      </button>
      {lit && <p className={`mt-3 font-script text-xl ${theme.accent}`}>Make a wish…</p>}
    </div>
  );
}

function Footer({ surprise, navigate }: { surprise: Surprise; navigate: (r: Route) => void }) {
  return (
    <footer className="border-t border-pink-100/40 py-8 text-center">
      <p className="text-sm opacity-60">
        Made with love by {surprise.sender_name || 'someone who cares'}.
      </p>
      <button onClick={() => navigate({ name: 'home' })} className="mt-2 text-sm text-pink-500 hover:underline">
        Create your own LoveSurprise
      </button>
    </footer>
  );
}

function demoSurprise(): Surprise {
  const today = new Date();
  const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
  return {
    id: 'demo',
    slug: 'demo',
    occasion: 'anniversary',
    theme: 'pink',
    recipient_name: 'Alex',
    sender_name: 'Sam',
    title: 'A Little Surprise for You',
    subtitle: 'Because you deserve to be celebrated today and always.',
    special_date: twoYearsAgo.toISOString().slice(0, 10),
    date_label: 'The day we became "us"',
    passcode: '123456',
    lock_config: { color: 'rose_gold', initials: 'A ♡ S', engraved_message: 'Our love is locked here, but my heart will always be yours. ♡', unlock_message: "You found the key to my heart! Here's a little something made just for you. 💗" },
    gcash_ref: '',
    love_letter:
      'My dearest Alex,\n\nIf I had to choose one moment to live in forever, it would be the moment I first saw you smile. You walked into my life quietly and rearranged everything without trying.\n\nI love how you remember the small things I mention once and forget myself. I love that you make ordinary days feel like something worth keeping.\n\nNo matter the distance, you will always have a special place in my heart.\n\nHappy anniversary, my favorite person.',
    hidden_message: 'If you are reading this, know that someone is thinking of you with their whole heart.',
    reasons: [
      'You make me laugh even when I do not want to.',
      'You remember the little things I forget I even said.',
      'Your hugs feel like coming home.',
      'You make ordinary Tuesdays feel special.',
    ],
    quiz: [
      { question: 'Where did we first meet?', options: ['A coffee shop', 'A party', 'Work', 'School'], answer: 1 },
      { question: 'Our first trip together?', options: ['Beach', 'Mountains', 'City', 'Staycation'], answer: 0 },
    ],
    photos: [],
    music_url: '',
    final_message: 'Thank you for being my favorite chapter. Replay this whenever you need a reminder.',
    paid: true,
    published: true,
    created_at: new Date().toISOString(),
    order_number: 'LS-DEMO1',
    payment_status: 'paid',
    receipt_url: '',
    customer_email: '',
    customer_note: '',
    admin_note: '',
    verified_at: null,
    custom_theme: {},
    custom_font_head: '',
    custom_font_body: '',
  };
}

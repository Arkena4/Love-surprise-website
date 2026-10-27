import { useState } from 'react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Sparkles } from '@/components/Sparkles';
import { OCCASIONS, THEMES } from '@/lib/types';
import { Route } from '@/lib/router';
import {
  Heart,
  Gift,
  Sparkle,
  Music,
  Image as ImageIcon,
  PenLine,
  PartyPopper,
  Check,
  ArrowRight,
  Star,
  Instagram,
} from 'lucide-react';

interface Props {
  navigate: (r: Route) => void;
}

const PRICING = [
  {
    name: 'Basic',
    price: 99,
    pesos: '₱99',
    features: [
      'One personalized love website',
      'Choose from 6 romantic themes',
      'Love letter with typing animation',
      'Photo gallery (up to 6 photos)',
      'Live relationship counter',
      'Shareable link + QR code',
    ],
    highlight: false,
  },
];

const FEATURES = [
  { icon: PenLine, title: 'Handwritten Love Letter', text: 'A digital letter with a typing animation, sealed in an envelope your loved one taps to open.' },
  { icon: ImageIcon, title: 'Memory Gallery', text: 'Polaroid-framed photos with captions and dates in an elegant full-screen gallery.' },
  { icon: Gift, title: 'Interactive Surprises', text: 'Scratch cards, hidden gifts, a reasons-why-I-love-you list, hugs, kisses and a love quiz.' },
  { icon: Music, title: 'Background Music', text: 'Add a song that means something. The visitor chooses when the music starts.' },
  { icon: PartyPopper, title: 'Live Date Counter', text: 'Count the days, months and years since the moment that changed everything.' },
  { icon: Sparkle, title: 'Themes & Occasions', text: 'Six gorgeous themes for birthdays, anniversaries, weddings, proposals and more.' },
];

export function LandingPage({ navigate }: Props) {
  const [activeTheme, setActiveTheme] = useState(0);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50">
      <FloatingHearts count={16} />

      {/* Nav */}
      <nav className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Heart className="text-pink-600" fill="currentColor" size={24} />
          <span className="font-serif-display text-xl font-semibold text-rose-900">LoveSurprise</span>
        </div>
        <button
          onClick={() => navigate({ name: 'create' })}
          className="rounded-full bg-pink-600 px-5 py-2 text-sm font-medium text-white shadow-md transition hover:scale-105 hover:bg-pink-700"
        >
          Create Your Surprise
        </button>
      </nav>

      {/* Hero */}
      <header className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10 text-center md:pt-20">
        <Sparkles count={20} />
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-4 py-1.5 text-sm font-medium text-pink-700">
            <Sparkle size={14} /> A tiny romantic world made for two
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-serif-display text-5xl font-bold leading-tight text-rose-900 text-balance md:text-7xl">
            Surprise the one you love with a <span className="shimmer-text">digital love letter</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rose-700/80">
            Personalized, animated, and deeply heartfelt websites for birthdays, anniversaries,
            proposals, and every moment worth celebrating. Built once. Cherished forever.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate({ name: 'create' })}
              className="group flex items-center gap-2 rounded-full bg-pink-600 px-7 py-3.5 font-medium text-white shadow-lg transition hover:scale-105 hover:bg-pink-700"
            >
              Create Your Surprise
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate({ name: 'view', slug: 'demo' })}
              className="rounded-full border border-pink-300 bg-white/70 px-7 py-3.5 font-medium text-pink-700 backdrop-blur transition hover:scale-105 hover:bg-white"
            >
              Preview a Demo
            </button>
          </div>
          <p className="mt-5 text-sm text-rose-500">Just ₱99 to publish &amp; share. No account needed to view.</p>
        </div>
      </header>

      {/* Demo preview strip */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {THEMES.slice(0, 3).map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTheme(i)}
              className={`group relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br ${t.bg} text-left shadow-lg transition hover:scale-[1.02]`}
            >
              <Sparkles count={8} color={t.heart} />
              <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
              <div className="relative z-10 p-5">
                <Heart className="mb-2" fill={t.heart} size={28} style={{ color: t.heart }} />
                <h3 className={`font-serif-display text-2xl font-semibold ${t.text}`}>{t.name}</h3>
                <p className={`mt-1 text-sm ${t.textSoft}`}>{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-serif-display text-4xl font-bold text-rose-900">
          Everything inside the surprise
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-rose-700/70">
          Every feature actually works — not just decoration. Tap, scratch, type, play, and reveal.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-pink-100 bg-white/80 p-6 shadow-sm backdrop-blur transition hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-600">
                <f.icon size={22} />
              </div>
              <h3 className="font-serif-display text-xl font-semibold text-rose-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-rose-700/70">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Occasions */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-serif-display text-4xl font-bold text-rose-900">
          A template for every occasion
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OCCASIONS.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-pink-100 bg-white/80 p-5 text-center shadow-sm transition hover:scale-[1.03] hover:shadow-md"
            >
              <div className="text-4xl">{o.emoji}</div>
              <h3 className="mt-3 font-serif-display text-lg font-semibold text-rose-900">{o.label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-rose-700/60">{o.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Theme gallery */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-serif-display text-4xl font-bold text-rose-900">
          Six romantic themes
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => (
            <div
              key={t.id}
              className={`relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br ${t.bg} shadow-lg`}
            >
              <Sparkles count={10} color={t.heart} />
              <div className="relative z-10 flex h-full flex-col justify-between p-5">
                <Heart fill={t.heart} size={24} style={{ color: t.heart }} />
                <div>
                  <h3 className={`font-serif-display text-2xl font-semibold ${t.text}`}>{t.name}</h3>
                  <p className={`text-sm ${t.textSoft}`}>{t.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-serif-display text-4xl font-bold text-rose-900">
          Simple, honest pricing
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-rose-700/70">
          Pay once. Your surprise stays live. No subscriptions, no hidden fees.
        </p>
        <div className="mx-auto mt-12 max-w-md">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl border bg-white/90 p-7 shadow-lg backdrop-blur transition hover:shadow-xl ${
                p.highlight ? 'border-pink-400 ring-2 ring-pink-300' : 'border-pink-100'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pink-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="font-serif-display text-2xl font-semibold text-rose-900">{p.name}</h3>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-serif-display text-4xl font-bold text-pink-600">{p.pesos}</span>
                <span className="mb-1 text-sm text-rose-500">one-time</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-rose-800">
                    <Check size={16} className="mt-0.5 shrink-0 text-pink-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate({ name: 'create' })}
                className={`mt-7 w-full rounded-full py-3 font-medium transition hover:scale-[1.02] ${
                  p.highlight
                    ? 'bg-pink-600 text-white shadow-md hover:bg-pink-700'
                    : 'border border-pink-300 text-pink-700 hover:bg-pink-50'
                }`}
              >
                Start for ₱99
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-serif-display text-4xl font-bold text-rose-900">
          Made for moments that matter
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { quote: 'She opened it on her birthday and cried happy tears. Worth every peso.', who: '— Marco, Cebu' },
            { quote: 'The proposal template was cinematic. She said yes before the letter finished typing.', who: '— JP, Manila' },
            { quote: 'Our monthsary site is now our little corner of the internet. So special.', who: '— Bea, Davao' },
          ].map((t) => (
            <div key={t.who} className="rounded-2xl border border-pink-100 bg-white/80 p-6 shadow-sm">
              <div className="mb-3 flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="font-serif-display text-lg italic text-rose-800">“{t.quote}”</p>
              <p className="mt-3 text-sm text-rose-600">{t.who}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400 p-10 text-white shadow-xl">
          <Heart className="mx-auto animate-heartbeat" fill="currentColor" size={40} />
          <h2 className="mt-4 font-serif-display text-4xl font-bold">Ready to make them smile?</h2>
          <p className="mt-3 text-white/90">
            Build your surprise in minutes. Pay ₱99 to publish and share the link with the one you love.
          </p>
          <button
            onClick={() => navigate({ name: 'create' })}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-semibold text-pink-600 shadow-lg transition hover:scale-105"
          >
            Create Your Surprise <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-pink-100 py-8 text-center text-sm text-rose-500">
        <p>Made with love. Every surprise is a tiny romantic world made for two.</p>
        <a
          href="https://instagram.com/arcnnnee"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white/60 px-4 py-2 text-sm font-medium text-pink-700 transition hover:bg-white"
        >
          <Instagram size={16} /> Inquire on Instagram @arcnnnee
        </a>
        <div className="mt-3">
          <button onClick={() => navigate({ name: 'admin-login' })} className="text-xs text-rose-400 hover:text-rose-600 hover:underline">
            Admin Login
          </button>
        </div>
      </footer>
    </div>
  );
}

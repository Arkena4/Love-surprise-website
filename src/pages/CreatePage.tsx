import { useState, useEffect, useRef } from 'react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Sparkles } from '@/components/Sparkles';
import { Route } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { sampleSurprise, SAMPLE_LETTER, SAMPLE_REASONS, SAMPLE_QUIZ, getElapsedCalendar } from '@/lib/utils';
import { OCCASIONS, THEMES, Occasion, PhotoItem, QuizQuestion, ThemeId, Surprise, ThemeConfig, getTheme, DEFAULT_LOCK_CONFIG, LOCK_COLORS, LockConfig } from '@/lib/types';
import {
  Heart,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  Smartphone,
  Monitor,
  RotateCcw,
  Upload,
  X,
  Sparkle,
} from 'lucide-react';

interface Props {
  navigate: (r: Route) => void;
}

type Draft = Omit<Surprise, 'id' | 'created_at'>;

const STEPS = ['Occasion & Theme', 'Names & Message', 'Love Letter', 'Photos', 'Extras & Music'];
const STORAGE_KEY = 'lovesurprise_draft';

export function CreatePage({ navigate }: Props) {
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as Draft;
    } catch {
      // ignore
    }
    return sampleSurprise();
  });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [history, setHistory] = useState<Draft[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore quota errors
    }
  }, [draft]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setHistory((h) => [...h.slice(-9), draft]);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setDraft(prev);
      return h.slice(0, -1);
    });
  };

  const resetTheme = () => {
    setHistory((h) => [...h.slice(-9), draft]);
    setDraft((d) => ({
      ...d,
      theme: 'pink' as ThemeId,
      custom_theme: {},
      custom_font_head: '',
      custom_font_body: '',
    }));
  };

  const addPhoto = () => {
    const item: PhotoItem = { url: '', caption: '', date: '' };
    set('photos', [...draft.photos, item]);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB.');
      return;
    }
    setError(null);
    setUploadingIdx(idx);

    // Read as data URL for instant preview + storage in the draft
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const next = [...draft.photos];
      next[idx] = { ...next[idx], url: dataUrl };
      setHistory((h) => [...h.slice(-9), draft]);
      setDraft((d) => ({ ...d, photos: next }));
      setUploadingIdx(null);
    };
    reader.onerror = () => {
      setError('Could not load that image. Please try another.');
      setUploadingIdx(null);
    };
    reader.readAsDataURL(file);

    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const addPhotoByUpload = () => {
    const item: PhotoItem = { url: '', caption: '', date: '' };
    const newIdx = draft.photos.length;
    setHistory((h) => [...h.slice(-9), draft]);
    setDraft((d) => ({ ...d, photos: [...d.photos, item] }));
    // trigger file picker for the new slot
    setTimeout(() => {
      const input = document.getElementById(`photo-upload-${newIdx}`) as HTMLInputElement | null;
      input?.click();
    }, 100);
  };

  const updatePhoto = (i: number, patch: Partial<PhotoItem>) => {
    const next = [...draft.photos];
    next[i] = { ...next[i], ...patch };
    set('photos', next);
  };
  const removePhoto = (i: number) => set('photos', draft.photos.filter((_, idx) => idx !== i));

  const addReason = () => set('reasons', [...draft.reasons, '']);
  const updateReason = (i: number, v: string) => {
    const next = [...draft.reasons];
    next[i] = v;
    set('reasons', next);
  };
  const removeReason = (i: number) => set('reasons', draft.reasons.filter((_, idx) => idx !== i));

  const addQuiz = () => set('quiz', [...draft.quiz, { question: '', options: ['', '', '', ''], answer: 0 } as QuizQuestion]);
  const updateQuiz = (i: number, patch: Partial<QuizQuestion>) => {
    const next = [...draft.quiz];
    next[i] = { ...next[i], ...patch };
    set('quiz', next);
  };
  const removeQuiz = (i: number) => set('quiz', draft.quiz.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!/^\d{6}$/.test(draft.passcode)) {
      setError('Please choose a 6-digit passcode before continuing.');
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const toInsert = {
        slug: draft.slug,
        occasion: draft.occasion,
        theme: draft.theme,
        recipient_name: draft.recipient_name,
        sender_name: draft.sender_name,
        title: draft.title,
        subtitle: draft.subtitle,
        special_date: draft.special_date,
        date_label: draft.date_label,
        passcode: draft.passcode,
        lock_config: draft.lock_config as unknown as Record<string, unknown>,
        love_letter: draft.love_letter,
        hidden_message: draft.hidden_message,
        reasons: draft.reasons,
        quiz: draft.quiz as unknown as Record<string, unknown>[],
        photos: draft.photos as unknown as Record<string, unknown>[],
        music_url: draft.music_url,
        final_message: draft.final_message,
        custom_theme: draft.custom_theme as unknown as Record<string, unknown>,
        custom_font_head: draft.custom_font_head,
        custom_font_body: draft.custom_font_body,
      };
      const { data, error: e } = await supabase
        .from('surprises')
        .insert(toInsert)
        .select('slug')
        .single();
      if (e) throw e;
      // clear saved draft
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      navigate({ name: 'pay', slug: data.slug });
    } catch (err) {
      setError('Could not save your surprise. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const canNext = step < STEPS.length - 1;
  const theme = getTheme(draft.theme);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50">
      <FloatingHearts count={8} />
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
            <ArrowLeft size={16} /> Back home
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 rounded-full border border-pink-300 bg-white/80 px-3 py-2 text-sm font-medium text-pink-700 transition hover:bg-white disabled:opacity-40"
            >
              <RotateCcw size={14} /> Undo
            </button>
          </div>
        </div>

        <h1 className="mt-4 text-center font-serif-display text-4xl font-bold text-rose-900">Build Your Surprise</h1>
        <p className="mt-2 text-center text-rose-700/70">Customize freely — your work saves automatically. Switch themes anytime to see how it looks.</p>

        {/* Steps */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                i === step ? 'bg-pink-600 text-white shadow' : 'bg-white/70 text-rose-600 hover:bg-white'
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {/* Split layout: form + live preview */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Form card */}
          <div className="rounded-3xl border border-pink-100 bg-white/90 p-6 shadow-sm backdrop-blur md:p-8">
            {/* Step 0: Occasion & Theme */}
            {step === 0 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="mb-3 block font-serif-display text-lg font-semibold text-rose-900">Choose an occasion</label>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {OCCASIONS.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => set('occasion', o.id as Occasion)}
                        className={`rounded-2xl border-2 p-4 text-center transition hover:scale-[1.02] ${
                          draft.occasion === o.id ? 'border-pink-500 bg-pink-50' : 'border-pink-100 bg-white'
                        }`}
                      >
                        <div className="text-3xl">{o.emoji}</div>
                        <div className="mt-2 text-sm font-medium text-rose-900">{o.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme picker — always visible, instant preview */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="font-serif-display text-lg font-semibold text-rose-900">Pick a theme</label>
                    <button onClick={resetTheme} className="flex items-center gap-1 text-sm text-pink-600 hover:underline">
                      <RotateCcw size={14} /> Reset
                    </button>
                  </div>
                  <p className="mb-3 text-sm text-rose-500">Tap any theme to see it instantly in the preview →</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => set('theme', t.id as ThemeId)}
                        className={`relative h-32 overflow-hidden rounded-2xl bg-gradient-to-br ${t.bg} text-left transition hover:scale-[1.02] ${
                          draft.theme === t.id ? 'ring-2 ring-pink-500' : ''
                        }`}
                      >
                        <div className={`relative z-10 p-4 ${t.text}`}>
                          <Heart fill={t.heart} size={18} style={{ color: t.heart }} />
                          <h4 className="mt-2 font-serif-display text-lg font-semibold">{t.name}</h4>
                          <p className={`text-xs ${t.textSoft}`}>{t.description}</p>
                        </div>
                        {draft.theme === t.id && (
                          <div className="absolute right-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-pink-600 text-white">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Names & Message */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <Field label="Recipient's name">
                  <input value={draft.recipient_name} onChange={(e) => set('recipient_name', e.target.value)} placeholder="e.g. Alex" className={inputCls} />
                </Field>
                <Field label="Your name (sender)">
                  <input value={draft.sender_name} onChange={(e) => set('sender_name', e.target.value)} placeholder="e.g. Sam" className={inputCls} />
                </Field>
                <Field label="Headline greeting">
                  <input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="A Little Surprise for You" className={inputCls} />
                </Field>
                <Field label="Subtitle">
                  <textarea value={draft.subtitle} onChange={(e) => set('subtitle', e.target.value)} rows={2} placeholder="Because you deserve to be celebrated today and always." className={inputCls} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Special date">
                    <input type="date" value={draft.special_date ?? ''} onChange={(e) => set('special_date', e.target.value || null)} className={inputCls} />
                  </Field>
                  <Field label="Date label">
                    <input value={draft.date_label} onChange={(e) => set('date_label', e.target.value)} placeholder="The day we met" className={inputCls} />
                  </Field>
                </div>
                <Field label="6-digit passcode">
                  <input
                    value={draft.passcode}
                    onChange={(e) => set('passcode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    className={inputCls + ' tracking-[0.35em]'}
                  />
                  <p className="mt-1.5 text-xs text-rose-500">Your loved one must enter this code before seeing the envelope.</p>
                </Field>
                <Field label="Final message (shown at the end)">
                  <textarea value={draft.final_message} onChange={(e) => set('final_message', e.target.value)} rows={2} className={inputCls} />
                </Field>
              </div>
            )}

            {/* Step 2: Love Letter */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="font-serif-display text-lg font-semibold text-rose-900">Your love letter</label>
                  <button onClick={() => set('love_letter', SAMPLE_LETTER)} className="text-sm text-pink-600 hover:underline">
                    Use sample letter
                  </button>
                </div>
                <textarea
                  value={draft.love_letter}
                  onChange={(e) => set('love_letter', e.target.value)}
                  rows={12}
                  className={inputCls + ' font-serif-display text-lg leading-relaxed'}
                  placeholder="Write from the heart…"
                />
                <Field label="Hidden secret message (revealed behind a heart)">
                  <textarea value={draft.hidden_message} onChange={(e) => set('hidden_message', e.target.value)} rows={2} className={inputCls} />
                </Field>
              </div>
            )}

            {/* Step 3: Photos — easy upload */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="font-serif-display text-lg font-semibold text-rose-900">Photos &amp; memories</label>
                  <button
                    onClick={addPhotoByUpload}
                    className="flex items-center gap-1.5 rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
                  >
                    <Upload size={16} /> Upload photo
                  </button>
                </div>
                <p className="text-sm text-rose-600">Tap "Upload photo" to pick a picture from your phone or computer. You can also paste a link if you prefer.</p>

                {draft.photos.length === 0 && (
                  <button
                    onClick={addPhotoByUpload}
                    className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-pink-200 py-12 text-rose-400 transition hover:border-pink-400 hover:bg-pink-50/50"
                  >
                    <Upload size={32} />
                    <p className="mt-2 text-sm font-medium text-pink-600">Tap to upload your first photo</p>
                    <p className="text-xs">From your phone gallery or computer — no link needed</p>
                  </button>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {draft.photos.map((p, i) => (
                    <div key={i} className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm">
                      {p.url ? (
                        <div className="relative mb-3">
                          <img src={p.url} alt={p.caption} className="h-40 w-full rounded-xl object-cover" />
                          <button
                            onClick={() => updatePhoto(i, { url: '' })}
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="mb-3 flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/40 transition hover:border-pink-400 hover:bg-pink-50">
                          {uploadingIdx === i ? (
                            <span className="text-sm text-pink-500">Loading…</span>
                          ) : (
                            <>
                              <Upload size={24} className="text-pink-400" />
                              <span className="mt-1 text-xs text-pink-600">Tap to upload</span>
                            </>
                          )}
                          <input
                            id={`photo-upload-${i}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, i)}
                            className="hidden"
                          />
                        </label>
                      )}
                      <input
                        value={p.url.startsWith('data:') ? '' : p.url}
                        onChange={(e) => updatePhoto(i, { url: e.target.value })}
                        placeholder="Or paste an image link here"
                        className={inputCls + ' mb-2 text-sm'}
                      />
                      <input value={p.caption} onChange={(e) => updatePhoto(i, { caption: e.target.value })} placeholder="Caption (e.g. Our first date)" className={inputCls + ' mb-2 text-sm'} />
                      <div className="flex gap-2">
                        <input type="date" value={p.date} onChange={(e) => updatePhoto(i, { date: e.target.value })} className={inputCls + ' text-sm flex-1'} />
                        <button onClick={() => removePhoto(i)} className="rounded-lg bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {draft.photos.length > 0 && (
                  <button onClick={addPhotoByUpload} className="flex items-center gap-1.5 text-sm text-pink-600 hover:underline">
                    <Plus size={14} /> Add another photo
                  </button>
                )}
              </div>
            )}

            {/* Step 4: Extras & Music */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-serif-display text-lg font-semibold text-rose-900">Reasons why I love you</label>
                    <button onClick={() => set('reasons', SAMPLE_REASONS)} className="text-sm text-pink-600 hover:underline">Use sample</button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {draft.reasons.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={r} onChange={(e) => updateReason(i, e.target.value)} placeholder={`Reason #${i + 1}`} className={inputCls} />
                        <button onClick={() => removeReason(i)} className="rounded-lg bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button onClick={addReason} className="flex items-center gap-1.5 text-sm text-pink-600 hover:underline">
                      <Plus size={14} /> Add a reason
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-serif-display text-lg font-semibold text-rose-900">Love quiz</label>
                    <button onClick={() => set('quiz', SAMPLE_QUIZ)} className="text-sm text-pink-600 hover:underline">Use sample</button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {draft.quiz.map((q, i) => (
                      <div key={i} className="rounded-xl border border-pink-100 bg-pink-50/50 p-3">
                        <div className="flex gap-2">
                          <input value={q.question} onChange={(e) => updateQuiz(i, { question: e.target.value })} placeholder="Question" className={inputCls + ' flex-1'} />
                          <button onClick={() => removeQuiz(i)} className="rounded-lg bg-rose-100 p-2 text-rose-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={q.answer === oi}
                                onChange={() => updateQuiz(i, { answer: oi })}
                                className="accent-pink-600"
                              />
                              <input
                                value={opt}
                                onChange={(e) => {
                                  const next = [...q.options];
                                  next[oi] = e.target.value;
                                  updateQuiz(i, { options: next });
                                }}
                                placeholder={`Option ${oi + 1}`}
                                className={inputCls + ' text-sm'}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={addQuiz} className="flex items-center gap-1.5 text-sm text-pink-600 hover:underline">
                      <Plus size={14} /> Add a question
                    </button>
                  </div>
                </div>

                <Field label="Music link (optional)">
                  <input
                    value={draft.music_url}
                    onChange={(e) => set('music_url', e.target.value)}
                    placeholder="Paste the mp3 or audio link your client prefers"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-xs text-rose-500">Visitors can choose when to start it from the music button.</p>
                </Field>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
            )}

            {/* Nav buttons */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => (step === 0 ? navigate({ name: 'home' }) : setStep(step - 1))}
                className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-pink-50"
              >
                <ArrowLeft size={16} /> {step === 0 ? 'Home' : 'Back'}
              </button>
              {canNext ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1.5 rounded-full bg-pink-600 px-6 py-2.5 text-sm font-medium text-white shadow transition hover:scale-105 hover:bg-pink-700"
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full bg-pink-600 px-6 py-2.5 text-sm font-medium text-white shadow transition hover:scale-105 hover:bg-pink-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save & Continue to Pay'} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Live preview — always visible on desktop, toggle on mobile */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-3xl border border-pink-100 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-rose-800">Live Preview</span>
                  <span className="ml-2 rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700">Updates instantly</span>
                </div>
                <div className="flex rounded-full bg-pink-50 p-1">
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${previewMode === 'mobile' ? 'bg-pink-600 text-white' : 'text-pink-600'}`}
                  >
                    <Smartphone size={14} /> Phone
                  </button>
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${previewMode === 'desktop' ? 'bg-pink-600 text-white' : 'text-pink-600'}`}
                  >
                    <Monitor size={14} /> Desktop
                  </button>
                </div>
              </div>
              <LivePreview draft={draft} theme={theme} mode={previewMode} />
              <p className="mt-3 text-center text-xs text-rose-400">
                This is exactly how your loved one will see it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LivePreview({ draft, theme, mode }: { draft: Draft; theme: ThemeConfig; mode: 'mobile' | 'desktop' }) {
  const containerCls = mode === 'mobile'
    ? 'mx-auto max-w-[280px]'
    : 'w-full';

  return (
    <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${theme.bg} transition-all duration-300 ${containerCls}`}>
      <div className="relative h-[460px] overflow-y-auto p-5">
        <Sparkles count={10} color={theme.heart} />
        <div className="relative z-10 text-center">
          <Heart fill={theme.heart} size={28} style={{ color: theme.heart }} className="mx-auto animate-heartbeat" />
          <h3 className={`mt-3 font-serif-display text-2xl font-bold ${theme.text} text-balance`}>
            {draft.title || 'Your title'}
          </h3>
          <p className={`mt-2 text-sm ${theme.textSoft}`}>{draft.subtitle || 'Your subtitle'}</p>
          {draft.recipient_name && (
            <p className={`mt-4 font-script text-xl ${theme.accent}`}>For {draft.recipient_name}</p>
          )}
          {draft.special_date && (
            <p className={`mt-2 text-xs ${theme.textSoft}`}>{draft.date_label}: {draft.special_date}</p>
          )}
        </div>

        {/* Date counter preview */}
        {draft.special_date && (() => {
          const elapsed = getElapsedCalendar(draft.special_date);
          if (!elapsed) return null;
          return (
            <div className={`relative z-10 mt-4 rounded-xl ${theme.accentSoft} p-3 text-center`}>
              <p className={`text-xs ${theme.textSoft}`}>{draft.date_label || 'Since that day'}</p>
              <div className="mt-1 flex justify-center gap-3">
                <span className={`font-serif-display text-lg font-bold ${theme.text}`}>{elapsed.years}y</span>
                <span className={`font-serif-display text-lg font-bold ${theme.text}`}>{elapsed.months}m</span>
                <span className={`font-serif-display text-lg font-bold ${theme.text}`}>{elapsed.days}d</span>
              </div>
            </div>
          );
        })()}

        {/* Photos */}
        {draft.photos.length > 0 && (
          <div className="relative z-10 mt-5 grid grid-cols-3 gap-2">
            {draft.photos.slice(0, 6).map((p, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-lg bg-white/30 shadow-sm">
                {p.url && <img src={p.url} alt={p.caption} className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>
        )}

        {/* Love letter preview */}
        {draft.love_letter && (
          <div className={`relative z-10 mt-5 rounded-xl ${theme.surface} p-4`}>
            <p className={`font-script text-base ${theme.accent}`}>Dear {draft.recipient_name || 'you'},</p>
            <p className={`mt-2 line-clamp-5 whitespace-pre-wrap font-serif-display text-sm leading-relaxed ${theme.text}`}>
              {draft.love_letter}
            </p>
          </div>
        )}

        {/* Reasons */}
        {draft.reasons.length > 0 && (
          <div className="relative z-10 mt-4 space-y-1.5">
            {draft.reasons.slice(0, 4).map((r, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-lg ${theme.accentSoft} px-3 py-1.5`}>
                <Heart size={12} fill={theme.heart} style={{ color: theme.heart }} />
                <span className={`text-xs ${theme.text}`}>{r || `Reason #${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quiz preview */}
        {draft.quiz.length > 0 && (
          <div className={`relative z-10 mt-4 rounded-xl ${theme.surface} p-3`}>
            <p className={`text-xs font-semibold ${theme.text}`}>{draft.quiz[0].question || 'Quiz question'}</p>
            <div className="mt-1.5 space-y-1">
              {draft.quiz[0].options.slice(0, 2).map((opt, oi) => (
                <div key={oi} className={`rounded-lg border px-2 py-1 text-xs ${theme.textSoft}`} style={{ borderColor: theme.heart + '33' }}>
                  {opt || `Option ${oi + 1}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden message hint */}
        {draft.hidden_message && (
          <div className={`relative z-10 mt-4 flex items-center gap-2 rounded-lg ${theme.accentSoft} px-3 py-2`}>
            <Heart size={14} fill={theme.heart} style={{ color: theme.heart }} className="animate-pulse" />
            <span className={`text-xs ${theme.text}`}>A secret message awaits…</span>
          </div>
        )}

        {/* Music indicator */}
        {draft.music_url && (
          <div className={`relative z-10 mt-3 flex items-center justify-center gap-1.5 text-xs ${theme.textSoft}`}>
            <span className="animate-pulse">♪</span> Background music added
          </div>
        )}

        {/* CTA button */}
        <div className={`relative z-10 mt-5 flex items-center justify-center gap-2 rounded-full ${theme.accentDark} px-5 py-2.5 text-white`}>
          <Sparkle size={16} /> Open Your Surprise
        </div>

        {/* Final message */}
        {draft.final_message && (
          <p className={`relative z-10 mt-4 text-center font-script text-sm italic ${theme.textSoft}`}>
            {draft.final_message}
          </p>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-rose-800">{label}</label>
      {children}
    </div>
  );
}

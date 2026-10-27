export type Occasion =
  | 'birthday'
  | 'monthsary'
  | 'anniversary'
  | 'wedding'
  | 'valentine'
  | 'proposal'
  | 'just_because';

export type ThemeId =
  | 'pink'
  | 'wedding'
  | 'vintage'
  | 'midnight'
  | 'minimal'
  | 'birthday';

export interface PhotoItem {
  url: string;
  caption: string;
  date: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
}

export type PaymentStatus =
  | 'pending_payment'
  | 'payment_verification'
  | 'paid'
  | 'rejected'
  | 'needs_correction'
  | 'refunded';

export interface LockConfig {
  color: 'rose_gold' | 'soft_pink' | 'pastel_red';
  initials: string;
  engraved_message: string;
  unlock_message: string;
}

export const DEFAULT_LOCK_CONFIG: LockConfig = {
  color: 'rose_gold',
  initials: 'A ♡ S',
  engraved_message: 'Our love is locked here, but my heart will always be yours. ♡',
  unlock_message: "You found the key to my heart! Here's a little something made just for you. 💗",
};

export const LOCK_COLORS: { id: LockConfig['color']; label: string; swatch: string }[] = [
  { id: 'rose_gold', label: 'Rose Gold', swatch: '#b76e79' },
  { id: 'soft_pink', label: 'Soft Pink', swatch: '#ec4899' },
  { id: 'pastel_red', label: 'Pastel Red', swatch: '#f43f5e' },
];

export interface CustomTheme {
  bgFrom?: string;
  bgVia?: string;
  bgTo?: string;
  heartColor?: string;
  accentColor?: string;
  surfaceBg?: string;
}

export interface Surprise {
  id: string;
  slug: string;
  occasion: Occasion;
  theme: ThemeId;
  recipient_name: string;
  sender_name: string;
  title: string;
  subtitle: string;
  special_date: string | null;
  date_label: string;
  passcode: string;
  lock_config: LockConfig;
  love_letter: string;
  hidden_message: string;
  reasons: string[];
  quiz: QuizQuestion[];
  photos: PhotoItem[];
  music_url: string;
  final_message: string;
  paid: boolean;
  published: boolean;
  created_at: string;
  order_number: string | null;
  payment_status: PaymentStatus;
  receipt_url: string;
  gcash_ref: string;
  customer_email: string;
  customer_note: string;
  admin_note: string;
  verified_at: string | null;
  custom_theme: CustomTheme;
  custom_font_head: string;
  custom_font_body: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  bg: string;
  surface: string;
  text: string;
  textSoft: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  heart: string;
  glow: string;
  gradient: string;
  fontHead: string;
}

export const OCCASIONS: { id: Occasion; label: string; emoji: string; blurb: string }[] = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂', blurb: 'Cakes, candles, confetti and a birthday countdown.' },
  { id: 'monthsary', label: 'Monthsary', emoji: '💌', blurb: 'A monthly love letter and milestone timeline.' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💍', blurb: 'Celebrate how far you’ve come with a relationship timeline.' },
  { id: 'wedding', label: 'Wedding', emoji: '💒', blurb: 'Elegant invitations, vows, and a wedding countdown.' },
  { id: 'valentine', label: 'Valentine’s Day', emoji: '🌹', blurb: 'Virtual roses, love coupons, and romantic animations.' },
  { id: 'proposal', label: 'Proposal', emoji: '💎', blurb: 'A cinematic reveal and an interactive proposal moment.' },
  { id: 'just_because', label: 'Just Because', emoji: '✨', blurb: 'Remind someone how loved and special they are.' },
];

export const THEMES: ThemeConfig[] = [
  {
    id: 'pink',
    name: 'Cute Pink',
    description: 'Soft pinks, cream, and floating hearts.',
    bg: 'from-rose-50 via-pink-50 to-amber-50',
    surface: 'bg-white/80',
    text: 'text-rose-900',
    textSoft: 'text-rose-700/80',
    accent: 'text-pink-600',
    accentDark: 'bg-pink-600',
    accentSoft: 'bg-pink-100 text-pink-700',
    heart: '#f472b6',
    glow: 'rgba(244,114,182,0.5)',
    gradient: 'from-pink-400 via-rose-400 to-amber-300',
    fontHead: 'font-serif-display',
  },
  {
    id: 'wedding',
    name: 'Elegant Wedding',
    description: 'Champagne, ivory, and rose gold.',
    bg: 'from-amber-50 via-stone-50 to-rose-50',
    surface: 'bg-white/85',
    text: 'text-stone-800',
    textSoft: 'text-stone-600',
    accent: 'text-amber-700',
    accentDark: 'bg-amber-700',
    accentSoft: 'bg-amber-100 text-amber-800',
    heart: '#d4af7a',
    glow: 'rgba(212,175,122,0.5)',
    gradient: 'from-amber-300 via-rose-200 to-stone-200',
    fontHead: 'font-serif-display',
  },
  {
    id: 'vintage',
    name: 'Vintage Romance',
    description: 'Sepia tones, parchment, and lace.',
    bg: 'from-amber-100 via-orange-50 to-rose-100',
    surface: 'bg-amber-50/80',
    text: 'text-amber-900',
    textSoft: 'text-amber-800/80',
    accent: 'text-rose-800',
    accentDark: 'bg-rose-800',
    accentSoft: 'bg-rose-200 text-rose-900',
    heart: '#9d174d',
    glow: 'rgba(157,23,77,0.4)',
    gradient: 'from-amber-400 via-rose-300 to-orange-300',
    fontHead: 'font-serif-display',
  },
  {
    id: 'midnight',
    name: 'Midnight Love',
    description: 'Deep navy, silver stars, glowing hearts.',
    bg: 'from-slate-900 via-indigo-950 to-slate-900',
    surface: 'bg-slate-800/70',
    text: 'text-slate-100',
    textSoft: 'text-slate-300',
    accent: 'text-rose-300',
    accentDark: 'bg-rose-500',
    accentSoft: 'bg-rose-500/20 text-rose-200',
    heart: '#fb7185',
    glow: 'rgba(251,113,133,0.5)',
    gradient: 'from-indigo-500 via-rose-500 to-purple-500',
    fontHead: 'font-serif-display',
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    description: 'Clean whites, soft grays, a single accent.',
    bg: 'from-white via-stone-50 to-neutral-100',
    surface: 'bg-white/90',
    text: 'text-neutral-800',
    textSoft: 'text-neutral-500',
    accent: 'text-rose-500',
    accentDark: 'bg-rose-500',
    accentSoft: 'bg-rose-50 text-rose-600',
    heart: '#f43f5e',
    glow: 'rgba(244,63,94,0.35)',
    gradient: 'from-rose-400 via-neutral-300 to-neutral-400',
    fontHead: 'font-serif-display',
  },
  {
    id: 'birthday',
    name: 'Birthday Celebration',
    description: 'Bright, festive, confetti everywhere.',
    bg: 'from-fuchsia-50 via-purple-50 to-sky-50',
    surface: 'bg-white/85',
    text: 'text-fuchsia-900',
    textSoft: 'text-fuchsia-700/80',
    accent: 'text-fuchsia-600',
    accentDark: 'bg-fuchsia-600',
    accentSoft: 'bg-fuchsia-100 text-fuchsia-700',
    heart: '#d946ef',
    glow: 'rgba(217,70,239,0.5)',
    gradient: 'from-fuchsia-400 via-purple-400 to-sky-400',
    fontHead: 'font-serif-display',
  },
];

export function getTheme(id: ThemeId): ThemeConfig {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_payment: 'Pending Payment',
  payment_verification: 'Under Review',
  paid: 'Approved',
  rejected: 'Rejected',
  needs_correction: 'Needs Correction',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  payment_verification: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-rose-100 text-rose-700',
  needs_correction: 'bg-orange-100 text-orange-700',
  refunded: 'bg-purple-100 text-purple-700',
};

export const REJECTION_REASONS = [
  'Invalid or unreadable receipt',
  'Incorrect payment amount',
  'Duplicate GCash reference number',
  'Payment not received in GCash',
  'Receipt does not match order details',
];

export const NEEDS_CORRECTION_REASONS = [
  'GCash reference number is missing',
  'Receipt screenshot is blurry — please retake',
  'Wrong amount sent — please send the correct amount',
  'Please include the full transaction details',
];

export interface PaymentLog {
  id: string;
  surprise_id: string;
  slug: string;
  old_status: string;
  new_status: string;
  reason: string;
  admin_email: string;
  created_at: string;
}

export const FONT_OPTIONS = [
  { id: 'Cormorant Garamond', label: 'Cormorant (elegant serif)', css: "'Cormorant Garamond', serif" },
  { id: 'Dancing Script', label: 'Dancing Script (handwritten)', css: "'Dancing Script', cursive" },
  { id: 'Inter', label: 'Inter (clean sans)', css: "'Inter', sans-serif" },
  { id: 'Georgia', label: 'Georgia (classic serif)', css: 'Georgia, serif' },
];

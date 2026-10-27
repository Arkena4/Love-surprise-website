import { Occasion, QuizQuestion, Surprise, ThemeId, CustomTheme, DEFAULT_LOCK_CONFIG, LockConfig } from './types';

export function slugify(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const SAMPLE_LETTER = `My dearest,

If I had to choose one moment to live in forever, it would be the moment I first saw you smile. You walked into my life quietly, the way the best things always do, and somehow rearranged everything without trying.

I love the way you laugh at your own jokes before you finish them. I love how you remember the small things I mention once and forget myself. I love that you make ordinary days feel like something worth keeping.

No matter the distance, no matter the day, you will always have a special place in my heart. This is my little corner of the internet, built just for you — because you deserve to be celebrated in the loudest and softest ways at once.

Happy day, my favorite person. Here's to many more.`;

export const SAMPLE_REASONS = [
  'You make me laugh even when I do not want to.',
  'You remember the little things I forget I even said.',
  'Your hugs feel like coming home.',
  'You make ordinary Tuesdays feel special.',
  'You believe in me even on the days I forget how.',
  'You are beautifully, unapologetically you.',
];

export const SAMPLE_QUIZ: QuizQuestion[] = [
  {
    question: 'Where did we first meet?',
    options: ['A coffee shop', 'A mutual friend’s party', 'Work', 'School'],
    answer: 1,
  },
  {
    question: 'What was our first meal together?',
    options: ['Pizza', 'Sushi', 'Burgers', 'Ice cream'],
    answer: 2,
  },
  {
    question: 'Who said "I love you" first?',
    options: ['Me', 'You', 'We said it at the same time', 'Nobody remembers'],
    answer: 0,
  },
];

export function sampleSurprise(): Omit<Surprise, 'id' | 'created_at'> {
  return {
    slug: slugify(),
    occasion: 'anniversary' as Occasion,
    theme: 'pink' as ThemeId,
    recipient_name: 'Alex',
    sender_name: 'Sam',
    title: 'A Little Surprise for You',
    subtitle: 'Because you deserve to be celebrated today and always.',
    special_date: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString().slice(0, 10),
    date_label: 'The day we became "us"',
    passcode: '123456',
    lock_config: { ...DEFAULT_LOCK_CONFIG },
    love_letter: SAMPLE_LETTER,
    hidden_message: 'If you are reading this, know that someone, somewhere, is thinking of you with their whole heart.',
    reasons: SAMPLE_REASONS,
    quiz: SAMPLE_QUIZ,
    photos: [],
    music_url: '',
    final_message: 'Thank you for being my favorite chapter. Replay this whenever you need a reminder.',
    paid: false,
    published: false,
    order_number: null,
    payment_status: 'pending_payment',
    receipt_url: '',
    gcash_ref: '',
    customer_email: '',
    customer_note: '',
    admin_note: '',
    verified_at: null,
    custom_theme: {} as CustomTheme,
    custom_font_head: '',
    custom_font_body: '',
  };
}

export function formatDate(d: string | null): string | null {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `LS-${s}`;
}

export function getElapsedCalendar(startDate: string, endDate = new Date()): { years: number; months: number; days: number } | null {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || endDate < start) return null;

  let years = endDate.getFullYear() - start.getFullYear();
  const anniversary = new Date(start);
  anniversary.setFullYear(start.getFullYear() + years);
  if (anniversary > endDate) years -= 1;

  const afterYears = new Date(start);
  afterYears.setFullYear(start.getFullYear() + years);
  let months = endDate.getMonth() - afterYears.getMonth();
  if (months < 0) months += 12;

  const afterMonths = new Date(afterYears);
  afterMonths.setMonth(afterYears.getMonth() + months);
  if (afterMonths > endDate) {
    months -= 1;
    afterMonths.setMonth(afterYears.getMonth() + months);
  }
  const days = Math.floor((endDate.getTime() - afterMonths.getTime()) / 86400000);
  return { years, months, days };
}

export function emptyCustomTheme() {
  return {};
}

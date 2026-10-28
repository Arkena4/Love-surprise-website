import { useEffect, useState, useCallback } from 'react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Confetti } from '@/components/Confetti';
import { Route } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Surprise, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, SiteSettings, VerifyCodeResult } from '@/lib/types';
import {
  Heart,
  Lock,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield,
  Sparkles as SparklesIcon,
  Smartphone,
  Copy,
  Instagram,
  AlertCircle,
  Clock,
  RefreshCw,
  Upload,
  KeyRound,
  Ticket,
  Loader2,
} from 'lucide-react';

interface Props {
  slug: string;
  navigate: (r: Route) => void;
}

const DEFAULT_INSTAGRAM_URL = 'https://instagram.com/arcnnnee';
const DEFAULT_GCASH_NUMBER = '09945579570';
const DEFAULT_GCASH_NAME = 'C S';
const PRICE = 99;

function getSessionIdentifier(): string {
  let id = '';
  try {
    id = localStorage.getItem('ls_session_id') || '';
  } catch { /* ignore */ }
  if (!id) {
    id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try { localStorage.setItem('ls_session_id', id); } catch { /* ignore */ }
  }
  return id;
}

export function PayPage({ slug, navigate }: Props) {
  const [surprise, setSurprise] = useState<Surprise | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [gcashRef, setGcashRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access code state
  const [accessCode, setAccessCode] = useState('');
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<VerifyCodeResult | null>(null);

  // Site settings (loaded from DB)
  const [settings, setSettings] = useState<SiteSettings>({
    instagram_url: DEFAULT_INSTAGRAM_URL,
    gcash_number: DEFAULT_GCASH_NUMBER,
    gcash_name: DEFAULT_GCASH_NAME,
  });

  const loadSurprise = useCallback(async () => {
    const { data } = await supabase.from('surprises').select('*').eq('slug', slug).maybeSingle();
    setSurprise(data as Surprise | null);
    if (data) {
      setGcashRef((data as Surprise).gcash_ref || '');
      setCustomerNote((data as Surprise).customer_note || '');
    }
    setLoading(false);
  }, [slug]);

  const loadSettings = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('get_public_settings');
    if (!err && data) {
      setSettings(data as SiteSettings);
    }
  }, []);

  useEffect(() => {
    loadSurprise();
    loadSettings();
  }, [loadSurprise, loadSettings]);

  const copyGcash = async () => {
    try {
      await navigator.clipboard.writeText(settings.gcash_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Receipt image must be under 5MB.');
      return;
    }
    setError(null);
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitPayment = async () => {
    if (!surprise) return;
    if (!gcashRef.trim()) {
      setError('Please enter your GCash reference number.');
      return;
    }
    setSubmitting(true);
    setError(null);

    let receiptPath = surprise.receipt_url;

    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop() || 'jpg';
      const fileName = `${slug}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, { upsert: true });
      if (uploadError) {
        setError('Could not upload receipt. Please try again.');
        setSubmitting(false);
        return;
      }
      receiptPath = fileName;
    }

    const { error: rpcError } = await supabase.rpc('resubmit_payment', {
      p_slug: slug,
      p_gcash_ref: gcashRef.trim(),
      p_receipt_url: receiptPath,
      p_note: customerNote.trim(),
    });

    if (rpcError) {
      setError(rpcError.message || 'Could not submit payment. Please try again.');
      setSubmitting(false);
      return;
    }

    // Notify admin of new payment submission
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          orderNumber: surprise.order_number,
          customerEmail: surprise.customer_email,
          recipientName: surprise.recipient_name,
          occasion: surprise.occasion,
          receiptUrl: receiptPath,
          customerNote: customerNote.trim(),
          slug,
        }),
      });
    } catch {
      // notification is best-effort, don't block the customer
    }

    setSubmitting(false);
    loadSurprise();
  };

  const verifyCode = async () => {
    if (!accessCode.trim()) {
      setCodeError('Please enter your access code.');
      return;
    }
    setCodeVerifying(true);
    setCodeError(null);
    setCodeSuccess(null);

    const identifier = getSessionIdentifier();

    const { data, error: rpcError } = await supabase.rpc('verify_access_code', {
      p_code: accessCode.trim(),
      p_identifier: identifier,
    });

    setCodeVerifying(false);

    if (rpcError) {
      setCodeError(rpcError.message || 'This access code is not valid or not yet activated.');
      return;
    }

    if (!data) {
      setCodeError('This access code is not valid or not yet activated.');
      return;
    }

    const result = data as VerifyCodeResult;
    setCodeSuccess(result);

    // If the code is linked to a published surprise, navigate to it
    if (result.hasSurprise && result.slug) {
      setTimeout(() => navigate({ name: 'view', slug: result.slug! }), 1500);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50">
        <Heart className="animate-heartbeat text-pink-500" fill="currentColor" size={40} />
      </div>
    );
  }

  if (!surprise) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pink-50 px-5 text-center">
        <p className="font-serif-display text-2xl text-rose-900">We couldn't find that surprise.</p>
        <button onClick={() => navigate({ name: 'home' })} className="rounded-full bg-pink-600 px-5 py-2 text-white">
          Go home
        </button>
      </div>
    );
  }

  const status = surprise.payment_status;

  if (status === 'paid') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 px-5">
        <FloatingHearts count={20} />
        <Confetti trigger={true} />
        <div className="relative z-10 max-w-lg rounded-3xl bg-white/90 p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check size={32} />
          </div>
          <h1 className="mt-5 font-serif-display text-3xl font-bold text-rose-900">Payment Verified!</h1>
          <p className="mt-3 text-rose-700/80">
            Your surprise for {surprise.recipient_name || 'your loved one'} is now live.
            Share the link below — they can open it without an account.
          </p>
          <div className="mt-4 rounded-xl bg-pink-50 p-3">
            <p className="text-xs text-pink-500">Order Number</p>
            <p className="font-mono text-lg font-bold text-pink-700">{surprise.order_number}</p>
          </div>
          <button
            onClick={() => navigate({ name: 'share', slug })}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-pink-600 px-7 py-3.5 font-medium text-white shadow-lg transition hover:scale-105"
          >
            Get Your Share Link <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (status === 'payment_verification') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
        <FloatingHearts count={10} />
        <div className="relative z-10 mx-auto max-w-lg px-5 py-8">
          <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
            <ArrowLeft size={16} /> Home
          </button>
          <div className="mt-6 rounded-3xl border border-pink-100 bg-white/90 p-7 text-center shadow-lg backdrop-blur md:p-9">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Clock size={32} className="animate-pulse" />
            </div>
            <h1 className="mt-5 font-serif-display text-3xl font-bold text-rose-900">Payment Under Verification</h1>
            <p className="mt-3 text-rose-700/80">
              Your payment is waiting for verification. Our team will review your receipt shortly.
              You'll be able to share your surprise once it's approved.
            </p>
            <div className="mt-5 rounded-xl bg-pink-50 p-4">
              <p className="text-xs text-pink-500">Order Number</p>
              <p className="font-mono text-xl font-bold text-pink-700">{surprise.order_number}</p>
              <p className="mt-2 text-xs text-rose-500">Save this number — you can check your order status anytime.</p>
            </div>
            <div className="mt-5">
              <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium ${PAYMENT_STATUS_COLORS[status]}`}>
                {PAYMENT_STATUS_LABELS[status]}
              </span>
            </div>

            {/* Access code section for verification page too */}
            <AccessCodeSection
              accessCode={accessCode}
              setAccessCode={setAccessCode}
              codeVerifying={codeVerifying}
              codeError={codeError}
              codeSuccess={codeSuccess}
              verifyCode={verifyCode}
              navigate={navigate}
            />

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => navigate({ name: 'order', slug })}
                className="flex items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3 font-medium text-white shadow-lg transition hover:scale-105"
              >
                <RefreshCw size={18} /> Check Order Status
              </button>
              <button
                onClick={() => navigate({ name: 'home' })}
                className="rounded-full border border-pink-300 px-6 py-3 font-medium text-pink-700 transition hover:bg-pink-50"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'refunded') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
        <FloatingHearts count={8} />
        <div className="relative z-10 mx-auto max-w-lg px-5 py-8">
          <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
            <ArrowLeft size={16} /> Home
          </button>
          <div className="mt-6 rounded-3xl border border-pink-100 bg-white/90 p-7 text-center shadow-lg backdrop-blur md:p-9">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <AlertCircle size={32} />
            </div>
            <h1 className="mt-5 font-serif-display text-3xl font-bold text-rose-900">Payment Refunded</h1>
            <p className="mt-3 text-rose-700/80">
              A refund has been issued for this order.
            </p>
            {surprise.admin_note && (
              <div className="mt-4 rounded-xl bg-purple-50 p-4">
                <p className="text-sm text-purple-700">{surprise.admin_note}</p>
              </div>
            )}
            <div className="mt-5">
              <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-medium ${PAYMENT_STATUS_COLORS[status]}`}>
                {PAYMENT_STATUS_LABELS[status]}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showResubmit = status === 'rejected' || status === 'needs_correction';
  const isNeedsCorrection = status === 'needs_correction';

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <FloatingHearts count={12} />
      <div className="relative z-10 mx-auto max-w-lg px-5 py-8">
        <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
          <ArrowLeft size={16} /> Home
        </button>

        <div className="mt-6 rounded-3xl border border-pink-100 bg-white/90 p-7 shadow-lg backdrop-blur md:p-9">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-600">
              <Lock size={26} />
            </div>
            <h1 className="mt-4 font-serif-display text-3xl font-bold text-rose-900">
              {showResubmit ? 'Resubmit your payment' : 'Publish your surprise'}
            </h1>
            <p className="mt-2 text-rose-700/70">
              Pay ₱{PRICE} via GCash, then upload your receipt and reference number below for verification.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <Shield size={16} /> One-time payment — no subscription, no hidden fees
            </div>
          </div>

          {(showResubmit) && (
            <div className={`mt-5 rounded-xl p-4 ${isNeedsCorrection ? 'bg-orange-50' : 'bg-rose-50'}`}>
              <p className={`flex items-center gap-2 text-sm font-semibold ${isNeedsCorrection ? 'text-orange-700' : 'text-rose-700'}`}>
                <AlertCircle size={16} /> {isNeedsCorrection ? 'Your payment needs correction' : 'Your payment was not approved'}
              </p>
              <p className={`mt-1 text-sm ${isNeedsCorrection ? 'text-orange-600' : 'text-rose-600'}`}>
                {surprise.admin_note || 'Please check your receipt and try again.'}
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="mt-5 rounded-2xl bg-pink-50/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">Surprise for</p>
                <p className="mt-1 font-serif-display text-xl font-semibold text-rose-900">
                  {surprise.recipient_name || 'Your loved one'}
                </p>
                <p className="mt-0.5 text-sm text-rose-600">{surprise.title}</p>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium capitalize text-pink-700">
                {surprise.occasion.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-pink-50/50 p-4">
            <span className="font-semibold text-rose-900">Total to pay</span>
            <span className="font-serif-display text-3xl font-bold text-pink-600">₱{PRICE}</span>
          </div>

          {/* ============ STEP 1: GCash Payment ============ */}
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-sm font-bold text-white">1</div>
              <h2 className="font-serif-display text-lg font-semibold text-rose-900">Send Payment via GCash</h2>
            </div>

            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Smartphone size={20} />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Pay via GCash</p>
                  <p className="text-xs text-blue-700/70">Send ₱{PRICE} to the number below</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-500">GCash Number</p>
                  <p className="font-serif-display text-2xl font-bold text-blue-900">{settings.gcash_number}</p>
                  <p className="text-xs text-blue-700/70">Account name: {settings.gcash_name}</p>
                </div>
                <button
                  onClick={copyGcash}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="mt-4 rounded-lg bg-white/70 p-3 text-sm leading-relaxed text-blue-800">
                Please send your payment through GCash first. After paying, submit your proof of
                payment through our designated Instagram account for verification.
              </div>

              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-pink-300 bg-pink-50/50 py-2.5 text-sm font-semibold text-pink-700 transition hover:bg-pink-50"
              >
                <Instagram size={18} /> Submit proof on Instagram
              </a>
            </div>
          </div>

          {/* GCash reference + receipt upload */}
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rose-800">GCash Reference Number</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  value={gcashRef}
                  onChange={(e) => setGcashRef(e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="w-full rounded-xl border border-pink-200 bg-white py-2.5 pl-10 pr-4 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                />
              </div>
              <p className="mt-1 text-xs text-rose-500">Found on your GCash receipt after sending payment.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-rose-800">Receipt Screenshot</label>
              {receiptPreview ? (
                <div className="relative">
                  <img src={receiptPreview} alt="Receipt preview" className="max-h-64 w-full rounded-xl object-contain bg-gray-50" />
                  <button
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/80"
                  >
                    <AlertCircle size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/40 py-10 transition hover:border-pink-400 hover:bg-pink-50">
                  <Upload size={28} className="text-pink-400" />
                  <span className="mt-2 text-sm font-medium text-pink-600">Tap to upload your receipt</span>
                  <span className="text-xs text-rose-400">PNG or JPG, max 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-rose-800">Note (optional)</label>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={2}
                placeholder="Any additional info for our team…"
                className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            )}

            <button
              onClick={submitPayment}
              disabled={submitting || !gcashRef.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:bg-pink-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : (
                <>
                  <Check size={20} /> {showResubmit ? 'Resubmit for Verification' : 'Submit for Verification'}
                </>
              )}
            </button>
          </div>

          {!receiptPreview && surprise.receipt_url && (
            <div className="mt-5 rounded-xl bg-pink-50 p-4 text-center text-sm text-pink-700">
              Your previous receipt is saved securely. Upload a replacement only if our team asks for a correction.
            </div>
          )}

          {/* ============ STEP 2: Enter Access Code ============ */}
          <AccessCodeSection
            accessCode={accessCode}
            setAccessCode={setAccessCode}
            codeVerifying={codeVerifying}
            codeError={codeError}
            codeSuccess={codeSuccess}
            verifyCode={verifyCode}
            navigate={navigate}
          />

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-rose-500">
            <span className="flex items-center gap-1"><Shield size={14} /> Secure</span>
            <span className="flex items-center gap-1"><SparklesIcon size={14} /> One-time</span>
            <span className="flex items-center gap-1"><Heart size={14} /> Made with love</span>
          </div>

          <a
            href={settings.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-pink-300 bg-pink-50/50 py-3 text-sm font-semibold text-pink-700 transition hover:bg-pink-50"
          >
            <Instagram size={18} /> Questions? Message us on Instagram
          </a>

          <p className="mt-4 text-center text-xs leading-relaxed text-rose-400">
            A submitted receipt is not proof of a verified payment. Our team manually verifies each
            payment before your surprise is published. This is a one-time payment of ₱{PRICE}.
          </p>
        </div>
      </div>
    </div>
  );
}

function AccessCodeSection({
  accessCode,
  setAccessCode,
  codeVerifying,
  codeError,
  codeSuccess,
  verifyCode,
  navigate,
}: {
  accessCode: string;
  setAccessCode: (v: string) => void;
  codeVerifying: boolean;
  codeError: string | null;
  codeSuccess: VerifyCodeResult | null;
  verifyCode: () => void;
  navigate: (r: Route) => void;
}) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-sm font-bold text-white">2</div>
        <h2 className="font-serif-display text-lg font-semibold text-rose-900">Enter Your Access Code</h2>
      </div>

      <div className="rounded-2xl border-2 border-pink-200 bg-pink-50/40 p-5">
        <p className="text-sm text-rose-700/80">
          Already received your access code? Enter it below to continue.
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-rose-800">Enter Your Unique Access Code</label>
          <div className="relative">
            <Ticket size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter your access code"
              className="w-full rounded-xl border border-pink-200 bg-white py-3 pl-10 pr-4 font-mono text-sm tracking-wide text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
              onKeyDown={(e) => { if (e.key === 'Enter') verifyCode(); }}
            />
          </div>
        </div>

        {codeError && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <span className="flex items-center gap-2"><AlertCircle size={16} /> {codeError}</span>
          </div>
        )}

        {codeSuccess && (
          <div className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            <span className="flex items-center gap-2">
              <Check size={16} />
              {codeSuccess.hasSurprise
                ? 'Code verified! Taking you to your surprise…'
                : 'Code verified! You can now continue to create your surprise.'}
            </span>
          </div>
        )}

        <button
          onClick={verifyCode}
          disabled={codeVerifying || !accessCode.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:bg-pink-700 disabled:opacity-60"
        >
          {codeVerifying ? (
            <><Loader2 size={20} className="animate-spin" /> Verifying…</>
          ) : (
            <><KeyRound size={20} /> Verify Code and Continue</>
          )}
        </button>

        {codeSuccess && !codeSuccess.hasSurprise && (
          <button
            onClick={() => navigate({ name: 'create' })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-pink-300 py-3 font-medium text-pink-700 transition hover:bg-pink-50"
          >
            Continue to Create Your Surprise <ArrowRight size={18} />
          </button>
        )}

        <p className="mt-3 text-center text-xs leading-relaxed text-rose-400">
          Your access code is provided by the website owner after your order has been processed.
          Each code is unique and cannot be guessed or generated by customers.
        </p>
      </div>
    </div>
  );
}

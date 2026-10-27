import { useEffect, useState, useCallback } from 'react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Route } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Surprise, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PaymentLog } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  Heart,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Check,
  Clock,
  AlertCircle,
  Smartphone,
  ExternalLink,
  Package,
  Edit3,
  RotateCcw,
  DollarSign,
} from 'lucide-react';

interface Props {
  slug: string;
  navigate: (r: Route) => void;
}

const STATUS_MESSAGES: Record<string, { title: string; detail: string }> = {
  pending_payment: {
    title: 'Payment Pending',
    detail: 'Your payment is waiting. Complete your GCash payment and upload your receipt to continue.',
  },
  payment_verification: {
    title: 'Under Verification',
    detail: 'Your payment is waiting for verification. Our team is reviewing your receipt.',
  },
  paid: {
    title: 'Payment Verified',
    detail: 'Your payment has been verified! You can now continue with your Love Website.',
  },
  rejected: {
    title: 'Payment Not Approved',
    detail: 'Your payment was not approved. Please review the reason below and resubmit.',
  },
  needs_correction: {
    title: 'Needs Correction',
    detail: 'Some information needs to be corrected before we can verify your payment.',
  },
  refunded: {
    title: 'Payment Refunded',
    detail: 'A refund has been processed for your order.',
  },
};

export function OrderStatusPage({ slug, navigate }: Props) {
  const [surprise, setSurprise] = useState<Surprise | null>(null);
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase.from('surprises').select('*').eq('slug', slug).maybeSingle();
    setSurprise(data as Surprise | null);
    setRefreshing(false);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

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
        <Package size={40} className="text-pink-400" />
        <p className="font-serif-display text-2xl text-rose-900">Order not found.</p>
        <button onClick={() => navigate({ name: 'home' })} className="rounded-full bg-pink-600 px-5 py-2 text-white">
          Go home
        </button>
      </div>
    );
  }

  const status = surprise.payment_status;
  const msg = STATUS_MESSAGES[status] ?? STATUS_MESSAGES.pending_payment;
  const receiptUrl = surprise.receipt_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/receipts/${surprise.receipt_url}`
    : null;

  const steps: { key: string; label: string; icon: typeof Clock }[] = [
    { key: 'pending_payment', label: 'Payment Pending', icon: Smartphone },
    { key: 'payment_verification', label: 'Under Review', icon: Clock },
    { key: 'paid', label: 'Verified', icon: Check },
  ];
  const currentStepIdx = status === 'rejected' || status === 'needs_correction' || status === 'refunded'
    ? 1
    : steps.findIndex((s) => s.key === status);

  const statusIcon = status === 'paid' ? <Check size={16} />
    : status === 'payment_verification' ? <Clock size={16} />
    : status === 'pending_payment' ? <Smartphone size={16} />
    : status === 'refunded' ? <DollarSign size={16} />
    : <AlertCircle size={16} />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <FloatingHearts count={8} />
      <div className="relative z-10 mx-auto max-w-lg px-5 py-8">
        <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
          <ArrowLeft size={16} /> Home
        </button>

        <div className="mt-6 rounded-3xl border border-pink-100 bg-white/90 p-7 shadow-lg backdrop-blur md:p-9">
          <div className="text-center">
            <h1 className="font-serif-display text-3xl font-bold text-rose-900">Order Status</h1>
            <div className="mt-3 inline-block rounded-xl bg-pink-50 px-5 py-3">
              <p className="text-xs text-pink-500">Order Number</p>
              <p className="font-mono text-xl font-bold text-pink-700">{surprise.order_number || '—'}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="mt-5 text-center">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold ${PAYMENT_STATUS_COLORS[status]}`}>
              {statusIcon}
              {PAYMENT_STATUS_LABELS[status]}
            </span>
          </div>

          {/* Status message */}
          <div className="mt-5 rounded-xl bg-pink-50/70 p-4 text-center">
            <p className="font-serif-display text-lg font-semibold text-rose-900">{msg.title}</p>
            <p className="mt-1 text-sm text-rose-600">{msg.detail}</p>
          </div>

          {/* Rejection / needs correction notice */}
          {(status === 'rejected' || status === 'needs_correction') && surprise.admin_note && (
            <div className={`mt-4 rounded-xl p-4 ${status === 'needs_correction' ? 'bg-orange-50' : 'bg-rose-50'}`}>
              <p className={`flex items-center gap-2 text-sm font-semibold ${status === 'needs_correction' ? 'text-orange-700' : 'text-rose-700'}`}>
                <AlertCircle size={16} /> {status === 'needs_correction' ? 'What needs to be fixed' : 'Reason for rejection'}
              </p>
              <p className={`mt-1 text-sm ${status === 'needs_correction' ? 'text-orange-600' : 'text-rose-600'}`}>
                {surprise.admin_note}
              </p>
              <button
                onClick={() => navigate({ name: 'pay', slug })}
                className="mt-3 rounded-full bg-pink-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
              >
                {status === 'needs_correction' ? 'Correct & Resubmit' : 'Resubmit Payment'}
              </button>
            </div>
          )}

          {/* Refund notice */}
          {status === 'refunded' && surprise.admin_note && (
            <div className="mt-4 rounded-xl bg-purple-50 p-4">
              <p className="text-sm text-purple-700">{surprise.admin_note}</p>
            </div>
          )}

          {/* Progress steps */}
          {status !== 'rejected' && status !== 'needs_correction' && status !== 'refunded' && (
            <div className="mt-7">
              <div className="flex items-center justify-between">
                {steps.map((s, i) => {
                  const done = i < currentStepIdx;
                  const active = i === currentStepIdx;
                  return (
                    <div key={s.key} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full items-center">
                        {i > 0 && <div className={`h-0.5 flex-1 ${done || active ? 'bg-pink-400' : 'bg-pink-100'}`} />}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                            done
                              ? 'bg-green-500 text-white'
                              : active
                              ? 'bg-pink-600 text-white animate-pulse'
                              : 'bg-pink-100 text-pink-400'
                          }`}
                        >
                          <s.icon size={18} />
                        </div>
                        {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${done ? 'bg-pink-400' : 'bg-pink-100'}`} />}
                      </div>
                      <span className={`mt-2 text-center text-xs ${active ? 'font-semibold text-pink-700' : 'text-rose-400'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order details */}
          <div className="mt-7 space-y-2 rounded-2xl bg-pink-50/60 p-4">
            <Row label="Recipient" value={surprise.recipient_name || '—'} />
            <Row label="Occasion" value={surprise.occasion.replace('_', ' ')} />
            <Row label="Theme" value={surprise.theme} />
            <Row label="Created" value={formatDate(surprise.created_at?.slice(0, 10) ?? null) ?? '—'} />
            {surprise.gcash_ref && <Row label="GCash Ref" value={surprise.gcash_ref} />}
            {surprise.verified_at && <Row label="Verified" value={formatDate(surprise.verified_at.slice(0, 10)) ?? '—'} />}
          </div>

          {/* Receipt preview */}
          {receiptUrl && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-rose-900">Your receipt</p>
              <div className="overflow-hidden rounded-xl border border-pink-100">
                <img src={receiptUrl} alt="Receipt" className="max-h-48 w-full object-contain bg-gray-50" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={load}
              className="flex items-center justify-center gap-2 rounded-full border border-pink-300 bg-white/80 py-3 font-medium text-pink-700 transition hover:bg-white"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /> Refresh Status
            </button>

            {status === 'paid' && (
              <>
                <button
                  onClick={() => navigate({ name: 'share', slug })}
                  className="flex items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
                >
                  Get Your Share Link <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => navigate({ name: 'view', slug })}
                  className="flex items-center justify-center gap-2 rounded-full border border-pink-300 py-3 font-medium text-pink-700 transition hover:bg-pink-50"
                >
                  <ExternalLink size={18} /> View the Surprise
                </button>
              </>
            )}

            {status === 'pending_payment' && (
              <button
                onClick={() => navigate({ name: 'pay', slug })}
                className="flex items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
              >
                Complete Payment <ArrowRight size={18} />
              </button>
            )}

            {(status === 'rejected' || status === 'needs_correction') && (
              <button
                onClick={() => navigate({ name: 'pay', slug })}
                className="flex items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
              >
                <RotateCcw size={18} /> Resubmit Payment
              </button>
            )}

            {/* Preview while pending */}
            {(status === 'pending_payment' || status === 'payment_verification' || status === 'needs_correction' || status === 'rejected') && (
              <button
                onClick={() => navigate({ name: 'create' })}
                className="flex items-center justify-center gap-2 rounded-full border border-pink-200 py-3 text-sm font-medium text-rose-600 transition hover:bg-pink-50"
              >
                <Edit3 size={16} /> Edit your surprise
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-rose-500">{label}</span>
      <span className="font-medium capitalize text-rose-900">{value}</span>
    </div>
  );
}

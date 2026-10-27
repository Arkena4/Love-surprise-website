import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Route } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Surprise } from '@/lib/types';
import { Heart, Copy, Check, ExternalLink, RotateCcw, Share2, ArrowLeft } from 'lucide-react';

interface Props {
  slug: string;
  navigate: (r: Route) => void;
}

export function SharePage({ slug, navigate }: Props) {
  const [surprise, setSurprise] = useState<Surprise | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('surprises').select('*').eq('slug', slug).maybeSingle();
      setSurprise(data as Surprise | null);
      setLoading(false);
    })();
  }, [slug]);

  const viewUrl = `${window.location.origin}${window.location.pathname}#/view/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be blocked; show a manual select fallback
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'A Love Surprise', url: viewUrl });
      } catch {
        // user cancelled
      }
    } else {
      copy();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50">
        <Heart className="animate-heartbeat text-pink-500" fill="currentColor" size={40} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <FloatingHearts count={14} />
      <div className="relative z-10 mx-auto max-w-lg px-5 py-8">
        <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
          <ArrowLeft size={16} /> Home
        </button>

        <div className="mt-6 rounded-3xl border border-pink-100 bg-white/90 p-7 text-center shadow-lg backdrop-blur md:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-600">
            <Share2 size={26} />
          </div>
          <h1 className="mt-4 font-serif-display text-3xl font-bold text-rose-900">Share your surprise</h1>
          <p className="mt-2 text-rose-700/70">
            Send this link to {surprise?.recipient_name || 'your loved one'}. They can open it on any phone — no account needed.
          </p>

          {/* QR */}
          <div className="mt-7 flex justify-center">
            <div className="rounded-2xl border-2 border-pink-200 bg-white p-4 shadow-sm">
              <QRCodeSVG value={viewUrl} size={180} fgColor="#9d174d" bgColor="#ffffff" />
            </div>
          </div>
          <p className="mt-3 text-xs text-rose-400">Scan the QR code to open the surprise</p>

          {/* Link */}
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-pink-200 bg-white p-2">
            <input
              readOnly
              value={viewUrl}
              className="flex-1 bg-transparent px-2 text-sm text-rose-800 outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg bg-pink-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={share}
              className="flex items-center justify-center gap-2 rounded-full bg-pink-600 py-3 font-medium text-white shadow transition hover:scale-[1.02] hover:bg-pink-700"
            >
              <Share2 size={18} /> Share link
            </button>
            <button
              onClick={() => navigate({ name: 'view', slug })}
              className="flex items-center justify-center gap-2 rounded-full border border-pink-300 py-3 font-medium text-pink-700 transition hover:bg-pink-50"
            >
              <ExternalLink size={18} /> Open it
            </button>
          </div>

          <button
            onClick={() => navigate({ name: 'view', slug })}
            className="mt-5 flex items-center justify-center gap-1.5 text-sm text-rose-500 hover:text-rose-700"
          >
            <RotateCcw size={14} /> Replay the surprise
          </button>
        </div>
      </div>
    </div>
  );
}

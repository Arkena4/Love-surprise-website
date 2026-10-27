import { useState, useEffect } from 'react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Route } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Heart, Lock, Mail, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

interface Props {
  navigate: (r: Route) => void;
}

export function AdminLoginPage({ navigate }: Props) {
  const { user, isAdmin, canClaimAdmin, loading, signIn, signUp, claimAdmin } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminClaimed, setAdminClaimed] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate({ name: 'admin' });
    }
  }, [user, isAdmin, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'login' ? signIn : signUp;
    const { error: err } = await fn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  const handleClaimAdmin = async () => {
    setBusy(true);
    const ok = await claimAdmin();
    setBusy(false);
    setAdminClaimed(ok);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <FloatingHearts count={8} />
      <div className="relative z-10 mx-auto max-w-md px-5 py-8">
        <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
          <ArrowLeft size={16} /> Home
        </button>

        <div className="mt-8 rounded-3xl border border-pink-100 bg-white/90 p-7 shadow-lg backdrop-blur md:p-9">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-600">
              <ShieldCheck size={26} />
            </div>
            <h1 className="mt-4 font-serif-display text-3xl font-bold text-rose-900">Admin Access</h1>
            <p className="mt-2 text-sm text-rose-700/70">
              Sign in to verify payments and manage orders.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="mt-6 flex rounded-full bg-pink-50 p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-pink-600 text-white shadow' : 'text-pink-600'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-pink-600 text-white shadow' : 'text-pink-600'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rose-800">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-pink-200 bg-white py-2.5 pl-10 pr-4 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rose-800">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-pink-200 bg-white py-2.5 pl-10 pr-4 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:bg-pink-700 disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Claim admin for first-time setup */}
          {user && !isAdmin && canClaimAdmin && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
              <Sparkles size={20} className="mx-auto text-amber-600" />
              <p className="mt-2 text-sm text-amber-800">
                This is the one-time owner setup. Claim admin access for this account to start verifying payments.
              </p>
              <button
                onClick={handleClaimAdmin}
                disabled={busy}
                className="mt-3 rounded-full bg-amber-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {busy ? 'Claiming…' : 'Claim Admin Access'}
              </button>
              {adminClaimed && <p className="mt-2 text-xs text-green-700">Admin access is ready. You can now open the dashboard.</p>}
            </div>
          )}

          <p className="mt-5 text-center text-xs text-rose-400">
            Only the store owner needs an account. Customers create surprises without signing in.
          </p>
        </div>
      </div>
    </div>
  );
}

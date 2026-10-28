import { useEffect, useState, useCallback } from 'react';
import { FloatingHearts } from '@/components/FloatingHearts';
import { Route } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Surprise,
  PaymentStatus,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PaymentLog,
  REJECTION_REASONS,
  NEEDS_CORRECTION_REASONS,
  AccessCode,
  AccessCodeStatus,
  ACCESS_CODE_STATUS_LABELS,
  ACCESS_CODE_STATUS_COLORS,
  SiteSettings,
} from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  Heart,
  ArrowLeft,
  LogOut,
  Check,
  X,
  Clock,
  Search,
  ExternalLink,
  Image as ImageIcon,
  Mail,
  Package,
  TrendingUp,
  RefreshCw,
  Download,
  DollarSign,
  AlertCircle,
  RotateCcw,
  KeyRound,
  History,
  Calendar,
  Ticket,
  Plus,
  Copy,
  Ban,
  UserPlus,
  Power,
  Settings,
  Instagram,
  Loader2,
} from 'lucide-react';

interface Props {
  navigate: (r: Route) => void;
}

type Filter = 'all' | PaymentStatus;
type Tab = 'orders' | 'codes' | 'settings';
const PRICE = 99;

export function AdminPage({ navigate }: Props) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('orders');

  // Orders state
  const [orders, setOrders] = useState<Surprise[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Surprise | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Access codes state
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');
  const [codeFilter, setCodeFilter] = useState<'all' | AccessCodeStatus>('all');
  const [assignModal, setAssignModal] = useState<AccessCode | null>(null);

  // Settings state
  const [settings, setSettings] = useState<SiteSettings>({ instagram_url: '', gcash_number: '', gcash_name: '' });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadOrders = useCallback(async () => {
    setRefreshing(true);
    let query = supabase.from('surprises').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('payment_status', filter);
    const { data } = await query;
    setOrders((data as Surprise[]) ?? []);
    setRefreshing(false);
  }, [filter]);

  const loadCodes = useCallback(async () => {
    setCodesLoading(true);
    let query = supabase.from('access_codes').select('*').order('created_at', { ascending: false });
    if (codeFilter !== 'all') query = query.eq('status', codeFilter);
    const { data } = await query;
    setCodes((data as AccessCode[]) ?? []);
    setCodesLoading(false);
  }, [codeFilter]);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (data) setSettings(data as SiteSettings);
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate({ name: 'admin-login' });
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
      loadCodes();
      loadSettings();
    }
  }, [isAdmin, loadOrders, loadCodes, loadSettings]);

  const handleAction = async (rpc: string, params: Record<string, string>) => {
    setBusy(true);
    setActionError(null);
    const { error } = await supabase.rpc(rpc, params);
    setBusy(false);
    if (error) {
      setActionError(error.message);
      return false;
    }
    setSelected(null);
    loadOrders();
    return true;
  };

  const handleGenerateCode = async () => {
    setGenerating(true);
    setActionError(null);
    const { data, error } = await supabase.rpc('generate_access_code');
    setGenerating(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    if (data) {
      loadCodes();
    }
  };

  const handleCodeAction = async (rpc: string, params: Record<string, string>) => {
    setBusy(true);
    setActionError(null);
    const { error } = await supabase.rpc(rpc, params);
    setBusy(false);
    if (error) {
      setActionError(error.message);
      return false;
    }
    loadCodes();
    return true;
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    setSettingsSaved(false);
    const { error } = await supabase.rpc('update_site_settings', {
      p_instagram_url: settings.instagram_url,
      p_gcash_number: settings.gcash_number,
      p_gcash_name: settings.gcash_name,
    });
    setSettingsLoading(false);
    if (!error) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50">
        <Heart className="animate-heartbeat text-pink-500" fill="currentColor" size={40} />
      </div>
    );
  }

  if (!isAdmin) return null;

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(s) ||
      o.recipient_name.toLowerCase().includes(s) ||
      o.customer_email.toLowerCase().includes(s) ||
      o.slug.toLowerCase().includes(s) ||
      o.gcash_ref?.toLowerCase().includes(s)
    );
  });

  const filteredCodes = codes.filter((c) => {
    if (!codeSearch) return true;
    const s = codeSearch.toLowerCase();
    return (
      c.code.toLowerCase().includes(s) ||
      c.customer_name.toLowerCase().includes(s) ||
      c.order_ref.toLowerCase().includes(s)
    );
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.payment_status === 'pending_payment').length,
    verification: orders.filter((o) => o.payment_status === 'payment_verification').length,
    paid: orders.filter((o) => o.payment_status === 'paid').length,
    rejected: orders.filter((o) => o.payment_status === 'rejected').length,
    needsCorrection: orders.filter((o) => o.payment_status === 'needs_correction').length,
    refunded: orders.filter((o) => o.payment_status === 'refunded').length,
    published: orders.filter((o) => o.published).length,
    revenue: orders.filter((o) => o.payment_status === 'paid').length * PRICE,
    refundedAmount: orders.filter((o) => o.payment_status === 'refunded').length * PRICE,
    netRevenue: orders.filter((o) => o.payment_status === 'paid').length * PRICE
      - orders.filter((o) => o.payment_status === 'refunded').length * PRICE,
  };

  const codeStats = {
    total: codes.length,
    unused: codes.filter((c) => c.status === 'unused').length,
    assigned: codes.filter((c) => c.status === 'assigned').length,
    active: codes.filter((c) => c.status === 'active').length,
    redeemed: codes.filter((c) => c.status === 'redeemed').length,
    revoked: codes.filter((c) => c.status === 'revoked').length,
  };

  const exportCSV = () => {
    const headers = ['Order Number', 'Recipient', 'Sender', 'Occasion', 'Email', 'GCash Ref', 'Status', 'Amount', 'Created', 'Verified'];
    const rows = orders.map((o) => [
      o.order_number || '',
      o.recipient_name,
      o.sender_name,
      o.occasion,
      o.customer_email,
      o.gcash_ref || '',
      PAYMENT_STATUS_LABELS[o.payment_status],
      o.payment_status === 'paid' ? PRICE : 0,
      o.created_at?.slice(0, 10) ?? '',
      o.verified_at?.slice(0, 10) ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filters: Filter[] = ['all', 'pending_payment', 'payment_verification', 'paid', 'rejected', 'needs_correction', 'refunded'];
  const codeStatusFilters: ('all' | AccessCodeStatus)[] = ['all', 'unused', 'assigned', 'active', 'redeemed', 'revoked'];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-amber-50">
      <FloatingHearts count={6} />
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="text-pink-600" fill="currentColor" size={24} />
            <span className="font-serif-display text-xl font-semibold text-rose-900">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-1.5 text-sm text-rose-700 hover:text-rose-900">
              <ArrowLeft size={16} /> Home
            </button>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-full border border-pink-300 bg-white/80 px-4 py-2 text-sm font-medium text-pink-700 transition hover:bg-white">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-6 flex gap-2 rounded-full bg-white/70 p-1.5">
          <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} icon={Package} label="Orders" />
          <TabButton active={tab === 'codes'} onClick={() => setTab('codes')} icon={Ticket} label="Access Codes" />
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings} label="Settings" />
        </div>

        {actionError && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {actionError}
          </div>
        )}

        {/* ============ ORDERS TAB ============ */}
        {tab === 'orders' && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={Package} label="Total Orders" value={stats.total} color="bg-pink-100 text-pink-600" />
              <StatCard icon={Clock} label="Pending Payment" value={stats.pending} color="bg-amber-100 text-amber-600" />
              <StatCard icon={Search} label="For Review" value={stats.verification} color="bg-blue-100 text-blue-600" />
              <StatCard icon={Check} label="Approved" value={stats.paid} color="bg-green-100 text-green-600" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={AlertCircle} label="Needs Correction" value={stats.needsCorrection} color="bg-orange-100 text-orange-600" />
              <StatCard icon={X} label="Rejected" value={stats.rejected} color="bg-rose-100 text-rose-600" />
              <StatCard icon={DollarSign} label="Refunded" value={stats.refunded} color="bg-purple-100 text-purple-600" />
              <StatCard icon={TrendingUp} label="Published" value={stats.published} color="bg-teal-100 text-teal-600" />
            </div>

            <div className="mt-3 rounded-2xl border border-green-100 bg-green-50/50 p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <RevenueItem label="Verified Revenue" value={`₱${stats.revenue}`} color="text-green-700" />
                <RevenueItem label="Refunded Amount" value={`₱${stats.refundedAmount}`} color="text-purple-700" />
                <RevenueItem label="Net Revenue" value={`₱${stats.netRevenue}`} color="text-green-800" highlight />
                <RevenueItem label="Pending (not revenue)" value={`₱${stats.verification * PRICE}`} color="text-blue-600" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      filter === f ? 'bg-pink-600 text-white shadow' : 'bg-white/70 text-rose-600 hover:bg-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : PAYMENT_STATUS_LABELS[f]}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search order #, name, email, GCash ref…"
                  className="w-full rounded-full border border-pink-200 bg-white py-2 pl-9 pr-4 text-sm text-rose-900 outline-none focus:border-pink-500"
                />
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
              >
                <Download size={16} /> Export CSV
              </button>
              <button
                onClick={loadOrders}
                className="flex items-center gap-1.5 rounded-full border border-pink-300 bg-white/80 px-4 py-2 text-sm font-medium text-pink-700 transition hover:bg-white"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-pink-100 bg-white/90 shadow-sm">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-rose-400">
                  <Package size={32} className="mx-auto" />
                  <p className="mt-2 text-sm">No orders match this filter.</p>
                </div>
              ) : (
                <div className="divide-y divide-pink-50">
                  {filtered.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-pink-50/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-rose-900">{o.order_number || '—'}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[o.payment_status]}`}>
                            {PAYMENT_STATUS_LABELS[o.payment_status]}
                          </span>
                          {o.published && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">Published</span>}
                        </div>
                        <p className="mt-1 text-sm text-rose-700">
                          For <strong>{o.recipient_name || '—'}</strong> · {o.occasion.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-rose-400">
                          {o.customer_email && `${o.customer_email} · `}
                          {o.gcash_ref && `Ref: ${o.gcash_ref} · `}
                          {formatDate(o.created_at?.slice(0, 10) ?? null)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {o.receipt_url && (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <ImageIcon size={14} /> Receipt
                          </span>
                        )}
                        <button
                          onClick={() => setSelected(o)}
                          className="rounded-full bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ ACCESS CODES TAB ============ */}
        {tab === 'codes' && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard icon={Ticket} label="Total Codes" value={codeStats.total} color="bg-pink-100 text-pink-600" />
              <StatCard icon={KeyRound} label="Unused" value={codeStats.unused} color="bg-gray-100 text-gray-600" />
              <StatCard icon={UserPlus} label="Assigned" value={codeStats.assigned} color="bg-blue-100 text-blue-600" />
              <StatCard icon={Power} label="Active" value={codeStats.active} color="bg-green-100 text-green-600" />
              <StatCard icon={Check} label="Redeemed" value={codeStats.redeemed} color="bg-purple-100 text-purple-600" />
              <StatCard icon={Ban} label="Revoked" value={codeStats.revoked} color="bg-rose-100 text-rose-600" />
            </div>

            {/* Generate + filter row */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleGenerateCode}
                disabled={generating}
                className="flex items-center gap-2 rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:bg-pink-700 disabled:opacity-60"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Generate New Customer Code
              </button>
              <div className="flex flex-wrap gap-2">
                {codeStatusFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setCodeFilter(f)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      codeFilter === f ? 'bg-pink-600 text-white shadow' : 'bg-white/70 text-rose-600 hover:bg-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : ACCESS_CODE_STATUS_LABELS[f]}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
                <input
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  placeholder="Search code, customer, order ref…"
                  className="w-full rounded-full border border-pink-200 bg-white py-2 pl-9 pr-4 text-sm text-rose-900 outline-none focus:border-pink-500"
                />
              </div>
              <button
                onClick={loadCodes}
                className="flex items-center gap-1.5 rounded-full border border-pink-300 bg-white/80 px-4 py-2 text-sm font-medium text-pink-700 transition hover:bg-white"
              >
                <RefreshCw size={16} className={codesLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {/* Codes table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-pink-100 bg-white/90 shadow-sm">
              {filteredCodes.length === 0 ? (
                <div className="py-16 text-center text-rose-400">
                  <Ticket size={32} className="mx-auto" />
                  <p className="mt-2 text-sm">No access codes yet. Click "Generate New Customer Code" to create one.</p>
                </div>
              ) : (
                <div className="divide-y divide-pink-50">
                  {filteredCodes.map((c) => (
                    <div key={c.id} className="p-4 transition hover:bg-pink-50/50">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-rose-900">{c.code}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACCESS_CODE_STATUS_COLORS[c.status]}`}>
                              {ACCESS_CODE_STATUS_LABELS[c.status]}
                            </span>
                            {c.payment_verified && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Payment Verified</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-rose-700">
                            {c.customer_name && <span>Customer: <strong>{c.customer_name}</strong></span>}
                            {c.customer_name && c.order_ref && ' · '}
                            {c.order_ref && <span>Order: {c.order_ref}</span>}
                            {!c.customer_name && !c.order_ref && <span className="text-rose-400">Not yet assigned</span>}
                          </p>
                          <p className="text-xs text-rose-400">
                            Created {formatDate(c.created_at.slice(0, 10))} {c.created_at.slice(11, 16)}
                            {c.activated_at && ` · Activated ${formatDate(c.activated_at.slice(0, 10))}`}
                            {c.redeemed_at && ` · Redeemed ${formatDate(c.redeemed_at.slice(0, 10))}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CopyButton text={c.code} />
                          <button
                            onClick={() => setAssignModal(c)}
                            className="rounded-full border border-pink-300 bg-white px-3 py-2 text-xs font-medium text-pink-700 transition hover:bg-pink-50"
                          >
                            <UserPlus size={14} className="inline" /> Assign
                          </button>
                          {c.status !== 'active' && c.status !== 'redeemed' && c.status !== 'revoked' && (
                            <button
                              onClick={() => handleCodeAction('activate_access_code', { p_code: c.code })}
                              disabled={busy}
                              className="rounded-full bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                            >
                              <Power size={14} className="inline" /> Activate
                            </button>
                          )}
                          {c.status === 'active' && (
                            <button
                              onClick={() => handleCodeAction('deactivate_access_code', { p_code: c.code })}
                              disabled={busy}
                              className="rounded-full border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
                            >
                              <RotateCcw size={14} className="inline" /> Deactivate
                            </button>
                          )}
                          {c.status !== 'revoked' && c.status !== 'redeemed' && (
                            <button
                              onClick={() => window.confirm('Revoke this access code? The customer will no longer be able to use it.') && handleCodeAction('revoke_access_code', { p_code: c.code })}
                              disabled={busy}
                              className="rounded-full bg-rose-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
                            >
                              <Ban size={14} className="inline" /> Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ SETTINGS TAB ============ */}
        {tab === 'settings' && (
          <div className="mt-6 max-w-lg rounded-2xl border border-pink-100 bg-white/90 p-6 shadow-sm">
            <h2 className="font-serif-display text-xl font-semibold text-rose-900">Payment Page Settings</h2>
            <p className="mt-1 text-sm text-rose-500">These values appear on the customer payment page.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-rose-800">
                  <Instagram size={16} /> Instagram URL
                </label>
                <input
                  value={settings.instagram_url}
                  onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/youraccount"
                  className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                />
                <p className="mt-1 text-xs text-rose-400">Customers use this link to submit payment proof.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-rose-800">GCash Number</label>
                <input
                  value={settings.gcash_number}
                  onChange={(e) => setSettings({ ...settings, gcash_number: e.target.value })}
                  placeholder="09945579570"
                  className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-rose-800">GCash Account Name</label>
                <input
                  value={settings.gcash_name}
                  onChange={(e) => setSettings({ ...settings, gcash_name: e.target.value })}
                  placeholder="C S"
                  className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                />
              </div>

              {settingsSaved && (
                <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
                  <span className="flex items-center gap-2"><Check size={16} /> Settings saved successfully.</span>
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={settingsLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:bg-pink-700 disabled:opacity-60"
              >
                {settingsLoading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review modal */}
      {selected && (
        <ReviewModal
          order={selected}
          onClose={() => { setSelected(null); setActionError(null); }}
          onAction={handleAction}
          busy={busy}
          navigate={navigate}
        />
      )}

      {/* Assign modal */}
      {assignModal && (
        <AssignModal
          code={assignModal}
          onClose={() => setAssignModal(null)}
          onAssign={handleCodeAction}
          orders={orders}
          busy={busy}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Heart; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition ${
        active ? 'bg-pink-600 text-white shadow' : 'text-pink-600 hover:bg-pink-50'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };
  return (
    <button
      onClick={copy}
      className="rounded-full border border-pink-300 bg-white px-3 py-2 text-xs font-medium text-pink-700 transition hover:bg-pink-50"
    >
      {copied ? <Check size={14} className="inline" /> : <Copy size={14} className="inline" />}
      {copied ? ' Copied' : ' Copy'}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Heart; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white/90 p-4 shadow-sm">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon size={18} />
      </div>
      <div className="font-serif-display text-2xl font-bold text-rose-900">{value}</div>
      <div className="text-xs text-rose-500">{label}</div>
    </div>
  );
}

function RevenueItem({ label, value, color, highlight }: { label: string; value: string; color: string; highlight?: boolean }) {
  return (
    <div className={highlight ? 'rounded-xl bg-green-100/70 p-3' : 'p-3'}>
      <div className={`font-serif-display text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-rose-500">{label}</div>
    </div>
  );
}

function AssignModal({
  code,
  onClose,
  onAssign,
  orders,
  busy,
}: {
  code: AccessCode;
  onClose: () => void;
  onAssign: (rpc: string, params: Record<string, string>) => Promise<boolean>;
  orders: Surprise[];
  busy: boolean;
}) {
  const [customerName, setCustomerName] = useState(code.customer_name);
  const [orderRef, setOrderRef] = useState(code.order_ref);
  const [surpriseId, setSurpriseId] = useState<string>('');

  const submit = async () => {
    const params: Record<string, string> = {
      p_code: code.code,
      p_customer_name: customerName.trim(),
      p_order_ref: orderRef.trim(),
    };
    if (surpriseId) params.p_surprise_id = surpriseId;
    const ok = await onAssign('assign_access_code', params);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif-display text-xl font-bold text-rose-900">Assign Code</h2>
            <p className="mt-1 font-mono text-sm font-bold text-pink-600">{code.code}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-rose-400 transition hover:bg-rose-50">
            <X size={22} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rose-800">Customer Name / Reference</label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rose-800">Order Reference</label>
            <input
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder="e.g. LS-ABC123"
              className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rose-800">Link to Order (optional)</label>
            <select
              value={surpriseId}
              onChange={(e) => {
                setSurpriseId(e.target.value);
                const order = orders.find((o) => o.id === e.target.value);
                if (order) {
                  if (!customerName) setCustomerName(order.recipient_name || order.customer_email || '');
                  if (!orderRef) setOrderRef(order.order_number || '');
                }
              }}
              className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-rose-900 outline-none transition focus:border-pink-500"
            >
              <option value="">— None —</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number || o.slug} — {o.recipient_name || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={submit}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 py-3.5 font-semibold text-white shadow-lg transition hover:bg-pink-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
            Assign Code
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  order,
  onClose,
  onAction,
  busy,
  navigate,
}: {
  order: Surprise;
  onClose: () => void;
  onAction: (rpc: string, params: Record<string, string>) => Promise<boolean>;
  busy: boolean;
  navigate: (r: Route) => void;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [receiptFullUrl, setReceiptFullUrl] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('surprise_id', order.id)
        .order('created_at', { ascending: false });
      setLogs((data as PaymentLog[]) ?? []);
      setLoadingLogs(false);
    })();
  }, [order.id]);

  useEffect(() => {
    let active = true;
    if (!order.receipt_url) {
      setReceiptFullUrl('');
      return () => { active = false; };
    }
    supabase.storage.from('receipts').createSignedUrl(order.receipt_url, 600).then(({ data }) => {
      if (active) setReceiptFullUrl(data?.signedUrl ?? '');
    });
    return () => { active = false; };
  }, [order.receipt_url]);

  const canApprove = order.payment_status !== 'paid' && order.payment_status !== 'refunded';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif-display text-2xl font-bold text-rose-900">Order {order.order_number}</h2>
            <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${PAYMENT_STATUS_COLORS[order.payment_status]}`}>
              {PAYMENT_STATUS_LABELS[order.payment_status]}
            </span>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-rose-400 transition hover:bg-rose-50">
            <X size={22} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info label="Recipient" value={order.recipient_name || '—'} />
          <Info label="Sender" value={order.sender_name || '—'} />
          <Info label="Occasion" value={order.occasion.replace('_', ' ')} />
          <Info label="Theme" value={order.theme} />
          <Info label="Customer Email" value={order.customer_email || '—'} />
          <Info label="Created" value={formatDate(order.created_at?.slice(0, 10) ?? null) ?? '—'} />
        </div>

        {order.gcash_ref && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 p-3">
            <KeyRound size={16} className="text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-500">GCash Ref</span>
            <span className="font-mono text-sm font-bold text-blue-900">{order.gcash_ref}</span>
          </div>
        )}

        {order.customer_note && (
          <div className="mt-4 rounded-xl bg-pink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">Customer Note</p>
            <p className="mt-1 text-sm text-rose-800">{order.customer_note}</p>
          </div>
        )}

        {order.admin_note && (order.payment_status === 'rejected' || order.payment_status === 'needs_correction' || order.payment_status === 'refunded') && (
          <div className={`mt-4 rounded-xl p-4 ${
            order.payment_status === 'needs_correction' ? 'bg-orange-50' :
            order.payment_status === 'refunded' ? 'bg-purple-50' : 'bg-rose-50'
          }`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${
              order.payment_status === 'needs_correction' ? 'text-orange-500' :
              order.payment_status === 'refunded' ? 'text-purple-500' : 'text-rose-500'
            }`}>Admin Note</p>
            <p className={`mt-1 text-sm ${
              order.payment_status === 'needs_correction' ? 'text-orange-800' :
              order.payment_status === 'refunded' ? 'text-purple-800' : 'text-rose-800'
            }`}>{order.admin_note}</p>
          </div>
        )}

        {receiptFullUrl ? (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-rose-900">GCash Payment Receipt</p>
            <div className="overflow-hidden rounded-xl border border-pink-100 bg-gray-50">
              {receiptFullUrl && /\.pdf($|\?)/i.test(order.receipt_url) ? (
                <iframe src={receiptFullUrl} title="Payment receipt PDF" className="h-96 w-full" />
              ) : receiptFullUrl ? (
                <img src={receiptFullUrl} alt="Payment receipt" className="max-h-80 w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-sm text-rose-500">Preparing secure receipt preview…</p>
              )}
            </div>
            {receiptFullUrl && (
              <a href={receiptFullUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-pink-700 hover:underline">
                <ExternalLink size={14} /> Open full-size receipt
              </a>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-700">
            No receipt uploaded yet.
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-900">
            <History size={16} /> Transaction History
          </p>
          {loadingLogs ? (
            <p className="text-xs text-rose-400">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-rose-400">No status changes recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg bg-pink-50/60 p-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                    <Calendar size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-rose-700">
                      <span className="font-medium">{log.old_status || 'Created'}</span>
                      {' → '}
                      <span className={`font-semibold ${PAYMENT_STATUS_COLORS[log.new_status as PaymentStatus]?.split(' ')[1] || 'text-rose-700'}`}>
                        {PAYMENT_STATUS_LABELS[log.new_status as PaymentStatus] || log.new_status}
                      </span>
                    </p>
                    {log.reason && <p className="mt-0.5 text-xs text-rose-500">{log.reason}</p>}
                    <p className="mt-0.5 text-[10px] text-rose-400">
                      {log.admin_email && `by ${log.admin_email} · `}
                      {formatDate(log.created_at.slice(0, 10))} {log.created_at.slice(11, 16)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canApprove && (
          <div className="mt-6 space-y-4">
            <button
              onClick={() => window.confirm('Approve this payment and publish the Love Website?') && onAction('approve_payment', { p_slug: order.slug })}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:bg-green-700 disabled:opacity-60"
            >
              <Check size={20} /> Approve Payment &amp; Unlock
            </button>

            <div className="rounded-xl border border-orange-200 p-3">
              <p className="mb-2 text-xs font-semibold text-orange-600">Quick reasons:</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {NEEDS_CORRECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setCorrectionReason(reason)}
                    className="rounded-full bg-orange-50 px-2.5 py-1 text-xs text-orange-700 transition hover:bg-orange-100"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <input
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="What needs to be corrected (shown to customer)…"
                className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm text-rose-900 outline-none focus:border-orange-400"
              />
              <button
                onClick={() => correctionReason.trim() && onAction('mark_needs_correction', { p_slug: order.slug, p_reason: correctionReason })}
                disabled={busy || !correctionReason.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-orange-600 py-2.5 text-sm font-medium text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                <AlertCircle size={18} /> Request Correction
              </button>
            </div>

            <div className="rounded-xl border border-rose-200 p-3">
              <p className="mb-2 text-xs font-semibold text-rose-600">Quick reasons:</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className="rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700 transition hover:bg-rose-100"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (shown to customer)…"
                className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-900 outline-none focus:border-rose-400"
              />
              <button
                onClick={() => rejectReason.trim() && onAction('reject_payment', { p_slug: order.slug, p_reason: rejectReason })}
                disabled={busy || !rejectReason.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                <X size={18} /> Reject Payment
              </button>
            </div>

            {order.payment_status === 'paid' && (
              <div className="rounded-xl border border-purple-200 p-3">
                <input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for refund…"
                  className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm text-rose-900 outline-none focus:border-purple-400"
                />
                <button
                  onClick={() => refundReason.trim() && onAction('refund_payment', { p_slug: order.slug, p_reason: refundReason })}
                  disabled={busy || !refundReason.trim()}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 py-2.5 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-50"
                >
                  <DollarSign size={18} /> Issue Refund
                </button>
              </div>
            )}
          </div>
        )}

        {order.payment_status === 'paid' && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate({ name: 'view', slug: order.slug })}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-600 py-3 font-medium text-white transition hover:bg-pink-700"
            >
              <ExternalLink size={18} /> View Published Site
            </button>
            <button
              onClick={() => navigate({ name: 'share', slug: order.slug })}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-pink-300 py-3 font-medium text-pink-700 transition hover:bg-pink-50"
            >
              <Mail size={18} /> Share Link
            </button>
          </div>
        )}

        {order.payment_status === 'refunded' && (
          <div className="mt-6 rounded-xl bg-purple-50 p-4 text-center text-sm text-purple-700">
            This order has been refunded. Net revenue impact: -₱{PRICE}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-pink-400">{label}</p>
      <p className="mt-0.5 text-sm capitalize text-rose-900">{value}</p>
    </div>
  );
}

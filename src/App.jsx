/**
 * Competitor-Survey — Aplikasi Survei Kompetitor Berbasis GIS
 * Frontend: React + Tailwind CSS | Backend: Google Apps Script + Google Sheets + Google Drive
 */
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3, CheckSquare, Globe, Image, Info, List, LogOut, MapPin, Menu, MessageSquare,
  RefreshCw, Search, UploadCloud, Wifi, WifiOff, X,
} from 'lucide-react';
import { APP_NAME, APP_TAGLINE, GAS_READY, LS_KEYS, ROLE_ACCESS, SESSION_VERSION } from './config';
import { fetchResults, fetchSurveyors, loadMaster, lsGet, lsSet, outboxAfterSync, postToGas } from './lib';
import { DepoSelect, Logo } from './components/ui';
import OutboxPanel from './components/OutboxPanel';
import Login from './pages/Login';
import ListValidasi from './pages/ListValidasi';
import SurveyForm from './pages/SurveyForm';

// Halaman yang jarang dibuka / berat (Leaflet) dimuat terpisah agar layar awal di HP lebih cepat
const MapPage = lazy(() => import('./pages/MapPage'));
const Gallery = lazy(() => import('./pages/Gallery'));
const TokoSukses = lazy(() => import('./pages/TokoSukses'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const About = lazy(() => import('./pages/About'));
const Feedback = lazy(() => import('./pages/Feedback'));

/** Role tersimpan hanya berlaku jika dibuat dengan konfigurasi PIN yang sama. */
const loadRole = () => {
  const s = lsGet(LS_KEYS.role, null);
  return s && s.v === SESSION_VERSION ? s.role : null;
};

// [key, label, icon] — hak akses per role diatur di ROLE_ACCESS (src/config.js)
const MENU = [
  ['list', 'List Validasi', List],
  ['map', 'Map of Location', MapPin],
  ['gallery', 'Data Gallery', Image],
  ['sukses', 'List Toko Sukses', CheckSquare],
  ['dashboard', 'Dashboard', BarChart3],
  ['about', 'About', Info],
  ['feedback', 'Feedback', MessageSquare],
];

const DEPO_PAGES = ['list', 'map', 'gallery', 'sukses', 'dashboard'];

const SEARCH_PLACEHOLDER = {
  list: 'Search Data Toko…',
  map: 'Cari Toko/Daerah di Peta…',
  gallery: 'Cari nama toko/surveyor…',
  sukses: 'Cari data validasi…',
};

export default function App() {
  const [role, setRoleState] = useState(loadRole);
  const [page, setPage] = useState('list');
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const [customers, setCustomers] = useState(() => lsGet(LS_KEYS.master, []));
  const [masterMsg, setMasterMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(() => lsGet(LS_KEYS.results, []));
  const [refreshing, setRefreshing] = useState(false);

  const [online, setOnline] = useState(navigator.onLine);
  const [outbox, setOutbox] = useState(() => lsGet(LS_KEYS.outbox, []));
  const [localDone, setLocalDone] = useState(() => lsGet(LS_KEYS.done, {}));
  const [surveyor, setSurveyorState] = useState(() => lsGet(LS_KEYS.surveyor, ''));
  const [surveyors, setSurveyors] = useState(() => lsGet(LS_KEYS.surveyors, []));
  const [depo, setDepoState] = useState(() => lsGet(LS_KEYS.depo, ''));
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const setRole = (r) => {
    setRoleState(r);
    lsSet(LS_KEYS.role, r ? { role: r, v: SESSION_VERSION } : null);
    setPage('list');
    setSelected(null);
  };
  const setSurveyor = (v) => {
    setSurveyorState(v);
    lsSet(LS_KEYS.surveyor, v);
  };
  const setDepo = (v) => {
    setDepoState(v);
    lsSet(LS_KEYS.depo, v);
  };
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ---- Data: master CSV (cache LocalStorage untuk offline) + hasil survei dari GAS ----
  const refreshMaster = useCallback(async () => {
    try {
      const rows = await loadMaster();
      setCustomers(rows);
      lsSet(LS_KEYS.master, rows);
      setMasterMsg('');
    } catch {
      setMasterMsg(lsGet(LS_KEYS.master, []).length ? 'Offline — memakai data master tersimpan.' : 'Gagal memuat data master.');
    }
  }, []);

  const refreshResults = useCallback(async () => {
    if (!GAS_READY || !navigator.onLine) return;
    try {
      const data = await fetchResults();
      setResults(data);
      lsSet(LS_KEYS.results, data);
      // Server = sumber kebenaran: status "terkirim" lokal tidak dibutuhkan lagi (data yang dihapus di sheet ikut hilang)
      setLocalDone({});
      lsSet(LS_KEYS.done, {});
    } catch (err) {
      console.warn('Gagal memuat hasil survei', err);
    }
  }, []);

  const refreshSurveyors = useCallback(async () => {
    if (!GAS_READY || !navigator.onLine) return;
    try {
      const data = await fetchSurveyors();
      setSurveyors(data);
      lsSet(LS_KEYS.surveyors, data);
    } catch (err) {
      console.warn('Gagal memuat daftar surveyor', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshMaster(), refreshResults(), refreshSurveyors()]);
    setRefreshing(false);
    setLoading(false);
  }, [refreshMaster, refreshResults, refreshSurveyors]);

  useEffect(() => {
    if (role) refreshAll();
  }, [role, refreshAll]);

  // ---- Sync Outbox ----
  const syncOutbox = useCallback(async () => {
    const queue = lsGet(LS_KEYS.outbox, []);
    // Guard: event "online" dan tombol Sync bisa terpicu bersamaan
    if (syncingRef.current || !queue.length || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    const sentIds = new Set();
    const errors = {};
    const done = { ...lsGet(LS_KEYS.done, {}) };
    try {
      for (const item of queue) {
        try {
          await postToGas(item);
          sentIds.add(item.submissionId);
          done[item.idPelanggan] = 'sent';
        } catch (err) {
          console.warn('Sync gagal', item.submissionId, err);
          errors[item.submissionId] = err.message;
        }
      }
    } finally {
      // Baca ulang Outbox terkini: survei yang disimpan selama Sync berjalan tetap dipertahankan
      const remaining = outboxAfterSync(lsGet(LS_KEYS.outbox, []), sentIds, errors);
      lsSet(LS_KEYS.outbox, remaining);
      lsSet(LS_KEYS.done, done);
      setOutbox(remaining);
      setLocalDone(done);
      setSyncing(false);
      syncingRef.current = false;
      showToast(`Sync selesai: ${sentIds.size} terkirim, ${remaining.length} tertunda`, remaining.length ? 'warn' : 'success');
      if (sentIds.size) refreshResults();
    }
  }, [refreshResults, showToast]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      syncOutbox(); // auto-sync saat internet kembali
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [syncOutbox]);

  const handleSubmitted = (payload, status) => {
    if (status === 'pending') {
      // Tambah ke Outbox terkini di storage (bukan state) agar tidak bentrok dengan Sync yang sedang berjalan
      const next = [...lsGet(LS_KEYS.outbox, []), payload];
      if (!lsSet(LS_KEYS.outbox, next)) {
        alert('Penyimpanan perangkat penuh! Sync Outbox terlebih dahulu.');
        return;
      }
      setOutbox(next);
      showToast('Tidak ada koneksi — data disimpan ke Outbox', 'warn');
    } else {
      showToast('Survei berhasil dikirim', 'success');
      refreshResults();
    }
    const done = { ...lsGet(LS_KEYS.done, {}), [payload.idPelanggan]: status };
    lsSet(LS_KEYS.done, done);
    setLocalDone(done);
    setSelected(null);
  };

  const removeFromOutbox = (item) => {
    if (!confirm(`Hapus survei "${item.namaPelanggan}" dari Outbox? Data yang belum terkirim akan hilang.`)) return;
    const next = lsGet(LS_KEYS.outbox, []).filter((o) => o.submissionId !== item.submissionId);
    lsSet(LS_KEYS.outbox, next);
    setOutbox(next);
  };

  // Status per toko: hasil server (semua surveyor) + kiriman lokal + Outbox
  const statusById = useMemo(() => {
    const m = {};
    results.forEach((r) => (m[r.idPelanggan] = 'sent'));
    Object.entries(localDone).forEach(([id, st]) => st === 'sent' && (m[id] = 'sent'));
    outbox.forEach((o) => (m[o.idPelanggan] ??= 'pending'));
    return m;
  }, [results, localDone, outbox]);

  // Filter Depo (Workplace) berlaku untuk List, Map, Gallery, Toko Sukses & Dashboard
  const workplaces = useMemo(() => [...new Set(customers.map((c) => c.workplace).filter(Boolean))].sort(), [customers]);
  const activeDepo = workplaces.includes(depo) ? depo : ''; // depo tersimpan tidak ada lagi di master → semua
  const scopedCustomers = useMemo(
    () => (activeDepo ? customers.filter((c) => c.workplace === activeDepo) : customers),
    [customers, activeDepo]
  );
  const scopedResults = useMemo(
    () => (activeDepo ? results.filter((r) => r.workplace === activeDepo) : results),
    [results, activeDepo]
  );

  if (!role) return <Login onLogin={setRole} />;

  const allowed = ROLE_ACCESS[role] || [];
  const menu = MENU.filter(([key]) => allowed.includes(key));
  const go = (key) => {
    setPage(key);
    setSelected(null);
    setSearch('');
    setMenuOpen(false);
  };

  let content;
  if (selected) {
    content = <SurveyForm customer={selected} surveyor={surveyor} setSurveyor={setSurveyor} surveyors={surveyors}
      online={online} onClose={() => setSelected(null)} onSubmitted={handleSubmitted} />;
  } else if (loading && !customers.length) {
    content = <div className="text-center text-slate-400 py-20">Memuat data master…</div>;
  } else if (!allowed.includes(page)) {
    content = <div className="text-center text-slate-400 py-20">Halaman ini tidak tersedia untuk akses Anda.</div>;
  } else {
    content = {
      list: <ListValidasi key={activeDepo} customers={scopedCustomers} statusById={statusById} search={search} onSelect={setSelected} />,
      map: <MapPage key={activeDepo} customers={scopedCustomers} statusById={statusById} search={search} onSelect={setSelected} />,
      gallery: <Gallery results={scopedResults} search={search} />,
      sukses: <TokoSukses results={scopedResults} search={search} />,
      dashboard: <Dashboard customers={scopedCustomers} results={scopedResults} />,
      about: <About />,
      feedback: <Feedback role={role} surveyor={surveyor} />,
    }[page];
  }
  const showSearch = !selected && SEARCH_PLACEHOLDER[page];

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* Sidebar */}
      {menuOpen && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform lg:translate-x-0 ${
        menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 lg:hidden">
          <span className="font-black">{APP_NAME}</span>
          <button onClick={() => setMenuOpen(false)} aria-label="Tutup menu" className="p-1.5 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 lg:pt-5">
          {menu.map(([key, label, Icon]) => (
            <button key={key} onClick={() => go(key)} aria-current={page === key && !selected ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                page === key && !selected ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button onClick={() => { if (confirm('Keluar dari aplikasi?')) setRole(null); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black tracking-wider text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100">
            <LogOut size={18} /> LOGOUT
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button onClick={() => setMenuOpen(true)} aria-label="Buka menu" className="p-2 -ml-2 rounded-lg hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center shrink-0"><Globe size={18} /></div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-slate-900 truncate">{APP_NAME} {APP_TAGLINE}</div>
              <div className="text-[10px] font-extrabold tracking-widest text-slate-400">{`${String(role).toUpperCase()} ACCESS`}</div>
            </div>
            {showSearch && (
              <div className="hidden md:block flex-1 max-w-xl mx-auto relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={SEARCH_PLACEHOLDER[page]}
                  aria-label={SEARCH_PLACEHOLDER[page]} type="search"
                  className="w-full bg-slate-100 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
              </div>
            )}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <span title={online ? 'Online' : 'Offline'}
                className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${online ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {online ? <Wifi size={12} /> : <WifiOff size={12} />} {online ? 'ONLINE' : 'OFFLINE'}
              </span>
              {outbox.length > 0 && (
                <button onClick={syncOutbox} disabled={!online || syncing} title="Sync Outbox" aria-label={`Sync ${outbox.length} survei di Outbox`}
                  className="relative inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg disabled:opacity-60">
                  <UploadCloud size={14} className={syncing ? 'animate-pulse' : ''} /> Sync
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{outbox.length}</span>
                </button>
              )}
              <button onClick={refreshAll} title="Muat ulang data" aria-label="Muat ulang data" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <Logo size="sm" />
            </div>
          </div>
          {showSearch && (
            <div className="md:hidden px-4 pb-3 relative">
              <Search size={16} className="absolute left-7 top-[11px] text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={SEARCH_PLACEHOLDER[page]}
                aria-label={SEARCH_PLACEHOLDER[page]} type="search"
                className="w-full bg-slate-100 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6">
          {masterMsg && <Banner tone="amber">{masterMsg}</Banner>}
          {!GAS_READY && ['gallery', 'sukses', 'dashboard'].includes(page) && (
            <Banner tone="amber">Backend Apps Script belum terhubung (GAS_URL belum diisi) — data hasil survei belum bisa dimuat.</Banner>
          )}
          {!selected && DEPO_PAGES.includes(page) && allowed.includes(page) && (
            <DepoSelect workplaces={workplaces} value={activeDepo} onChange={setDepo} />
          )}
          {page === 'list' && !selected && (
            <OutboxPanel outbox={outbox} online={online} syncing={syncing} onSync={syncOutbox} onRemove={removeFromOutbox} />
          )}
          <Suspense fallback={<div className="text-center text-slate-400 py-20">Memuat halaman…</div>}>{content}</Suspense>
        </main>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className={`fixed top-20 left-1/2 -translate-x-1/2 z-[1100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'warn' ? 'bg-amber-600' : 'bg-slate-800'}`}>
          {toast.msg}
          <button onClick={() => setToast(null)} aria-label="Tutup notifikasi"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

function Banner({ tone, children }) {
  const cls = tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800';
  return <div className={`mb-4 flex items-center gap-3 text-sm border rounded-xl px-4 py-2.5 ${cls}`}>{children}</div>;
}

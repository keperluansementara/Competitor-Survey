import React, { useCallback, useEffect, useRef } from 'react';
import { BarChart3, Building2, CheckCircle2, ExternalLink, Filter, Image as ImageIcon, Navigation, Target, X } from 'lucide-react';
import { PRODUCTS } from '../config';
import { driveThumb, formatDistance, formatItem, gmapsRoute, itemFilled } from '../lib';

// ============================================================================
// LOGO
// ============================================================================
export function Logo({ size = 'md' }) {
  const cls = size === 'lg' ? 'w-24 h-24 text-3xl rounded-2xl' : size === 'sm' ? 'w-9 h-9 text-xs rounded-full' : 'w-14 h-14 text-lg rounded-xl';
  return (
    <div className={`${cls} flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-700 text-white font-black italic tracking-tighter shadow-inner select-none`}>
      SHP
    </div>
  );
}

// ============================================================================
// STATUS
// ============================================================================
export const STATUS_META = {
  sent: { label: 'Tersurvei', cls: 'text-emerald-600', dot: 'bg-emerald-500', color: '#10b981' },
  pending: { label: 'Di Outbox', cls: 'text-amber-600', dot: 'bg-amber-500', color: '#f59e0b' },
  none: { label: 'Belum Tersurvei', cls: 'text-rose-500', dot: 'bg-rose-500', color: '#f43f5e' },
};

export function LocationBadge({ status, className = '' }) {
  const ok = status === 'VALID';
  const label = ok ? 'VALID' : status === 'DI LUAR RADIUS' ? 'LUAR RADIUS' : status || '-';
  return (
    <span className={`text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-md ${
      ok ? 'bg-emerald-500 text-white' : status === 'DI LUAR RADIUS' ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'} ${className}`}>
      {label}
    </span>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex bg-slate-100 rounded-xl p-1 border border-slate-200">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`px-3 sm:px-4 py-1.5 text-[11px] font-extrabold tracking-wider rounded-lg transition ${
            value === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// KARTU RINGKASAN SURVEI (List Validasi & Map of Location)
// ============================================================================
export const STATUS_FILTERS = [['all', 'SEMUA'], ['belum', 'BELUM'], ['selesai', 'SELESAI']];

export function SurveyStatsCard({ customers, statusById, filter, onFilter, className = '' }) {
  const total = customers.length;
  const done = customers.filter((c) => statusById[c.id]).length;
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="flex divide-x divide-slate-200">
        <Stat icon={BarChart3} label="TOTAL TOKO" value={total} cls="text-slate-900" labelCls="text-slate-400" />
        <Stat icon={CheckCircle2} label="DISURVEI" value={done} cls="text-emerald-600" labelCls="text-emerald-500" />
        <Stat icon={Target} label="SISA TARGET" value={total - done} cls="text-rose-500" labelCls="text-rose-400" />
      </div>
      <Segmented value={filter} onChange={onFilter} options={STATUS_FILTERS} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, cls, labelCls }) {
  return (
    <div className="px-3 sm:px-8 first:pl-0">
      <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold tracking-wider sm:tracking-widest whitespace-nowrap ${labelCls}`}>
        <Icon size={12} /> {label}
      </div>
      <div className={`text-2xl sm:text-3xl font-black mt-1 ${cls}`}>{value.toLocaleString('id-ID')}</div>
    </div>
  );
}

/** Pemilih depo (Workplace) global — disimpan per perangkat. */
export function DepoSelect({ workplaces, value, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label htmlFor="depo-select" className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-slate-500">
        <Building2 size={14} /> DEPO
      </label>
      <select id="depo-select" value={value} onChange={(e) => onChange(e.target.value)}
        className={`text-sm font-bold rounded-xl border px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
        <option value="">Semua Depo ({workplaces.length})</option>
        {workplaces.map((w) => <option key={w} value={w}>{w}</option>)}
      </select>
    </div>
  );
}

// Tombol filter kecamatan (dipakai List Validasi & Map of Location)
export function KecamatanFilter({ options, value, onChange }) {
  return (
    <label className={`relative inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-2 rounded-xl border cursor-pointer ${
      value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
      <Filter size={14} /> {value || 'KECAMATAN'}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter kecamatan"
        className="absolute inset-0 opacity-0 cursor-pointer">
        <option value="">Semua Kecamatan</option>
        {options.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
    </label>
  );
}

export function PageTitle({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">{title}</h1>
          {subtitle && <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ============================================================================
// MINI MAP (static OSM tiles — ringan untuk ratusan kartu)
// ============================================================================
const TILE = 256;
const project = (lat, lng, z) => {
  const s = TILE * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * s,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s,
  };
};

/**
 * Tile yang beririsan dengan kotak (maxWidth × height) berpusat di titik — bukan grid 3×3 tetap,
 * sehingga daftar 40 kartu memuat ±40% lebih sedikit tile.
 */
export const tilesFor = (x, y, maxWidth, height) => {
  const tiles = [];
  for (let tx = Math.floor((x - maxWidth / 2) / TILE); tx <= Math.floor((x + maxWidth / 2) / TILE); tx++)
    for (let ty = Math.floor((y - height / 2) / TILE); ty <= Math.floor((y + height / 2) / TILE); ty++) tiles.push([tx, ty]);
  return tiles;
};

const validCoord = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 85 && Math.abs(lng) <= 180;

export function MiniMap({ lat, lng, zoom = 16, height = 112, maxWidth = 520 }) {
  if (!validCoord(lat, lng))
    return <div style={{ height }} className="bg-slate-100 flex items-center justify-center text-xs text-slate-400">Koordinat tidak tersedia</div>;
  const { x, y } = project(lat, lng, zoom);
  const tiles = tilesFor(x, y, maxWidth, height);
  return (
    <div style={{ height }} className="relative overflow-hidden bg-slate-100" role="img" aria-label={`Peta lokasi ${lat.toFixed(5)}, ${lng.toFixed(5)}`}>
      {tiles.map(([cx, cy]) => (
        <img key={`${cx}-${cy}`} alt="" loading="lazy" draggable="false"
          src={`https://tile.openstreetmap.org/${zoom}/${cx}/${cy}.png`}
          className="absolute max-w-none w-64 h-64 select-none"
          style={{ left: `calc(50% + ${cx * TILE - x}px)`, top: `calc(50% + ${cy * TILE - y}px)` }} />
      ))}
      <svg viewBox="0 0 24 32" className="absolute left-1/2 top-1/2 w-6 h-8 -translate-x-1/2 -translate-y-full drop-shadow">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#84cc16" stroke="#3f6212" strokeWidth="1" />
        <circle cx="12" cy="12" r="4.5" fill="#fff" />
      </svg>
      <span className="absolute bottom-0 right-0 bg-white/80 text-[9px] px-1 text-slate-500">© OpenStreetMap</span>
    </div>
  );
}

// ============================================================================
// SIGNATURE PAD (Kanvas Digital Signature)
// ============================================================================
export function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, []);

  useEffect(() => {
    setup();
  }, [setup]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clear = () => {
    setup();
    onChange('');
  };

  return (
    <div>
      <canvas ref={canvasRef}
        className="w-full h-40 rounded-xl border-2 border-dashed border-slate-300 bg-white touch-none"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      <div className="flex items-center justify-between mt-1 text-xs">
        <span className={value ? 'text-emerald-600' : 'text-slate-400'}>
          {value ? '✓ Tanda tangan tersimpan' : 'Tanda tangan pemilik/PIC toko di area di atas'}
        </span>
        <button type="button" onClick={clear} className="text-rose-600 font-semibold">Hapus</button>
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL HASIL SURVEI (modal — dipakai Gallery & List Toko Sukses)
// ============================================================================
export function ResultDetailModal({ row, onClose }) {
  useEffect(() => {
    if (!row) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  if (!row) return null;
  const filled = PRODUCTS.filter((p) => itemFilled(row.items?.[p.key]));
  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Detail survei ${row.namaPelanggan}`}
        className="bg-white w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10">
          <div className="min-w-0">
            <div className="font-black text-slate-900 truncate">{row.namaPelanggan}</div>
            <div className="text-xs text-slate-500">{row.idPelanggan} · {row.tglSurvei} · oleh {row.surveyor}</div>
          </div>
          <button onClick={onClose} aria-label="Tutup detail" className="p-2 rounded-lg hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            {row.foto ? (
              <a href={row.foto} target="_blank" rel="noreferrer" className="block">
                <img src={driveThumb(row.foto, 1000)} alt="Foto bukti" className="w-full rounded-xl bg-slate-100" />
              </a>
            ) : <div className="h-48 rounded-xl bg-slate-100 flex items-center justify-center text-sm text-slate-400">Tidak ada foto</div>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Info label="Status Lokasi"><LocationBadge status={row.statusLokasi} /></Info>
              <Info label="Jarak Validasi">{formatDistance(row.jarakMeter)}</Info>
              <Info label="Akurasi GPS">{row.akurasiGps ? `±${row.akurasiGps} m` : '-'}</Info>
              <Info label="Kecamatan">{row.kecamatan || '-'}</Info>
            </div>
            {row.alasanLokasi && <Info label="Alasan Lokasi">{row.alasanLokasi}</Info>}
            <div className="flex gap-2">
              {row.latAktual && (
                <a href={gmapsRoute(row.latAktual, row.longAktual)} target="_blank" rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg py-2">
                  <Navigation size={14} /> Lokasi Aktual
                </a>
              )}
              {row.foto && (
                <a href={row.foto} target="_blank" rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg py-2">
                  <ExternalLink size={14} /> Foto di Drive
                </a>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">Qty / Harga per Unit ({filled.length}/{PRODUCTS.length})</div>
              <div className="rounded-xl border divide-y text-sm">
                {PRODUCTS.map((p) => {
                  const it = row.items?.[p.key];
                  return (
                    <div key={p.key} className="flex justify-between px-3 py-1.5">
                      <span className="text-slate-600">{p.label} <span className="text-[10px] text-slate-400">/{p.unit}</span></span>
                      <span className={`font-semibold tabular-nums ${itemFilled(it) ? 'text-slate-900' : 'text-slate-300'}`}>{formatItem(it)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Info label="Promosi Kompetitor">{row.promosi || '-'}</Info>
            <Info label="Catatan">{row.catatan || '-'}</Info>
            {row.ttd && (
              <Info label="Tanda Tangan">
                <img src={driveThumb(row.ttd, 400)} alt="TTD" className="h-20 bg-white border rounded-lg" />
              </Info>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Empty({ text = 'Belum ada data hasil survei.' }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center text-slate-400">
      <ImageIcon className="mx-auto mb-2" /> {text}
    </div>
  );
}

function Info({ label, children }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">{label}</div>
      <div className="text-sm text-slate-800 mt-0.5 break-words">{children}</div>
    </div>
  );
}

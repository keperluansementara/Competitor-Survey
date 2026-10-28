import React, { useMemo, useState } from 'react';
import { Crosshair, Filter, List, Navigation, Plus } from 'lucide-react';
import { formatDistance, getCurrentPosition, gmapsRoute, haversine, matchCustomer, matchStatus } from '../lib';
import { MiniMap, STATUS_META, SurveyStatsCard } from '../components/ui';

const PAGE_SIZE = 40;

export default function ListValidasi({ customers, statusById, search, onSelect }) {
  const [filter, setFilter] = useState('all'); // all | belum | selesai
  const [kecamatan, setKecamatan] = useState('');
  const [myPos, setMyPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const kecamatanList = useMemo(() => [...new Set(customers.map((c) => c.kecamatan))].sort(), [customers]);

  const toggleNearest = async () => {
    if (myPos) return setMyPos(null);
    setLocating(true);
    try {
      setMyPos(await getCurrentPosition());
    } catch (err) {
      alert('Tidak bisa mengambil lokasi: ' + err.message);
    } finally {
      setLocating(false);
    }
  };

  const rows = useMemo(() => {
    let list = customers.filter((c) => {
      if (!matchStatus(statusById[c.id], filter)) return false;
      if (kecamatan && c.kecamatan !== kecamatan) return false;
      return matchCustomer(c, search);
    });
    if (myPos) {
      list = list
        .map((c) => ({ ...c, dist: c.lat != null ? haversine(myPos.lat, myPos.lng, c.lat, c.lng) : Infinity }))
        .sort((a, b) => a.dist - b.dist);
    }
    return list;
  }, [customers, statusById, filter, kecamatan, search, myPos]);

  // Kelompokkan per kecamatan (kecuali mode "terdekat" yang berupa satu daftar urut jarak)
  const groups = useMemo(() => {
    const visible = rows.slice(0, limit);
    if (myPos) return [['URUT TERDEKAT DARI POSISI ANDA', visible]];
    const map = new Map();
    visible.forEach((c) => {
      if (!map.has(c.kecamatan)) map.set(c.kecamatan, []);
      map.get(c.kecamatan).push(c);
    });
    return [...map.entries()];
  }, [rows, limit, myPos]);
  const countByKec = useMemo(() => {
    const m = {};
    rows.forEach((c) => (m[c.kecamatan] = (m[c.kecamatan] || 0) + 1));
    return m;
  }, [rows]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 text-sm font-black tracking-wide text-slate-800">
          <List size={18} className="text-slate-400" /> LIST VALIDASI
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleNearest} disabled={locating}
            className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-2 rounded-xl border transition ${
              myPos ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Crosshair size={14} className={locating ? 'animate-spin' : ''} /> {myPos ? 'TERDEKAT: AKTIF' : 'URUTKAN TERDEKAT'}
          </button>
          <label className={`relative inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-2 rounded-xl border cursor-pointer ${
            kecamatan ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Filter size={14} /> {kecamatan || 'KECAMATAN'}
            <select value={kecamatan} onChange={(e) => { setKecamatan(e.target.value); setLimit(PAGE_SIZE); }}
              className="absolute inset-0 opacity-0 cursor-pointer">
              <option value="">Semua Kecamatan</option>
              {kecamatanList.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>
      </div>

      <SurveyStatsCard customers={customers} statusById={statusById} filter={filter}
        onFilter={(v) => { setFilter(v); setLimit(PAGE_SIZE); }} className="mb-6" />

      {groups.map(([kec, list]) => (
        <section key={kec} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black tracking-[0.2em] text-slate-500">{kec}</span>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
              {myPos ? `${rows.length} TOKO` : `${countByKec[kec]} TOKO`}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {list.map((c) => (
              <StoreCard key={c.id + c.nama} c={c} status={statusById[c.id]} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}

      {rows.length > limit && (
        <button onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="w-full py-3 text-sm font-bold text-blue-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
          Tampilkan lebih banyak ({rows.length - limit} lagi)
        </button>
      )}
      {!rows.length && <div className="text-center text-slate-400 py-16">Tidak ada toko yang cocok dengan filter.</div>}
    </div>
  );
}

function StoreCard({ c, status, onSelect }) {
  const meta = STATUS_META[status || 'none'];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
      <div className="relative flex items-start gap-3 p-4 pr-4">
        <button onClick={() => onSelect(c)} title="Mulai survei" aria-label={`Mulai survei ${c.nama}`}
          className="shrink-0 w-7 h-7 rounded-full border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center">
          <Plus size={14} />
        </button>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelect(c)}>
          <div className="font-black text-sm text-slate-900 uppercase truncate pr-16">{c.nama}</div>
          <div className={`flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${meta.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} /> {meta.label}
          </div>
        </div>
        <span className="absolute top-0 right-0 bg-violet-500 text-white text-[9px] font-extrabold tracking-wider px-2 py-1 rounded-bl-lg max-w-[45%] truncate">
          {c.channel || 'TOKO'}
        </span>
      </div>
      <MiniMap lat={c.lat} lng={c.lng} />
      <div className="p-3 flex items-center gap-2 mt-auto">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-slate-500 truncate">{c.alamat}</div>
          <div className="text-[10px] text-slate-400 truncate">
            {c.id}{c.dist != null && c.dist !== Infinity && <span className="text-blue-600 font-bold"> · {formatDistance(c.dist)}</span>}
          </div>
        </div>
        {c.lat != null && (
          <a href={gmapsRoute(c.lat, c.lng)} target="_blank" rel="noreferrer" title="Rute Google Maps" aria-label={`Rute Google Maps ke ${c.nama}`}
            className="shrink-0 p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
            <Navigation size={15} />
          </a>
        )}
      </div>
    </div>
  );
}

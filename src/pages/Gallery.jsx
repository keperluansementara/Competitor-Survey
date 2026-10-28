import React, { useCallback, useMemo, useState } from 'react';
import { driveThumb, formatDistance } from '../lib';
import { Empty, LocationBadge, PageTitle, ResultDetailModal, Segmented } from '../components/ui';
import { filterByLocation, matchSearch } from './resultFilters';

export default function Gallery({ results, search }) {
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const closeDetail = useCallback(() => setDetail(null), []);
  const rows = useMemo(
    () => results.filter((r) => r.foto && filterByLocation(r, filter) && matchSearch(r, search)),
    [results, filter, search]
  );

  return (
    <div className="max-w-6xl mx-auto">
      <PageTitle title="Data Gallery" subtitle={`Total: ${rows.length} foto`}
        right={<Segmented value={filter} onChange={setFilter} options={[['all', 'SEMUA'], ['valid', 'VALID'], ['luar', 'LUAR RADIUS']]} />} />
      {!rows.length && <Empty />}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {rows.map((r) => (
          <button key={r.submissionId || r.tglSurvei + r.idPelanggan} onClick={() => setDetail(r)}
            className="text-left bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="relative aspect-[4/3] bg-slate-100">
              <img src={driveThumb(r.foto, 500)} alt="" loading="lazy" className="w-full h-full object-cover" />
              <LocationBadge status={r.statusLokasi} className="absolute top-2 left-2" />
              <span className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">{r.tglSurvei}</span>
            </div>
            <div className="p-3">
              <div className="font-black text-xs text-slate-900 uppercase truncate">{r.namaPelanggan}</div>
              <div className="flex justify-between text-[11px] mt-1">
                <span className="text-slate-500 truncate">By: {r.surveyor}</span>
                <span className={`font-bold ${r.statusLokasi === 'VALID' ? 'text-emerald-600' : 'text-rose-500'}`}>{formatDistance(r.jarakMeter)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <ResultDetailModal row={detail} onClose={closeDetail} />
    </div>
  );
}

import React, { useCallback, useMemo, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { PRODUCTS } from '../config';
import { exportResultsCsv, formatDistance, itemFilled } from '../lib';
import { Empty, LocationBadge, PageTitle, ResultDetailModal, Segmented } from '../components/ui';
import { filterByLocation, matchSearch } from './resultFilters';

export default function TokoSukses({ results, search }) {
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const closeDetail = useCallback(() => setDetail(null), []);
  const rows = useMemo(
    () => results.filter((r) => filterByLocation(r, filter) && matchSearch(r, search)),
    [results, filter, search]
  );

  return (
    <div className="max-w-6xl mx-auto">
      <PageTitle title="List Toko Tervalidasi" subtitle={`Total: ${rows.length} toko`}
        right={
          <div className="flex flex-wrap gap-2">
            <Segmented value={filter} onChange={setFilter} options={[['all', 'SEMUA'], ['valid', 'VALID'], ['luar', 'LUAR RADIUS']]} />
            <button onClick={() => exportResultsCsv(rows)} disabled={!rows.length}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 disabled:opacity-50">
              <Download size={15} /> EXPORT DATA (.CSV)
            </button>
          </div>
        } />
      {!rows.length ? <Empty /> : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase text-left border-b">
                <th className="px-5 py-4">Nama Toko</th>
                <th className="px-3 py-4">Kecamatan</th>
                <th className="px-3 py-4">Surveyor</th>
                <th className="px-3 py-4">Waktu Validasi</th>
                <th className="px-3 py-4">Jarak Validasi</th>
                <th className="px-3 py-4">Produk Terisi</th>
                <th className="px-5 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const filled = PRODUCTS.filter((p) => itemFilled(r.items?.[p.key])).length;
                return (
                  <tr key={r.submissionId || r.tglSurvei + r.idPelanggan} onClick={() => setDetail(r)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 uppercase">{r.namaPelanggan}</span>
                        <LocationBadge status={r.statusLokasi} />
                      </div>
                      <div className="text-[11px] text-slate-400">{r.idPelanggan}</div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{r.kecamatan}</td>
                    <td className="px-3 py-3.5 text-slate-700 font-semibold">{r.surveyor}</td>
                    <td className="px-3 py-3.5 text-slate-600 whitespace-nowrap">{r.tglSurvei}</td>
                    <td className={`px-3 py-3.5 font-bold ${r.statusLokasi === 'VALID' ? 'text-emerald-600' : 'text-rose-500'}`}>{formatDistance(r.jarakMeter)}</td>
                    <td className="px-3 py-3.5 text-slate-600">{filled}/{PRODUCTS.length}</td>
                    <td className="px-5 py-3.5">
                      <span className="mx-auto w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Check size={15} /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ResultDetailModal row={detail} onClose={closeDetail} />
    </div>
  );
}

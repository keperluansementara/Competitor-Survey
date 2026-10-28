import React, { useMemo } from 'react';
import { BarChart3, CheckCircle2, MapPin, Tag, Target, Users, XCircle } from 'lucide-react';
import { PRODUCT_CATEGORIES, PRODUCTS } from '../config';
import { formatRupiah } from '../lib';
import { PageTitle } from '../components/ui';

export default function Dashboard({ customers, results }) {
  // Satu toko bisa disurvei ulang — pakai hasil terbaru per ID untuk progres & harga
  const latest = useMemo(() => {
    const m = new Map();
    results.forEach((r) => m.set(r.idPelanggan, r));
    return [...m.values()];
  }, [results]);

  // KPI progres hanya menghitung toko yang ada di master (abaikan ID uji / toko di luar target)
  const inMaster = useMemo(() => {
    const ids = new Set(customers.map((c) => c.id));
    return latest.filter((r) => ids.has(r.idPelanggan));
  }, [customers, latest]);
  const total = customers.length;
  const done = inMaster.length;
  const valid = inMaster.filter((r) => r.statusLokasi === 'VALID').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const perKec = useMemo(() => {
    const doneIds = new Set(latest.map((r) => r.idPelanggan));
    const m = {};
    customers.forEach((c) => {
      m[c.kecamatan] ??= { total: 0, done: 0 };
      m[c.kecamatan].total++;
      if (doneIds.has(c.id)) m[c.kecamatan].done++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }, [customers, latest]);

  // Market share by unit (Qty) per kategori + statistik harga per unit
  const shareByCat = useMemo(() => {
    const stats = PRODUCTS.map((p) => {
      const its = latest.map((r) => r.items?.[p.key]).filter(Boolean);
      const qtys = its.map((it) => Number(it.qty) || 0);
      const prices = its.map((it) => Number(it.harga)).filter((v) => v > 0);
      return {
        ...p,
        outlets: qtys.filter((q) => q > 0).length,
        qty: qtys.reduce((a, b) => a + b, 0),
        avg: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length ? Math.max(...prices) : null,
      };
    });
    return PRODUCT_CATEGORIES.map((cat) => {
      const list = stats.filter((s) => s.cat === cat).sort((a, b) => b.qty - a.qty);
      const total = list.reduce((a, s) => a + s.qty, 0);
      return { cat, total, list: list.map((s) => ({ ...s, share: total ? (s.qty / total) * 100 : 0 })) };
    });
  }, [latest]);

  const perSurveyor = useMemo(() => {
    const m = {};
    results.forEach((r) => (m[r.surveyor || '-'] = (m[r.surveyor || '-'] || 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [results]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageTitle icon={BarChart3} title="Dashboard Overview" subtitle="Ringkasan progres survei kompetitor" />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Target} value={total} label="Total Target" tone="slate" />
        <Kpi icon={CheckCircle2} value={done} label="Tersurvei" tone="emerald" badge={`${pct}%`} />
        <Kpi icon={MapPin} value={valid} label="Lokasi Valid" tone="violet" />
        <Kpi icon={XCircle} value={done - valid} label="Luar Radius" tone="rose" />
      </div>

      <Panel icon={MapPin} title="Progres per Kecamatan">
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-5">
          {perKec.map(([kec, v]) => {
            const p = v.total ? Math.round((v.done / v.total) * 100) : 0;
            return (
              <div key={kec}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-slate-800 uppercase">{kec}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5">{v.done} / {v.total} ({p}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel icon={Tag} title="Market Share by Unit (Qty) & Harga per Unit — hasil terbaru per toko">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase text-left border-b">
                <th className="py-2 pr-3">Produk</th>
                <th className="py-2 px-3 text-right">Total Qty</th>
                <th className="py-2 px-3">Market Share (Qty)</th>
                <th className="py-2 px-3 text-right">Outlet</th>
                <th className="py-2 px-3 text-right">Harga Rata-rata</th>
                <th className="py-2 pl-3 text-right">Min – Max</th>
              </tr>
            </thead>
            {shareByCat.map(({ cat, total, list }) => (
              <tbody key={cat} className="divide-y divide-slate-100">
                <tr className="bg-slate-50">
                  <td className="py-2 pr-3 pl-2 text-[11px] font-black tracking-widest text-slate-500 uppercase">{cat}</td>
                  <td className="py-2 px-3 text-right text-xs font-bold text-slate-500 tabular-nums">{total.toLocaleString('id-ID')}</td>
                  <td colSpan={4} className="py-2 px-3 text-[11px] text-slate-400">share dihitung dari total Qty kategori {cat}</td>
                </tr>
                {list.map((s, i) => (
                  <tr key={s.key}>
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-slate-800">{s.label}</div>
                      <div className="text-[10px] text-slate-400">per {s.unit}</div>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">{s.qty.toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${i === 0 && s.qty ? 'bg-blue-600' : 'bg-blue-300'}`} style={{ width: `${s.share}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 tabular-nums w-12">{s.share.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600 tabular-nums">{s.outlets}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">{formatRupiah(s.avg)}</td>
                    <td className="py-2 pl-3 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {s.min == null ? '-' : `${formatRupiah(s.min)} – ${formatRupiah(s.max)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Panel>

      <Panel icon={Users} title="Produktivitas Surveyor">
        {!perSurveyor.length ? <div className="text-sm text-slate-400">Belum ada data.</div> : (
          <div className="space-y-3">
            {perSurveyor.map(([name, n]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-40 truncate text-sm font-semibold text-slate-700">{name}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(n / perSurveyor[0][1]) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-900 w-10 text-right">{n}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

const TONES = {
  slate: ['bg-slate-100 text-slate-600', 'text-slate-900', 'border-slate-200', 'bg-slate-50'],
  emerald: ['bg-emerald-100 text-emerald-600', 'text-emerald-600', 'border-emerald-200', 'bg-emerald-50'],
  violet: ['bg-violet-100 text-violet-600', 'text-violet-600', 'border-violet-200', 'bg-violet-50'],
  rose: ['bg-rose-100 text-rose-600', 'text-rose-600', 'border-rose-200', 'bg-rose-50'],
};

function Kpi({ icon: Icon, value, label, tone, badge }) {
  const [iconCls, valCls, border, blob] = TONES[tone];
  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl border ${border} p-5 shadow-sm`}>
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full ${blob}`} />
      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${iconCls}`}><Icon size={20} /></div>
      {badge && <span className="absolute top-5 right-5 text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md px-1.5 py-0.5">{badge}</span>}
      <div className={`relative mt-4 text-3xl font-black ${valCls}`}>{value.toLocaleString('id-ID')}</div>
      <div className="relative text-[10px] font-extrabold tracking-widest text-slate-500 uppercase mt-1">{label}</div>
    </div>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-widest text-slate-700 uppercase mb-5">
        <Icon size={15} className="text-blue-500" /> {title}
      </div>
      {children}
    </section>
  );
}

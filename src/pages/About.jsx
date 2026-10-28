import React from 'react';
import { Camera, CloudOff, Crosshair, Map, PenLine, ShieldCheck, Tag, User } from 'lucide-react';
import { APP_NAME, APP_TAGLINE, APP_VERSION, DEVELOPER } from '../config';
import { Logo } from '../components/ui';

const FEATURES = [
  [Map, 'Global Map & Cluster', 'Visualisasi seluruh titik toko dengan ribuan marker dalam satu peta interaktif yang ringan, lengkap dengan mode satelit.'],
  [Crosshair, 'Smart Location Validation', 'Validasi jarak otomatis memakai algoritma Haversine untuk mencegah manipulasi lokasi saat survei.'],
  [CloudOff, 'Offline Draft Sync', 'Bisa survei di daerah tanpa sinyal. Data tersimpan di Outbox HP dan otomatis tersinkron saat online.'],
  [Camera, 'Auto-Watermark Foto', 'Setiap foto bukti dicap koordinat, waktu, nama toko, dan surveyor langsung dari kamera.'],
  [PenLine, 'Digital Signature', 'Tanda tangan pemilik/PIC toko langsung di layar sebagai bukti kunjungan.'],
  [Tag, 'Market Share & Harga', 'Rekap pengambilan (Qty) dan harga per unit 16 produk kompetitor di outlet terpilih, lengkap dengan market share per kategori.'],
];

export default function About() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="relative h-40 bg-gradient-to-r from-blue-600 to-cyan-500">
          <div className="absolute top-5 right-5 flex gap-2">
            <span className="text-[10px] font-extrabold tracking-wider bg-slate-900/80 text-white rounded-full px-3 py-1">INTERNAL USE ONLY</span>
            <span className="text-[10px] font-extrabold tracking-wider bg-white/20 text-white border border-white/50 rounded-full px-3 py-1">VERSI {APP_VERSION}</span>
          </div>
        </div>
        <div className="px-6 sm:px-10 pb-10">
          <div className="-mt-14 inline-flex p-3 bg-white rounded-3xl shadow-lg">
            <Logo size="lg" />
          </div>
          <h1 className="mt-6 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">APLIKASI SURVEI KOMPETITOR</h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Sistem informasi berbasis <b>Geographic Information System (GIS)</b> untuk memetakan toko, memvalidasi lokasi kunjungan,
            dan mengumpulkan <b>pengambilan (Qty), harga per unit, serta promosi produk kompetitor</b> di outlet terpilih untuk
            membaca market share secara internal. Aplikasi ini terintegrasi dengan
            <b> Google Workspace (Google Sheets & Drive)</b> sebagai database cloud sehingga data dari surveyor langsung tersedia bagi
            tim back-office tanpa delay.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><ShieldCheck /></div>
              <div>
                <div className="text-[10px] font-extrabold tracking-widest text-slate-400">PROJECT NAME</div>
                <div className="font-bold text-slate-900">{APP_NAME} {APP_TAGLINE}</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center"><User /></div>
              <div>
                <div className="text-[10px] font-extrabold tracking-widest text-blue-400">DEVELOPED & DESIGNED BY</div>
                <div className="font-black text-blue-900 uppercase">{DEVELOPER}</div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <div className="text-[11px] font-extrabold tracking-widest text-slate-500 mb-4">KEUNGGULAN & FITUR UTAMA SISTEM</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(([Icon, title, desc]) => (
                <div key={title} className="border border-slate-200 rounded-2xl p-5 hover:border-blue-200 hover:bg-blue-50/30 transition">
                  <div className="flex items-start gap-3">
                    <Icon size={18} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-black text-slate-900 uppercase">{title}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

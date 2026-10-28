import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, ChevronLeft, Crosshair, Navigation, Send } from 'lucide-react';
import { MAX_DISTANCE_M, PRODUCT_CATEGORIES, PRODUCTS } from '../config';
import { formatDateTime, getCurrentPosition, gmapsRoute, haversine, postToGas, surveyorsForDepo, uuid, watermarkImage } from '../lib';
import { MiniMap, SignaturePad } from '../components/ui';

const makeInitialForm = () => ({
  items: Object.fromEntries(PRODUCTS.map((p) => [p.key, { qty: '', harga: '' }])),
  promosi: '',
  catatan: '',
  alasanLokasi: '',
});

const Card = ({ children, className = '' }) => (
  <section className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm ${className}`}>{children}</section>
);

export default function SurveyForm({ customer, surveyor, setSurveyor, surveyors = [], online, onClose, onSubmitted }) {
  // Dropdown bila admin sudah mengisi tab "Surveyor"; jika kosong → input teks bebas (perilaku lama)
  const nameOptions = useMemo(() => surveyorsForDepo(surveyors, customer.workplace), [surveyors, customer.workplace]);
  const useDropdown = nameOptions.length > 0;
  // Nama tersimpan yang tidak ada di daftar dianggap belum dipilih (mencegah nama lama/typo ikut terkirim)
  const surveyorName = useDropdown ? (nameOptions.includes(surveyor) ? surveyor : '') : surveyor.trim();
  const [formData, setFormData] = useState(makeInitialForm);
  const [gps, setGps] = useState(null); // {lat, lng, acc}
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [foto, setFoto] = useState('');
  const [fotoLoading, setFotoLoading] = useState(false);
  const [ttd, setTtd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasMaster = customer.lat != null && customer.lng != null;
  const distance = useMemo(
    () => (gps && hasMaster ? Math.round(haversine(gps.lat, gps.lng, customer.lat, customer.lng)) : null),
    [gps, hasMaster, customer]
  );
  const statusLokasi = !gps ? '' : !hasMaster ? 'MASTER TANPA KOORDINAT' : distance <= MAX_DISTANCE_M ? 'VALID' : 'DI LUAR RADIUS';
  const outOfRange = statusLokasi === 'DI LUAR RADIUS';

  const getLocation = () => {
    setGpsLoading(true);
    setGpsError('');
    getCurrentPosition()
      .then(setGps)
      .catch((err) => setGpsError(err.message))
      .finally(() => setGpsLoading(false));
  };

  useEffect(getLocation, []);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!gps) return alert('Ambil lokasi GPS terlebih dahulu sebelum memotret.');
    if (!surveyorName) return alert('Isi Nama Surveyor terlebih dahulu — nama dicetak di watermark foto.');
    setFotoLoading(true);
    try {
      const b64 = await watermarkImage(file, [
        `TOKO: ${customer.nama} (${customer.id})`,
        `WAKTU: ${formatDateTime()}`,
        `KOORDINAT: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)} (Akurasi ±${gps.acc}m${distance != null ? `, Jarak: ${distance} m` : ''})`,
        `SURVEYOR: ${surveyorName}`,
      ]);
      setFoto(b64);
    } catch (err) {
      alert('Gagal memproses foto: ' + err.message);
    } finally {
      setFotoLoading(false);
    }
  };

  const setItem = (key, field, raw) => {
    const digits = raw.replace(/\D/g, '');
    setFormData((f) => ({ ...f, items: { ...f.items, [key]: { ...f.items[key], [field]: digits } } }));
  };

  const filledCount = PRODUCTS.filter((p) => formData.items[p.key].qty || formData.items[p.key].harga).length;
  const priceWithoutQty = PRODUCTS.filter((p) => formData.items[p.key].harga && !formData.items[p.key].qty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!surveyorName) return alert(useDropdown ? 'Pilih Nama Surveyor dari daftar.' : 'Nama Surveyor wajib diisi.');
    if (!gps) return alert('Lokasi GPS belum didapat.');
    if (outOfRange && !formData.alasanLokasi.trim())
      return alert(`Posisi Anda ${distance} m dari titik master (> ${MAX_DISTANCE_M} m). Isi alasan lokasi.`);
    if (filledCount === 0 && !formData.catatan.trim())
      return alert('Isi minimal 1 produk (Qty/Harga), atau tulis catatan jika toko tidak menjual produk apa pun.');
    if (priceWithoutQty.length)
      return alert(`Qty belum diisi untuk: ${priceWithoutQty.map((p) => p.label).join(', ')}. Isi Qty (boleh 0).`);
    if (!foto) return alert('Foto bukti wajib diambil.');
    if (!ttd) return alert('Tanda tangan wajib diisi.');

    // ---- Mapping payload JSON (urutan field dipetakan ulang di Code.gs → rowData) ----
    const payload = {
      submissionId: uuid(),
      tglSurvei: formatDateTime(),
      surveyor: surveyorName,
      region: customer.region,
      workplace: customer.workplace,
      idPelanggan: customer.id,
      namaPelanggan: customer.nama,
      channel: customer.channel,
      alamat: customer.alamat,
      kecamatan: customer.kecamatan,
      kelurahan: customer.kelurahan,
      latMaster: customer.lat ?? '',
      longMaster: customer.lng ?? '',
      latAktual: gps.lat,
      longAktual: gps.lng,
      akurasiGps: gps.acc,
      jarakMeter: distance ?? '',
      statusLokasi,
      alasanLokasi: formData.alasanLokasi.trim(),
      items: Object.fromEntries(
        PRODUCTS.map((p) => {
          const { qty, harga } = formData.items[p.key];
          return [p.key, { qty: qty === '' ? '' : Number(qty), harga: harga === '' ? '' : Number(harga) }];
        })
      ),
      promosi: formData.promosi.trim(),
      catatan: formData.catatan.trim(),
      foto,
      ttd,
    };

    setSubmitting(true);
    let status = 'pending';
    if (navigator.onLine) {
      try {
        await postToGas(payload);
        status = 'sent';
      } catch (err) {
        console.warn('Kirim gagal, masuk Outbox:', err);
      }
    }
    setSubmitting(false);
    onSubmitted(payload, status);
  };

  const groups = PRODUCT_CATEGORIES;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Kembali ke daftar" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="font-black text-lg text-slate-900 truncate">{customer.nama}</div>
          <div className="text-xs text-slate-500 truncate">{customer.id} · {customer.channel} · {customer.workplace}</div>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <MiniMap lat={customer.lat} lng={customer.lng} height={160} maxWidth={700} />
        <div className="p-4 space-y-1 text-sm">
          <div className="text-slate-700">{customer.alamat}</div>
          <div className="text-xs text-slate-500">{customer.kelurahan}, {customer.kecamatan} · {customer.region}</div>
          {hasMaster && (
            <a href={gmapsRoute(customer.lat, customer.lng)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
              <Navigation size={14} /> Navigasi ke Toko (Google Maps)
            </a>
          )}
        </div>
      </Card>

      <Card>
        <label htmlFor="surveyor-name" className="block text-sm font-bold mb-1">Nama Surveyor *</label>
        {useDropdown ? (
          <>
            <select id="surveyor-name" value={nameOptions.includes(surveyor) ? surveyor : ''} onChange={(e) => setSurveyor(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Pilih nama Anda —</option>
              {nameOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <div className="text-[11px] text-slate-400 mt-1">Nama tidak ada di daftar? Hubungi admin untuk ditambahkan di tab "Surveyor".</div>
          </>
        ) : (
          <input id="surveyor-name" value={surveyor} onChange={(e) => setSurveyor(e.target.value)} placeholder="Nama lengkap"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}
      </Card>

      {/* GPS + Smart Validation */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Lokasi GPS *</span>
          <button type="button" onClick={getLocation} disabled={gpsLoading}
            className="inline-flex items-center gap-1 text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
            <Crosshair size={14} className={gpsLoading ? 'animate-spin' : ''} /> {gpsLoading ? 'Mencari…' : 'Perbarui'}
          </button>
        </div>
        {gpsError && <div className="text-xs text-rose-600">{gpsError}</div>}
        {gps && <div className="text-xs text-slate-600">{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (akurasi ±{gps.acc} m)</div>}
        {statusLokasi && (
          <div className={`flex items-center gap-2 text-sm font-bold rounded-xl px-3 py-2 ${
            statusLokasi === 'VALID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {statusLokasi === 'VALID' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {statusLokasi}{distance != null && ` · ${distance} m dari titik master`}
          </div>
        )}
        {outOfRange && (
          <textarea value={formData.alasanLokasi} rows={2}
            onChange={(e) => setFormData((f) => ({ ...f, alasanLokasi: e.target.value }))}
            placeholder="Alasan posisi di luar radius (mis. toko pindah, titik master salah) *"
            className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm" />
        )}
      </Card>

      {/* Harga produk kompetitor */}
      <Card className="space-y-3">
        <div>
          <div className="text-sm font-bold">Pengambilan & Harga Produk Kompetitor</div>
          <div className="text-xs text-slate-500">
            Isi <b>Qty</b> (total pengambilan dalam satuan Ball/Karton) dan <b>Harga per unit</b>. Kosongkan jika produk tidak dijual.
            ({filledCount}/{PRODUCTS.length} terisi)
          </div>
        </div>
        {groups.map((g) => (
          <div key={g}>
            <div className="flex items-center text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
              <span className="flex-1">{g}</span>
              <span className="w-20 text-center">Qty</span>
              <span className="w-32 sm:w-36 text-center ml-2">Harga/Unit</span>
            </div>
            <div className="divide-y divide-slate-100">
              {PRODUCTS.filter((p) => p.cat === g).map((p) => {
                const it = formData.items[p.key];
                const missingQty = it.harga && !it.qty;
                return (
                  <div key={p.key} className="flex items-center gap-2 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight line-clamp-2">{p.label}</div>
                      <div className="text-[11px] text-slate-400">per {p.unit}</div>
                    </div>
                    <input inputMode="numeric" value={it.qty} onChange={(e) => setItem(p.key, 'qty', e.target.value)} placeholder="0"
                      aria-label={`Qty ${p.label}`}
                      className={`w-20 border rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        missingQty ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`} />
                    <div className="relative w-32 sm:w-36">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input inputMode="numeric" value={it.harga ? Number(it.harga).toLocaleString('id-ID') : ''}
                        onChange={(e) => setItem(p.key, 'harga', e.target.value)} placeholder="0" aria-label={`Harga ${p.label}`}
                        className="w-full border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <div>
          <label className="block text-sm font-bold mb-1">Keterangan Promosi Kompetitor</label>
          <textarea rows={3} value={formData.promosi}
            onChange={(e) => setFormData((f) => ({ ...f, promosi: e.target.value }))}
            placeholder="Mis. Teh Gelas beli 10 karton gratis 1, potongan Rp 2.000/karton, hadiah langsung…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Catatan Tambahan</label>
          <textarea rows={2} value={formData.catatan}
            onChange={(e) => setFormData((f) => ({ ...f, catatan: e.target.value }))}
            placeholder="Kondisi toko, display, stok kosong, dll."
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        </div>
      </Card>

      {/* Foto + watermark */}
      <Card className="space-y-2">
        <div className="text-sm font-bold">Foto Bukti (auto-watermark) *</div>
        <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-3 text-sm font-semibold cursor-pointer ${
          gps ? 'border-blue-300 text-blue-700' : 'border-slate-200 text-slate-400 pointer-events-none'}`}>
          <Camera size={18} /> {fotoLoading ? 'Memproses…' : foto ? 'Ambil Ulang Foto' : 'Ambil Foto'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        </label>
        {!gps && <div className="text-xs text-slate-400">Kamera aktif setelah GPS didapat.</div>}
        {foto && <img src={foto} alt="Foto bukti" className="w-full rounded-xl" />}
      </Card>

      <Card className="space-y-2">
        <div className="text-sm font-bold">Tanda Tangan *</div>
        <SignaturePad value={ttd} onChange={setTtd} />
      </Card>

      <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white/95 backdrop-blur border-t border-slate-200 p-3 z-20">
        <button type="submit" disabled={submitting}
          className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold tracking-wide py-3 rounded-xl shadow-lg shadow-blue-600/30 disabled:opacity-50">
          <Send size={18} /> {submitting ? 'MENGIRIM…' : online ? 'KIRIM SURVEI' : 'SIMPAN KE OUTBOX (OFFLINE)'}
        </button>
      </div>
    </form>
  );
}

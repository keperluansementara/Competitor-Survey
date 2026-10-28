import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { formatDateTime, postToGas } from '../lib';
import { PageTitle } from '../components/ui';

export default function Feedback({ role, surveyor }) {
  const [nama, setNama] = useState(surveyor || '');
  const [kategori, setKategori] = useState('Saran');
  const [pesan, setPesan] = useState('');
  const [state, setState] = useState(''); // '' | sending | sent | error

  const submit = async (e) => {
    e.preventDefault();
    if (!pesan.trim()) return;
    setState('sending');
    try {
      await postToGas({ type: 'feedback', waktu: formatDateTime(), nama: nama.trim(), role, kategori, pesan: pesan.trim() });
      setState('sent');
      setPesan('');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageTitle icon={MessageSquare} title="Feedback" subtitle="Kirim saran, laporan bug, atau kendala lapangan" />
      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nama</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Anda"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Kategori</label>
            <select value={kategori} onChange={(e) => setKategori(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Saran', 'Bug / Error', 'Data Master Salah', 'Lainnya'].map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Pesan *</label>
          <textarea rows={6} value={pesan} onChange={(e) => { setPesan(e.target.value); setState(''); }}
            placeholder="Tuliskan masukan Anda…"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {state === 'sent' && <div className="text-sm font-semibold text-emerald-600">Terima kasih! Feedback berhasil dikirim.</div>}
        {state === 'error' && <div className="text-sm font-semibold text-rose-600">Gagal mengirim. Pastikan Anda online lalu coba lagi.</div>}
        <button type="submit" disabled={!pesan.trim() || state === 'sending'}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold tracking-wider py-3 rounded-xl disabled:opacity-50">
          <Send size={16} /> {state === 'sending' ? 'MENGIRIM…' : 'KIRIM FEEDBACK'}
        </button>
      </form>
    </div>
  );
}

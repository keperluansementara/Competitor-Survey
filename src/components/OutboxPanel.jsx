import React, { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';

/** Banner Outbox: jumlah survei tertunda, tombol Sync, dan daftar item yang bisa dicek/dihapus. */
export default function OutboxPanel({ outbox, online, syncing, onSync, onRemove }) {
  const [open, setOpen] = useState(false);
  if (!outbox.length) return null;

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-sm">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="flex-1">{outbox.length} survei tersimpan di Outbox (belum terkirim).</span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline">
          {open ? 'Tutup' : 'Lihat'} <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
        </button>
        <button type="button" onClick={onSync} disabled={!online || syncing}
          className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
          {syncing ? 'Sync…' : 'Sync Sekarang'}
        </button>
      </div>
      {open && (
        <ul className="border-t border-amber-200 divide-y divide-amber-100">
          {outbox.map((o) => (
            <li key={o.submissionId} className="flex items-center gap-3 px-4 py-2">
              {o.foto && <img src={o.foto} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{o.namaPelanggan}</div>
                <div className="text-xs text-amber-700">{o.tglSurvei} · {o.surveyor}</div>
                {o.lastError && <div className="text-xs text-rose-600 truncate">Gagal terakhir: {o.lastError}</div>}
              </div>
              <button type="button" onClick={() => onRemove(o)} aria-label={`Hapus ${o.namaPelanggan} dari Outbox`}
                className="p-2 rounded-lg text-rose-600 hover:bg-rose-50">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

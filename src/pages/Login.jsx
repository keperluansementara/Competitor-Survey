import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { APP_NAME, PINS } from '../config';
import { Logo } from '../components/ui';

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const role = PINS[pin];
    if (!role) {
      setError('PIN salah. Silakan coba lagi.');
      setPin('');
      return;
    }
    onLogin(role);
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200 overflow-hidden border border-slate-100">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-cyan-500" />
        <div className="px-8 sm:px-10 pb-10 -mt-12 text-center">
          <div className="inline-flex p-2 bg-white rounded-2xl shadow-md">
            <Logo size="lg" />
          </div>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900">LOGIN SISTEM SURVEI</h1>
          <div className="text-xs font-bold tracking-[0.2em] text-slate-400 mt-1">{APP_NAME.toUpperCase()} · INTERNAL USE ONLY</div>

          <label className="block mt-8 text-[11px] font-extrabold tracking-widest text-slate-600">MASUKKAN PIN AKSES</label>
          <div className="relative mt-2">
            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} autoFocus
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-12 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <div className="mt-2 text-sm text-rose-600 font-semibold">{error}</div>}
          <button type="submit" disabled={!pin}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold tracking-wider py-3.5 rounded-2xl shadow-lg shadow-blue-600/30 disabled:opacity-50">
            MASUK APLIKASI
          </button>
          <div className="mt-8 pt-5 border-t border-slate-100 text-[11px] text-slate-400">
            Hubungi admin untuk mendapatkan PIN akses Surveyor / Admin.
          </div>
        </div>
      </form>
    </div>
  );
}

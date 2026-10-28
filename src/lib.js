import Papa from 'papaparse';
import { CSV_URL, GAS_URL, MASTER_COLS, PHOTO_MAX_SIZE, PHOTO_QUALITY, PRODUCTS } from './config';

// ============================================================================
// STORAGE
// ============================================================================
export const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
export const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('LocalStorage penuh / tidak tersedia', e);
    return false;
  }
};

// ============================================================================
// FORMAT & GEO
// ============================================================================
const pick = (row, aliases) => {
  for (const a of aliases) if (row[a] !== undefined) return String(row[a]).trim();
  return '';
};
export const toNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Rumus Haversine — jarak dua koordinat dalam meter. */
export const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const pad = (n) => String(n).padStart(2, '0');
export const formatDateTime = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const formatRupiah = (v) => (v || v === 0 ? 'Rp ' + Number(v).toLocaleString('id-ID') : '-');
/** Item produk {qty, harga} → apakah terisi, dan format "10/100.000" seperti di sheet. */
export const itemFilled = (it) => !!it && ((it.qty !== '' && it.qty != null) || (it.harga !== '' && it.harga != null));
export const formatItem = (it) =>
  itemFilled(it) ? `${it.qty === '' || it.qty == null ? 0 : it.qty}/${it.harga ? Number(it.harga).toLocaleString('id-ID') : '-'}` : '-';
export const formatDistance = (m) => (m == null || m === '' ? '-' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} meter`);
export const uuid = () =>
  (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const gmapsRoute = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Ambil ID file dari URL Google Drive lalu buat URL thumbnail. */
export const driveThumb = (url, size = 600) => {
  const m = String(url || '').match(/\/d\/([\w-]+)/) || String(url || '').match(/[?&]id=([\w-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w${size}` : url || '';
};

export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Perangkat tidak mendukung GPS'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (err) => reject(new Error(err.message || 'Gagal mengambil lokasi')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });

// ============================================================================
// FOTO + WATERMARK
// ============================================================================
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Auto-Watermark: resize foto, cap teks (koordinat, waktu, user) ke kanvas, kembalikan Base64 JPEG. */
export const watermarkImage = async (file, lines) => {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const fontSize = Math.max(14, Math.round(w / 38));
    const lineH = Math.round(fontSize * 1.35);
    const padding = Math.round(fontSize * 0.6);
    const boxH = lines.length * lineH + padding * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, h - boxH, w, boxH);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    lines.forEach((t, i) => ctx.fillText(t, padding, h - boxH + padding + i * lineH, w - padding * 2));
    return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
};

// ============================================================================
// DATA: MASTER CSV + API GAS
// ============================================================================
export const loadMaster = () =>
  new Promise((resolve, reject) => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: ({ data }) =>
        resolve(
          data
            .map((r) => ({
              region: pick(r, MASTER_COLS.region),
              workplace: pick(r, MASTER_COLS.workplace),
              id: pick(r, MASTER_COLS.id),
              nama: pick(r, MASTER_COLS.nama),
              channel: pick(r, MASTER_COLS.channel),
              alamat: pick(r, MASTER_COLS.alamat),
              kecamatan: pick(r, MASTER_COLS.kecamatan) || 'TANPA KECAMATAN',
              kelurahan: pick(r, MASTER_COLS.kelurahan),
              lat: toNum(pick(r, MASTER_COLS.lat)),
              lng: toNum(pick(r, MASTER_COLS.lng)),
            }))
            .filter((r) => r.id || r.nama)
        ),
      error: reject,
    });
  });

// Batas waktu request: sinyal lapangan sering "nyangkut" tanpa error — lebih baik gagal lalu masuk Outbox.
// POST yang timeout tapi sebenarnya tersimpan aman di-retry karena server menolak submissionId ganda.
const POST_TIMEOUT_MS = 60000;
const GET_TIMEOUT_MS = 30000;

const fetchJson = async (url, options, timeoutMs) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Koneksi timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

/** POST ke GAS. text/plain dipakai agar tidak memicu CORS preflight. */
export const postToGas = async (payload) => {
  const json = await fetchJson(
    GAS_URL,
    { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) },
    POST_TIMEOUT_MS
  );
  if (json.status !== 'success') throw new Error(json.message || 'Gagal menyimpan');
  return json;
};

/** Ambil semua hasil survei dari Tab "Report Hasil Survei" (tanpa Base64, hanya link Drive). */
export const fetchResults = async () => {
  const json = await fetchJson(`${GAS_URL}?action=results`, {}, GET_TIMEOUT_MS);
  if (json.status !== 'success') throw new Error(json.message || 'Gagal memuat hasil');
  return json.data;
};

/** Daftar surveyor dari tab "Surveyor" ([{nama, workplace}]). Endpoint lama/belum ada → []. */
export const fetchSurveyors = async () => {
  const json = await fetchJson(`${GAS_URL}?action=surveyors`, {}, GET_TIMEOUT_MS);
  return json.status === 'success' && Array.isArray(json.data) ? json.data : [];
};

/** Nama surveyor untuk satu depo; surveyor tanpa Workplace berlaku untuk semua depo. */
export const surveyorsForDepo = (list, workplace) => {
  const match = list.filter((s) => !s.workplace || s.workplace === workplace);
  return [...new Set((match.length ? match : list).map((s) => s.nama))].sort((a, b) => a.localeCompare(b));
};

// ============================================================================
// OUTBOX & PENCARIAN (fungsi murni — diuji di tests/lib.test.js)
// ============================================================================
/**
 * Hitung isi Outbox setelah Sync. Dibaca ulang dari isi Outbox *terkini* (bukan snapshot awal Sync)
 * supaya survei yang disimpan saat Sync berjalan tidak tertimpa/hilang.
 */
export const outboxAfterSync = (current, sentIds, errors = {}) =>
  current
    .filter((o) => !sentIds.has(o.submissionId))
    .map((o) => (errors[o.submissionId] ? { ...o, lastError: errors[o.submissionId] } : o));

/** Filter status survei: 'all' | 'belum' (belum ada status) | 'selesai' (terkirim atau di Outbox). */
export const matchStatus = (status, filter) => filter === 'all' || (filter === 'belum' ? !status : !!status);

export const matchCustomer = (c, search) => {
  const s = (search || '').toLowerCase();
  return !s || [c.nama, c.id, c.alamat, c.kelurahan, c.kecamatan].some((v) => String(v || '').toLowerCase().includes(s));
};

/** Cegah CSV/formula injection saat file dibuka di Excel/Sheets (nilai teks diawali = + - @). */
export const csvSafe = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export const exportResultsCsv = (rows) => {
  const data = rows.map((r) => ({
    'Tgl Survei': r.tglSurvei,
    'Nama Surveyor': r.surveyor,
    Region: r.region,
    Workplace: r.workplace,
    'ID Pelanggan': r.idPelanggan,
    'Nama Pelanggan': r.namaPelanggan,
    Channel: r.channel,
    Kecamatan: r.kecamatan,
    Kelurahan: r.kelurahan,
    'Lat Master': r.latMaster,
    'Long Master': r.longMaster,
    'Lat Aktual': r.latAktual,
    'Long Aktual': r.longAktual,
    'Jarak Validasi (m)': r.jarakMeter,
    'Status Lokasi': r.statusLokasi,
    'Alasan Lokasi': r.alasanLokasi,
    ...Object.fromEntries(
      PRODUCTS.flatMap((p) => [
        [`${p.key} (Qty)`, r.items?.[p.key]?.qty ?? ''],
        [`${p.key} (Harga/Unit)`, r.items?.[p.key]?.harga ?? ''],
      ])
    ),
    'Promosi Kompetitor': r.promosi,
    Catatan: r.catatan,
    'Foto Bukti': r.foto,
    TTD: r.ttd,
  }));
  const csv = Papa.unparse(data.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, csvSafe(v)]))));
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `competitor-survey_${formatDateTime().slice(0, 10)}.csv`;
  a.click();
  // Revoke ditunda: sebagian browser membatalkan unduhan jika URL dicabut di tick yang sama
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

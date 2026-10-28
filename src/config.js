// ============================================================================
// KONFIGURASI PROJECT (Competitor-Survey)
// ============================================================================
export const APP_NAME = 'Competitor-Survey';
export const APP_TAGLINE = 'by SHP';
export const APP_VERSION = '1.0.0';
export const DEVELOPER = 'Suryo Hadi Prakoso';

export const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTYVBH5CNoUuUfDOMYvJLjk2koCO3CFPcc7nPjDdc-VnLBWbI0yykTAYy1tgLwWiUSXl64SIvUAG5rE/pub?output=csv';

// URL Web App hasil Deploy Code.gs. Bisa juga diisi lewat env VITE_GAS_URL saat build.
export const GAS_URL =
  import.meta.env.VITE_GAS_URL ||
  'https://script.google.com/macros/s/AKfycbyuNaMJuwaa_6wlhqkl-CwzAFQbRF7hofGnKNwRFUr7GjgVlG08sx6FE7ymGfxucVTcGQ/exec';
export const GAS_READY = !GAS_URL.includes('GANTI_DENGAN');

// PIN akses per role. Ganti sebelum dipakai di lapangan.
// Catatan: PIN dicek di sisi browser — ini pembatas akses menu, bukan pengamanan data.
export const PINS = {
  '1234': 'surveyor',
  '9999': 'admin',
};

// Halaman yang boleh dibuka tiap role (urutan di sini tidak berpengaruh; urutan menu mengikuti sidebar).
// Kunci halaman: list, map, gallery, sukses, dashboard, about, feedback
// Menambah role baru: tambahkan PIN di PINS (mis. '5555': 'supervisor') lalu daftar halamannya di sini.
export const ROLE_ACCESS = {
  surveyor: ['list', 'map', 'sukses', 'about', 'feedback'],
  admin: ['list', 'map', 'gallery', 'sukses', 'dashboard', 'about', 'feedback'],
};

// Versi sesi diturunkan dari PINS: mengganti PIN otomatis memaksa semua perangkat login ulang.
export const SESSION_VERSION = [...JSON.stringify(PINS)].reduce((h, ch) => ((h * 31 + ch.charCodeAt(0)) | 0), 7).toString(36);

export const MAX_DISTANCE_M = 100; // radius toleransi GPS (meter) terhadap koordinat master
export const PHOTO_MAX_SIZE = 1280; // sisi terpanjang foto (px) setelah dikompres
export const PHOTO_QUALITY = 0.7;

export const LS_KEYS = {
  outbox: 'cs_outbox_v1',
  master: 'cs_master_cache_v1',
  results: 'cs_results_cache_v1',
  surveyor: 'cs_surveyor_name',
  done: 'cs_done_ids_v1',
  role: 'cs_role',
  depo: 'cs_depo',
  surveyors: 'cs_surveyors_cache_v1',
};

// Nama kolom di Master CSV (alias untuk toleransi typo header, mis. "ID Pelanngan")
export const MASTER_COLS = {
  region: ['Region'],
  workplace: ['Workplace'],
  id: ['ID Pelanggan', 'ID Pelanngan'],
  nama: ['Nama Pelanggan'],
  channel: ['Channel'],
  alamat: ['Alamat'],
  kecamatan: ['Kecamatan'],
  kelurahan: ['Kelurahan'],
  lat: ['Latitude', 'Lat'],
  lng: ['Longitude', 'Long', 'Lng'],
};

// Daftar produk kompetitor — `key` HARUS sama dengan PRODUCTS di Code.gs.
// Urutan array = urutan kolom harga di Tab "Report Hasil Survei" (jangan diubah urutannya).
// `cat` = grouping di form survei & market share Dashboard. Boleh diganti / ditambah kategori baru
// (mis. 'Biskuit'); urutan grup mengikuti kemunculan pertama kategori di daftar ini.
export const PRODUCTS = [
  { key: 'TICTAC PERBALL', label: 'TicTac', unit: 'Ball', cat: 'Snack' },
  { key: 'SUKRO OVEN PERBALL', label: 'Sukro Oven', unit: 'Ball', cat: 'Snack' },
  { key: 'ROMA MALKIST 1000 ALL SATUAN KARTON', label: 'Roma Malkist 1000 (All)', unit: 'Karton', cat: 'Snack' },
  { key: 'ASTOR SINGLE PERKARTON', label: 'Astor Single', unit: 'Karton', cat: 'Snack' },
  { key: 'FRENCH FRIES 2000 PERKARTON', label: 'French Fries 2000', unit: 'Karton', cat: 'Snack' },
  { key: 'TARO 2000 PERKARTON', label: 'Taro 2000', unit: 'Karton', cat: 'Snack' },
  { key: 'TEH RIO PERKARTON', label: 'Teh Rio', unit: 'Karton', cat: 'Minuman' },
  { key: 'TEH GELAS PERKARTON', label: 'Teh Gelas', unit: 'Karton', cat: 'Minuman' },
  { key: 'ALE-ALE PERKARTON', label: 'Ale-Ale', unit: 'Karton', cat: 'Minuman' },
  { key: 'LA VONTEA PERKARTON', label: 'La Vontea', unit: 'Karton', cat: 'Minuman' },
  { key: 'SEMESTA TEH 1000 PEKARTON', label: 'Semesta Teh 1000', unit: 'Karton', cat: 'Minuman' },
  { key: 'BONTEH MATCHA PERKARTON', label: 'Bonteh Matcha', unit: 'Karton', cat: 'Minuman' },
  { key: 'BENG-BENG DRINK PERKARTON', label: 'Beng-Beng Drink', unit: 'Karton', cat: 'Minuman' },
  { key: 'SUKRO PERBALL', label: 'Sukro', unit: 'Ball', cat: 'Snack' },
  { key: 'POTABEE PERKARTON', label: 'Potabee', unit: 'Karton', cat: 'Snack' },
  { key: 'OLALA PERKARTON', label: 'Olala', unit: 'Karton', cat: 'Minuman' },
];

export const PRODUCT_CATEGORIES = [...new Set(PRODUCTS.map((p) => p.cat))];

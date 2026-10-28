# Refactoring Log — Competitor-Survey

Tanggal: 2026-10-28 · Baseline: snapshot folder sebelum audit (project belum memakai Git).
Test yang dijalankan untuk setiap kelompok: `npm test` (20/20 lulus), `npm run build` (lulus), smoke test browser (lulus).

## Kelompok 1 — Integritas data Outbox & reliabilitas jaringan

| File | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| `src/App.jsx` | `syncOutbox` menyimpan `remaining` dari snapshot awal | Menghitung ulang dari Outbox **terkini** via `outboxAfterSync(lsGet(outbox), sentIds, errors)` | BUG-01: survei yang disimpan saat Sync berjalan hilang |
| `src/App.jsx` | Tidak ada guard | `syncingRef` mencegah 2 Sync bersamaan; `try/finally` menjamin state selalu dibersihkan | BUG-02 |
| `src/App.jsx` | `handleSubmitted` menambah ke `outbox` dari state (bisa basi) | Membaca Outbox & status lokal dari localStorage | Konsistensi dengan Sync |
| `src/lib.js` | `fetch` tanpa batas waktu | `fetchJson()` dengan AbortController (POST 60 s, GET 30 s) | BUG-03 |
| `src/components/OutboxPanel.jsx` (baru) | Banner hanya punya tombol Sync | Daftar item + error terakhir + hapus (dengan konfirmasi) | BUG-04 |

Dampak modul lain: item Outbox kini bisa membawa field `lastError` — hanya dipakai di UI, ikut terkirim ke server tetapi diabaikan Code.gs.
Breaking change: tidak ada.

## Kelompok 2 — Keamanan frontend

| File | Perubahan | Alasan |
|---|---|---|
| `src/lib.js` | `csvSafe()` diterapkan ke setiap sel export CSV; `revokeObjectURL` ditunda 1 s | SEC-04, BUG-07 |
| `src/config.js`, `src/App.jsx` | Role disimpan sebagai `{ role, v: SESSION_VERSION }`; versi diturunkan dari `PINS` | SEC-06: ganti PIN → semua sesi lama gugur |
| `vercel.json` (baru) | Header nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (geolocation & camera hanya self) | SEC-08 |

**Breaking change (disengaja):** format `cs_role` di localStorage berubah → semua pengguna login ulang satu kali setelah deploy.

## Kelompok 3 — Backend `gas/Code.gs`

| Sebelum | Sesudah | Alasan |
|---|---|---|
| `doPost` ±60 baris: parse, cek duplikat, upload, susun baris, tulis — seluruhnya di dalam lock | `doPost` ringkas → `validateSubmission_()` → cek duplikat → upload **di luar lock** → `withLock_()` cek duplikat ulang + `appendRow(buildRow_())`; file upload duplikat dibuang ke trash | PERF-03, keterbacaan, SEC-05 |
| `saveBase64ToDrive_` menerima MIME apa pun | Hanya `image/jpeg`/`image/png`, maks 5 MB, melempar error bila tidak valid; mengembalikan `{url, file}` | SEC-02 |
| Teks pengguna ditulis apa adanya | `text_()` menetralkan awalan `= + - @` dan membatasi 2.000 karakter; angka lewat `num_()` | SEC-03 |
| Feedback tanpa validasi | Pesan wajib, teks dinetralkan | SEC-03/05 |
| `r[17 + i]` | `PRODUCT_START = HEADERS.indexOf(PRODUCTS[0])` | Q-03 |
| `openById/getActive` diduplikasi | `openSpreadsheet_()` | DRY |
| `jsonOut` (tanpa underscore) | `jsonOut_`, `errorOut_`, `duplicateOut_` | Konsistensi helper privat Apps Script |
| Komentar menyebut tab "Hasil Survei" & `App.jsx` | Diperbarui ke "Report Hasil Survei" & `src/config.js`, plus cara update deployment | Dokumentasi usang |

Kontrak API: **tetap kompatibel** (endpoint, field request, bentuk respons sama). Perbedaan: payload tidak valid kini ditolak dengan
`{status:'error'}` — frontend selalu mengirim payload valid.

Butuh tindakan: redeploy Apps Script (*New version*).

## Kelompok 4 — Performa, UX & aksesibilitas

| File | Perubahan | Alasan |
|---|---|---|
| `src/App.jsx` | `React.lazy` untuk Map, Gallery, Toko Sukses, Dashboard, About, Feedback + `Suspense` | PERF-01: JS awal 424 KB → 221 KB; Leaflet (188 KB) hanya saat buka Peta |
| `src/components/ui.jsx` | `MiniMap` memuat tile yang beririsan dengan kotak tampilan (`tilesFor`), validasi koordinat, prop `height/maxWidth` | PERF-02, BUG-08 |
| `src/pages/SurveyForm.jsx` | Nama surveyor wajib sebelum foto; `label htmlFor`; aria-label tombol kembali | BUG-05, UX-02 |
| `src/components/ui.jsx` | Modal detail: `role="dialog"`, `aria-modal`, tutup dengan Escape; `Segmented` `aria-pressed`; `Empty` dipindah ke sini | UX-02, Q-02 |
| `src/pages/Gallery.jsx`, `TokoSukses.jsx` | Import `Empty` dari `ui`; `onClose` stabil (`useCallback`) untuk listener Escape | Q-02 |
| `src/App.jsx`, `ListValidasi.jsx` | aria-label tombol ikon, `aria-current` menu, `aria-live` toast, `type=search`; pencarian memakai `matchCustomer()` | UX-02, Q-01 |
| `index.html` | Hapus `maximum-scale=1` | UX-01 (pengguna bisa zoom) |

## Kelompok 5 — Dependency & test

| Perubahan | Alasan |
|---|---|
| Hapus `@google/clasp` | Tidak dipakai (Apps Script API akun tidak aktif; deploy manual) |
| Tambah `vitest@2.1.8` (dev) + script `npm test` | Belum ada test sama sekali; vitest memakai konfigurasi Vite yang sudah ada |
| `tests/lib.test.js` | Haversine, format Qty/Harga, `outboxAfterSync` (skenario race BUG-01), `csvSafe`, `driveThumb`, `matchCustomer`, `tilesFor` |
| `tests/gas.test.js` | Menjalankan `Code.gs` di Node: **kontrak urutan PRODUCTS frontend = backend**, format/parse sel, `text_`, `validateSubmission_`, posisi kolom `buildRow_` |

## Tindak lanjut

- Redeploy Apps Script & frontend (lihat Audit Report bagian 8).
- `git init` + commit baseline agar refactor berikutnya bisa ditinjau via diff.
- Pertimbangkan ESLint (`eslint-plugin-react-hooks`) untuk menangkap dependency hook yang keliru.

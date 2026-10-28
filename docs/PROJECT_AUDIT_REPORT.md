# Project Audit Report — Competitor-Survey

Tanggal audit: 2026-10-28 · Cakupan: seluruh source code & konfigurasi di folder project (tanpa `node_modules`, `dist`, `.vercel`).

## 1. Ringkasan

**Kondisi awal:** aplikasi sudah berjalan end-to-end (survei → Apps Script → Sheets/Drive, dashboard admin) dan sudah diuji manual. Namun ditemukan
1 bug kehilangan data (Outbox), 1 celah upload file publik, kontrol akses yang sepenuhnya di sisi browser, serta tidak adanya automated test.

**Hasil akhir:** 24 temuan diperbaiki (frontend + Code.gs), 9 dicatat belum diperbaiki, 20 automated test ditambahkan dan lulus, build lulus. Ukuran JavaScript awal turun
dari 424 KB → 221 KB. Temuan terbesar yang **belum** diperbaiki adalah kontrol akses sisi server (SEC-01) karena mengubah kontrak API dan
membutuhkan keputusan Anda.

> ⚠️ Perubahan **belum di-deploy** (sesuai instruksi audit). Lihat bagian 8 untuk langkah deploy.

## 2. Arsitektur saat ini

```
HP/Browser (React SPA, Vercel)                        Google (akun pemilik)
┌──────────────────────────────┐   GET pub CSV   ┌─────────────────────────────┐
│ Login PIN (client-side)      │ ──────────────▶ │ Sheet "Data" (master, publish)│
│ List / Map / Form survei     │                 │                             │
│ Outbox (localStorage)        │   POST JSON     │ Apps Script Web App (Code.gs)│
│ Gallery / Toko Sukses / Dash │ ──────────────▶ │  ├─ Sheet "Report Hasil Survei"│
│                              │ ◀────────────── │  ├─ Sheet "Feedback"          │
└──────────────────────────────┘ GET ?action=results  └─ Drive "Competitor-Survey Uploads"│
                                                 └─────────────────────────────┘
```

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18.3, Vite 5.4, Tailwind CSS 4.1, Leaflet 1.9 + markercluster, PapaParse, lucide-react |
| Backend | Google Apps Script (V8) Web App, "Execute as: Me", akses "Anyone" |
| Database | Google Sheets (master via CSV publish, hasil via Apps Script) |
| Storage | Google Drive (foto & TTD, dibagikan "anyone with link") |
| Hosting | Vercel (`competitor-survey.vercel.app`) |
| Auth | PIN per role, dicek di browser; role disimpan di localStorage |
| Offline | Outbox di localStorage + auto-sync saat online, master & hasil di-cache |

Arsitektur serverless ini **sesuai** untuk skala sekarang (±1.400 outlet, sedikit surveyor): murah, tanpa server, data langsung di Google Sheets
yang sudah dipakai tim. Batasannya adalah kuota Apps Script (±30 eksekusi bersamaan, 6 menit/eksekusi) dan Sheets sebagai database
(nyaman sampai puluhan ribu baris). Tidak ada alasan teknis untuk mengganti arsitektur saat ini.

## 3. Inventaris & cakupan audit

Semua 25 file source/konfigurasi yang ada diperiksa: **12 diubah**, **13 diaudit tanpa perubahan**, ditambah **7 file baru**
(`OutboxPanel.jsx`, `vercel.json`, 2 file test, 3 dokumen). Daftar ini dicocokkan dengan diff terhadap snapshot baseline.

| File | Status |
|---|---|
| `src/App.jsx` | Diubah (Outbox race, sync guard, sesi, lazy load, a11y) |
| `src/lib.js` | Diubah (timeout, CSV injection, helper Outbox & pencarian) |
| `src/config.js` | Diubah (SESSION_VERSION) |
| `src/components/ui.jsx` | Diubah (MiniMap, modal a11y, `Empty`) |
| `src/pages/SurveyForm.jsx` | Diubah (nama wajib sebelum foto, label a11y) |
| `src/pages/ListValidasi.jsx` | Diubah (helper pencarian bersama, aria-label) |
| `src/pages/Gallery.jsx`, `src/pages/TokoSukses.jsx` | Diubah (`Empty` dipindah, callback modal stabil) |
| `gas/Code.gs` | Diubah (validasi, upload aman, anti formula-injection, lock lebih sempit, refactor) |
| `index.html` | Diubah (zoom diizinkan) |
| `package.json` / `package-lock.json` | Diubah (hapus `@google/clasp`, tambah `vitest`, script `test`) |
| `src/components/OutboxPanel.jsx`, `vercel.json`, `tests/lib.test.js`, `tests/gas.test.js`, `docs/*` | Baru |
| `src/main.jsx`, `src/index.css`, `vite.config.js`, `src/pages/Login.jsx`, `src/pages/MapPage.jsx`, `src/pages/Dashboard.jsx`, `src/pages/About.jsx`, `src/pages/Feedback.jsx`, `src/pages/resultFilters.js`, `gas/appsscript.json`, `.gitignore`, `.vercelignore`, `.claude/launch.json` | Diaudit, tidak perlu diubah |

Repository ini **bukan Git repository**. Sebagai pengganti `git diff`, snapshot baseline disimpan di folder scratchpad sesi dan dibandingkan di
akhir audit. Disarankan menjalankan `git init` + commit agar perubahan berikutnya bisa ditinjau per-commit.

## 4. Temuan

Status: **Fixed** = diperbaiki di kode · **Not Fixed** = ditemukan, belum diperbaiki · Confirmed = terbukti dari kode/alur.

### Critical / High

| ID | File | Kategori | Sev | Evidence | Impact | Status |
|---|---|---|---|---|---|---|
| BUG-01 | `src/App.jsx` `syncOutbox` | Bug (data) | High | Sync menulis ulang Outbox dari *snapshot awal* (`lsSet(outbox, remaining)`), sementara `handleSubmitted` bisa menambah item saat loop `await` berjalan | Survei yang disimpan offline saat Sync berjalan **hilang permanen** | Confirmed · **Fixed** |
| SEC-02 | `gas/Code.gs` `saveBase64ToDrive_` | Security | High | MIME apa pun diterima (`data:text/html;base64,…`), lalu file di-share `ANYONE_WITH_LINK` | Endpoint publik bisa dipakai menyimpan & menyebarkan file sembarang dari Drive Anda | Confirmed · **Fixed** (perlu redeploy GAS) |
| SEC-01 | `src/config.js` `PINS`, `gas/Code.gs` `doGet/doPost` | Security / Auth | High | PIN ada di bundle JS; `?action=results` & `doPost` tidak memeriksa identitas | Siapa pun yang tahu URL Apps Script bisa membaca seluruh hasil survei (nama toko, koordinat, harga, link foto/TTD) dan menulis data | Confirmed · **Not Fixed** — butuh perubahan kontrak API (lihat Roadmap #1) |

### Medium

| ID | File | Kategori | Evidence → Perbaikan | Status |
|---|---|---|---|---|
| SEC-03 | `gas/Code.gs` | Security | Teks pengguna diawali `=` ditulis via `appendRow` → dieksekusi sebagai formula (mis. `=IMPORTXML` ke server luar). → `text_()` memberi apostrof & membatasi panjang | **Fixed** (redeploy GAS) |
| SEC-04 | `src/lib.js` `exportResultsCsv` | Security | Nilai `=…`, `+…`, `@…` di CSV dieksekusi Excel. → `csvSafe()` | **Fixed** |
| SEC-05 | `gas/Code.gs` `doPost` | Validasi | Tidak ada validasi server: baris tanpa ID, qty negatif, koordinat teks bisa masuk. → `validateSubmission_()` | **Fixed** (redeploy GAS) |
| SEC-07 | `gas/Code.gs` | Privacy | Foto & tanda tangan PIC toko dapat diakses siapa pun yang memegang link | **Not Fixed** — dibutuhkan untuk thumbnail; alternatif proxy via Apps Script (Roadmap) |
| BUG-02 | `src/App.jsx` | Bug | Event `online` + tombol Sync bisa menjalankan 2 loop bersamaan. → guard `syncingRef` | **Fixed** |
| BUG-03 | `src/lib.js` | Reliability | `fetch` tanpa timeout → tombol "MENGIRIM…" bisa menggantung di sinyal lemah. → timeout 60 s (POST) / 30 s (GET), lalu masuk Outbox | **Fixed** |
| BUG-04 | `src/App.jsx` | UX/Bug (regresi redesign) | Item Outbox tidak bisa dilihat/dihapus; item yang ditolak server dicoba ulang selamanya tanpa info. → `OutboxPanel` + `lastError` | **Fixed** |
| PERF-01 | build | Performance | 1 bundle 424 KB termasuk Leaflet. → lazy load halaman; JS awal 221 KB | **Fixed** |
| PERF-03 | `gas/Code.gs` | Performance | Upload Drive (langkah terlambat) di dalam global lock → submit bersamaan antre & bisa timeout 30 s. → upload di luar lock, cek duplikat ulang di dalam lock | **Fixed** (redeploy GAS) |
| PERF-04 | `gas/Code.gs` `readResults_` | Performance | Setiap refresh mengunduh semua baris (±1,5 KB/baris → ±2 MB pada 1.357 survei) | **Not Fixed** — belum jadi masalah; Roadmap #5 |

### Low

| ID | Ringkasan | Status |
|---|---|---|
| SEC-06 | Sesi tetap berlaku walau PIN diganti → `SESSION_VERSION` memaksa login ulang | **Fixed** |
| SEC-08 | Tidak ada security header → `vercel.json` (nosniff, DENY frame, Referrer-Policy, Permissions-Policy) | **Fixed** (aktif saat deploy berikutnya) |
| SEC-09 | Tidak ada rate limiting endpoint (hanya kuota Apps Script) | **Not Fixed** |
| BUG-05 | Watermark mencetak `SURVEYOR: -` bila nama diisi setelah foto → nama wajib sebelum foto | **Fixed** |
| BUG-06 | Timer toast saling memotong → satu timer | **Fixed** |
| BUG-07 | `revokeObjectURL` di tick yang sama dengan unduhan CSV → ditunda | **Fixed** |
| BUG-08 | MiniMap menghasilkan NaN untuk koordinat master tidak valid → divalidasi | **Fixed** |
| BUG-09 | Akurasi GPS tidak ikut validasi (±500 m tetap bisa "VALID") | **Not Fixed** — aturan bisnis, Roadmap #3 |
| BUG-10 | File Drive bisa yatim bila `appendRow` gagal setelah upload (jarang) | **Not Fixed** |
| PERF-02 | MiniMap selalu memuat 9 tile/kartu → hanya tile terlihat (3–6) | **Fixed** |
| PERF-05 | Tile `tile.openstreetmap.org` punya kebijakan pemakaian wajar; volume besar bisa diblokir | **Not Fixed** — catatan risiko |
| Q-01..05 | Duplikasi logika pencarian, import antar-halaman, indeks kolom hard-coded (`17`), `doPost` terlalu besar, komentar usang, dependency `@google/clasp` tidak terpakai | **Fixed** |
| Q-06 | Tidak ada lint/type check (JavaScript murni) | **Not Fixed** — Roadmap |
| Q-08 | Daftar `PRODUCTS` terduplikasi di `config.js` & `Code.gs` (beda runtime, tidak terhindarkan) | **Mitigated** — test kontrak menjamin sama |
| UX-01 | `maximum-scale=1` mencegah zoom (WCAG 1.4.4) | **Fixed** |
| UX-02 | Tombol ikon tanpa nama aksesibel, modal tanpa `role=dialog`/Escape, toast tanpa `aria-live` | **Fixed** |
| UX-03 | Validasi form memakai `alert()` | **Not Fixed** — fungsional, penyempurnaan |

## 5. Hasil pengujian (dijalankan nyata)

| Pemeriksaan | Hasil |
|---|---|
| Lint | **Not Applicable** — belum ada ESLint di project |
| Type checking | **Not Applicable** — JavaScript tanpa TypeScript |
| `npm test` (vitest) | **20/20 lulus** — `tests/lib.test.js` (13), `tests/gas.test.js` (7) |
| `npm run build` | **Lulus** |
| `node --check` Code.gs | **Lulus** |
| Smoke test browser (dev server) | **Lulus** — login surveyor/admin, sesi lama dipaksa login ulang, panel Outbox (lihat + hapus), Map lazy-load, Gallery/Toko Sukses/Dashboard/About/Feedback; konsol tanpa error |

## 6. Belum terverifikasi

| Area | Alasan |
|---|---|
| Code.gs versi baru di Apps Script asli | **Not Tested** di Google — hanya diuji di Node dengan stub. Perlu redeploy (bagian 8) lalu 1 kali kirim survei uji |
| Race Outbox di perangkat nyata | Diuji lewat unit test fungsi `outboxAfterSync`; uji end-to-end membutuhkan POST ke produksi (dilarang dalam audit ini) |
| Kamera, GPS, tanda tangan di HP | **Not Tested** di audit ini (browser pengujian tanpa kamera/GPS asli) |
| Security header Vercel | Aktif setelah deploy berikutnya |

## 7. Risiko tersisa

1. **SEC-01 (High)** — data hasil survei dapat dibaca siapa pun yang mengetahui URL Apps Script. URL ada di bundle JS publik.
2. **SEC-07** — foto & tanda tangan publik via link.
3. Kuota Apps Script & tile OSM bila jumlah surveyor/kunjungan naik signifikan.
4. Tidak ada Git → sulit rollback; disarankan `git init`.

## 8. Langkah deploy perubahan audit

1. **Apps Script:** tempel `gas/Code.gs` terbaru → Deploy → Manage deployments → Edit → *New version* (URL tetap).
2. **Frontend:** `npm test && npm run build`, lalu `npx vercel deploy --prod --yes`.
3. Semua pengguna akan diminta **login ulang satu kali** (SESSION_VERSION baru).
4. Kirim 1 survei uji, cek baris di sheet, lalu hapus.

Urutan 1–2 bebas: frontend baru kompatibel dengan Code.gs lama, dan Code.gs baru menerima payload frontend lama.

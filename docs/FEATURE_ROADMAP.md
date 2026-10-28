# Feature Roadmap — Competitor-Survey

Tujuan aplikasi: membaca **market share internal (Qty & harga per unit)** produk kompetitor di **outlet terpilih**, dengan bukti lokasi, foto,
dan tanda tangan. Rekomendasi di bawah dipilih berdasarkan tujuan tersebut — bukan daftar fitur generik.

## Kekurangan yang teridentifikasi

| Area | Kekurangan |
|---|---|
| Keamanan | Data hasil survei bisa dibaca/ditulis siapa pun yang tahu URL Apps Script; PIN hanya di browser; foto & TTD publik via link |
| Fungsi inti | Semua outlet di master tampil — tidak ada penanda "outlet terpilih" maupun pembagian outlet per surveyor |
| Kualitas data | Akurasi GPS tidak divalidasi; tidak ada peringatan bila outlet sudah disurvei pada periode yang sama |
| Analisis | Dashboard tidak punya filter periode/region/workplace; market share tidak bisa dibandingkan antar-periode |
| Administrasi | Admin tidak bisa membatalkan (void) survei salah dari aplikasi — harus hapus baris di Sheets |
| Operasional | Tidak ada log error terpusat; tidak ada Git/CI; PIN & URL dikelola di kode |
| Skala | Endpoint hasil mengirim seluruh baris setiap refresh |

## Feature Recommendation Matrix

| Feature | Masalah yang diselesaikan | Manfaat | Priority | Effort | Dependencies | Recommendation |
|---|---|---|---|---|---|---|
| 1. Auth sisi server (token per role) | SEC-01: hasil survei terbuka untuk publik | Data harga & lokasi kompetitor hanya bisa dibaca admin; tulis hanya oleh surveyor sah | **Must Have** | M | Script Properties di Apps Script; perubahan kontrak API + redeploy | Kerjakan pertama |
| 2. Outlet target & penugasan surveyor | Survei untuk outlet terpilih, tapi daftar memuat semua outlet | Surveyor hanya melihat outlet tugasnya; progres per surveyor akurat | **Should Have** | M | Kolom baru di sheet master (mis. `Target`, `Surveyor`) | Kedua |
| 3. Guard kualitas data GPS & duplikat | BUG-09; survei ganda di outlet yang sama | Market share tidak bias oleh data salah lokasi/ganda | **Should Have** | S | Ambang akurasi (mis. ≤ 50 m) disepakati bisnis | Ketiga (cepat) |
| 4. Periode survei + filter Dashboard | Tidak bisa melihat tren market share | Perbandingan bulan-ke-bulan per region/workplace/kecamatan | **Should Have** | M | Field periode (otomatis dari tanggal) | Keempat |
| 5. Sinkronisasi hasil inkremental + paginasi | PERF-04 saat data membesar | Refresh cepat di HP & hemat kuota | **Could Have** | M | Parameter `since`/`page` di `?action=results` | Kelima, saat > ±2.000 baris |
| Void/koreksi survei oleh admin | Hapus manual di Sheets | Audit trail tetap utuh (kolom status, bukan hapus baris) | Could Have | M | Auth server (#1) | Setelah #1 |
| Proxy foto via Apps Script | SEC-07: foto & TTD publik | Privasi tanda tangan PIC toko | Could Have | M | Auth server (#1) | Setelah #1 |
| Log error & health check | Error lapangan tidak terlihat admin | Sheet "Log" berisi error submit/sync | Could Have | S | — | Kapan saja |
| ESLint + Git + CI (test & build otomatis) | Q-06; tidak ada riwayat perubahan | Mencegah regresi | Should Have (engineering) | S | Repo GitHub | Paralel |
| PWA installable (service worker) | Aplikasi hilang saat tab browser ditutup & tanpa sinyal saat dibuka pertama kali | Bisa dibuka offline dari home screen | Future | M | — | Setelah stabil |
| Ringkasan insight otomatis (AI) | Admin harus membaca tabel | Narasi otomatis: "Teh Gelas naik 5 pp di Cipondoh" | Future | M | Data periode (#4) | Setelah #4 |

Effort: **S** ≤ 1 hari · **M** 2–4 hari · **L** 1–2 minggu · **XL** > 2 minggu (asumsi 1 developer, stack saat ini).

## Lima prioritas & urutan implementasi

1. **Auth sisi server** — risiko kebocoran data kompetitif adalah satu-satunya temuan High yang tersisa. Desain: PIN diverifikasi Apps Script
   (`?action=login`) → token bertanda tangan HMAC berisi role & masa berlaku; `results` wajib token admin, `doPost` wajib token surveyor.
   Login offline tetap bisa memakai token yang tersimpan sampai kedaluwarsa. PIN dipindah dari kode ke Script Properties.
2. **Outlet target & penugasan** — langsung menjawab sifat survei "selective outlet" dan membuat angka "Sisa Target" bermakna.
3. **Guard kualitas data** — murah, mencegah data salah masuk sebelum volume survei besar.
4. **Periode & filter Dashboard** — mengubah dashboard dari snapshot menjadi alat pemantauan tren market share.
5. **Sinkronisasi inkremental** — dikerjakan ketika jumlah baris mendekati ±2.000 atau refresh di HP mulai terasa lambat.

## Pemisahan jenis pekerjaan

1. **Bug fix & perbaikan wajib** — selesai dalam audit ini (lihat `REFACTORING_LOG.md`); sisa wajib: #1 Auth sisi server.
2. **Refactoring & kualitas** — ESLint, Git/CI, proxy foto.
3. **Fitur baru** — #2–#5 dan item Future.

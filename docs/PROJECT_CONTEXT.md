# PROJECT CONTEXT: COMPETITOR SURVEY SYSTEM

## 1. Ringkasan

Nama proyek: Competitor Survey System

Tujuan: Mengembangkan aplikasi survei lapangan untuk mengumpulkan informasi kompetitor pada outlet menggunakan struktur aplikasi SuggestONC-Pro sebagai referensi awal.

Pengguna utama:
- Surveyor lapangan
- Supervisor atau koordinator survei
- Admin aplikasi
- Tim analyst dan manajemen

Platform utama: Web responsive yang dapat digunakan pada smartphone dan desktop.

Bahasa aplikasi: Bahasa Indonesia.

## 2. Repository Sumber

URL:
https://github.com/keperluansementara/SuggestONC-Pro

Stack yang teridentifikasi:
- React 19
- Vite 7
- JavaScript
- Tailwind CSS 3
- lucide-react

File utama yang telah diidentifikasi:
- src/App.jsx
- src/App.css
- src/index.css
- src/main.jsx
- package.json
- vite.config.js

Catatan implementasi awal:
- src/App.jsx memuat banyak fungsi dan UI aplikasi dalam satu file.
- Aplikasi sumber menggunakan Google Sheets yang dipublikasikan sebagai CSV untuk membaca data.
- Aplikasi sumber menggunakan Google Apps Script Web App sebagai salah satu tujuan pengiriman data.
- Nama surveyor dan antrean data offline menggunakan localStorage.
- Aplikasi memiliki bagian peta, dokumentasi gambar, tanda tangan digital, serta autentikasi berbasis role demo yang perlu diaudit.
- Repository sumber harus diperlakukan sebagai aplikasi referensi, bukan target perubahan langsung.

Temuan ini merupakan hasil pemeriksaan awal. Seluruh alur bisnis, integrasi, keamanan, dan dependensi harus diverifikasi pada kode terbaru sebelum diubah.

## 3. Prinsip Pemisahan Proyek

- Proyek baru memiliki repository, konfigurasi deployment, dan riwayat Git sendiri.
- Jangan melakukan perubahan langsung ke SuggestONC-Pro.
- Ambil hanya komponen yang relevan dan setelah memahami dependensinya.
- Jangan menyalin URL integrasi, PIN, secret, atau konfigurasi sensitif dari aplikasi sumber tanpa audit.
- Jangan menganggap Google Sheets sebagai database produksi yang sudah disetujui untuk aplikasi baru.
- Keputusan backend masih terbuka dan harus dibuat setelah kebutuhan akses data, volume survei, keamanan, serta sinkronisasi offline dikaji.

## 4. Kebutuhan Bisnis

Aplikasi harus memungkinkan surveyor:
1. Masuk dengan akun yang sesuai.
2. Melihat daftar atau penugasan toko.
3. Scan barcode toko.
4. Memastikan identitas toko hasil scan.
5. Mengisi form survei kompetitor.
6. Mengambil dan mengunggah bukti foto sesuai kebutuhan.
7. Menyimpan draft.
8. Mengirimkan survei.
9. Melihat status keberhasilan penyimpanan atau sinkronisasi.

Admin dan supervisor perlu:
- Mengelola akses dan memantau survei.
- Memeriksa kelengkapan jawaban serta bukti.
- Mencari hasil berdasarkan toko, surveyor, area, dan periode.
- Melakukan ekspor dan rekap data sesuai hak akses.

Ruang lingkup akhir perlu disesuaikan setelah proses bisnis dan rancangan kuesioner ditetapkan.

## 5. Kebutuhan Barcode

Kebutuhan utama: surveyor scan barcode pada identitas toko atau media identifikasi resmi yang digunakan bisnis.

Prinsip:
- Barcode merupakan kunci pencarian identitas toko, bukan otomatis bukti bahwa survei valid.
- Nilai hasil scan harus dicocokkan dengan master toko.
- Tampilkan kode hasil scan dan identitas toko sebelum surveyor melanjutkan.
- Jika kode tidak ditemukan, tawarkan input manual atau proses verifikasi yang disetujui.
- Jangan membuat identitas toko fiktif.
- Siapkan pencegahan scan ganda dan mekanisme koreksi yang tercatat.
- Perhatikan izin kamera dan kompatibilitas browser mobile.
- Sediakan alternatif ketika kamera tidak tersedia atau akses kamera ditolak.
- Tentukan format barcode dan apakah berupa Code 128, EAN/UPC, QR, atau format lain setelah master toko diperiksa.

Barcode scanner harus diuji pada perangkat fisik, terutama Android yang akan digunakan surveyor. Kamera dan pemindaian wajib menggunakan secure context seperti HTTPS pada deployment, serta izin kamera dari browser.

## 6. Kuesioner Kompetitor

Pertanyaan survei final BELUM ditetapkan.

Jangan menganggap kuesioner SuggestONC-Pro sebagai kuesioner final Competitor Survey.

Sebelum mengimplementasikan pertanyaan, buat rancangan kuesioner yang mencakup:
- Nama bagian survei.
- Nama field dan kode field.
- Teks pertanyaan.
- Jenis jawaban.
- Daftar pilihan jawaban.
- Status wajib atau opsional.
- Aturan validasi.
- Conditional logic.
- Sumber atau definisi data.
- Aturan bukti foto jika dibutuhkan.

Contoh kelompok survei untuk diskusi:
1. Identitas dan kondisi outlet.
2. Ketersediaan produk Garudafood dan kompetitor.
3. Harga jual dan ukuran kemasan.
4. Jumlah facing atau display.
5. Aktivitas promosi kompetitor.
6. Perkiraan stok dan kondisi rak.
7. Dokumentasi foto.
8. Catatan tambahan surveyor.

Kelompok tersebut adalah usulan awal, bukan requirement yang sudah disetujui.

## 7. Model Data Konseptual

Rencanakan entitas:
- users
- roles
- regions atau territory
- stores
- store_identifiers
- survey_templates
- survey_questions
- survey_assignments
- survey_sessions
- survey_answers
- survey_evidence
- audit_logs

Relasi, kolom, constraint, indeks, dan penyimpanan foto perlu dirancang setelah backend ditentukan.

Setiap survei harus memiliki identifier unik dan memiliki referensi ke toko, surveyor, template atau versi survei, serta waktu kunjungan.

## 8. Offline dan Sinkronisasi

Surveyor dapat menghadapi koneksi internet yang tidak stabil.

Kebutuhan yang harus dianalisis:
- Penyimpanan draft lokal.
- Ketahanan terhadap reload atau penutupan browser.
- Antrean data yang menunggu sinkronisasi.
- Indikator status sinkronisasi.
- Retry ketika koneksi pulih.
- Pencegahan duplikasi dengan idempotency key atau mekanisme yang setara.
- Penanganan konflik antara perubahan lokal dan server.
- Keamanan data lokal dan kebijakan retensi.
- Penyimpanan foto offline serta batas kuota browser.

Jangan menghapus data lokal hanya karena permintaan upload sudah dikirim. Hapus atau tandai selesai setelah ada konfirmasi server yang dapat dipercaya.

## 9. Kriteria Keberhasilan Awal

- Barcode berhasil dibaca pada perangkat yang didukung.
- Kode yang tidak dikenal tidak menghasilkan identitas toko fiktif.
- Identitas toko dikonfirmasi sebelum survei dimulai.
- Pertanyaan dan validasi berfungsi sesuai definisi.
- Jawaban dapat disimpan sebagai draft.
- Gangguan koneksi tidak menyebabkan kehilangan jawaban tanpa pemberitahuan.
- Pengiriman ulang tidak membuat survei duplikat.
- Hak akses Admin, Supervisor, dan Surveyor diuji.
- Data dan bukti dapat dicari kembali oleh pengguna yang berwenang.
- Build produksi berhasil.
- Tidak ada secret atau kredensial internal yang tertanam di frontend.

## 10. Keputusan yang Masih Terbuka

Jangan mengunci arsitektur sebelum keputusan berikut dibuat:
- Format dan sumber master barcode toko.
- Struktur master toko dan penanggung jawab datanya.
- Pertanyaan survei final.
- Jenis dan tingkat detail data kompetitor yang diukur.
- Backend dan database.
- Kebutuhan penggunaan offline.
- Kebutuhan upload foto dan penyimpanan berkas.
- Pembagian role dan alur approval.
- Dashboard, ekspor, dan laporan yang dibutuhkan.
- Hosting serta domain target.
- Kebijakan retensi dan akses terhadap data survei.

## 11. Aturan Perubahan

Semua perubahan harus dilakukan pada repository baru.

Setiap pekerjaan harus menjelaskan file yang berubah, tujuan perubahan, konsekuensi integrasi, langkah pengujian, dan status verifikasinya.

Jangan mengasumsikan fitur sudah berfungsi sebelum diuji.
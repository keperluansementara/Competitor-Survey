/**
 * Competitor-Survey — Backend Google Apps Script
 * API: doPost (simpan survei/feedback) & doGet?action=results (baca hasil)
 *   -> Google Sheets (Tab "Report Hasil Survei") + Google Drive (Foto & TTD)
 *
 * Deploy pertama: Deploy > New deployment > Web app (Execute as: Me | Who has access: Anyone)
 *   lalu salin URL /exec ke GAS_URL di src/config.js.
 * Update kode: Deploy > Manage deployments > Edit > Version: New version (URL tetap sama).
 */

// ============================================================================
// KONFIGURASI
// ============================================================================
var SPREADSHEET_ID = '1Yec9EwJnY87aoqbo84-2STHJIymFUtQ6Nxg7u-e93LA'; // Spreadsheet "Competitor-Survey"
var SHEET_NAME = 'Report Hasil Survei';
// Daftar nama surveyor untuk dropdown form (diisi admin di Sheets; tanpa redeploy)
var SURVEYOR_SHEET = 'Surveyor';
var SURVEYOR_HEADERS = ['Nama Surveyor', 'Workplace', 'Aktif'];
var DRIVE_FOLDER_ID = '';           // Kosongkan: folder "Competitor-Survey Uploads" dibuat otomatis
var TIMEZONE = 'Asia/Jakarta';

// HARUS sama urutan & isinya dengan PRODUCTS[].key di src/config.js
var PRODUCTS = [
  'TICTAC PERBALL',
  'SUKRO OVEN PERBALL',
  'ROMA MALKIST 1000 ALL SATUAN KARTON',
  'ASTOR SINGLE PERKARTON',
  'FRENCH FRIES 2000 PERKARTON',
  'TARO 2000 PERKARTON',
  'TEH RIO PERKARTON',
  'TEH GELAS PERKARTON',
  'ALE-ALE PERKARTON',
  'LA VONTEA PERKARTON',
  'SEMESTA TEH 1000 PEKARTON',
  'BONTEH MATCHA PERKARTON',
  'BENG-BENG DRINK PERKARTON',
  'SUKRO PERBALL',
  'POTABEE PERKARTON',
  'OLALA PERKARTON'
];

// Header Tab "Report Hasil Survei" — urutannya = urutan rowData di doPost()
// A s/d AG = struktur asli spreadsheet; AH s/d AP = kolom tambahan untuk fitur inti
var HEADERS = [
  'Tgl Survei',            // A
  'Nama Surveyor',         // B
  'Region',                // C
  'Workplace',             // D
  'ID Pelanngan',          // E (ejaan mengikuti header asli)
  'Nama Pelanggan',        // F
  'Channel',               // G
  'Alamat',                // H
  'Kecamatan',             // I
  'Kelurahan',             // J
  'Latitude',              // K
  'Longitude',             // L
  'Lat Awal (Master)',     // M
  'Long Awal (Master)',    // N
  'Lat Akhir (Aktual)',    // O
  'Long Akhir (Aktual)',   // P
  'Jarak Validasi'         // Q
]
  .concat(PRODUCTS)        // R s/d AG (16 kolom harga produk)
  .concat([
    'Status Lokasi',                 // AH
    'Alasan Lokasi',                 // AI
    'Akurasi GPS (m)',               // AJ
    'Keterangan Promosi Kompetitor', // AK
    'Catatan',                       // AL
    'Foto Bukti',                    // AM
    'TTD',                           // AN
    'Timestamp Server',              // AO
    'Submission ID'                  // AP (anti-duplikat saat sync offline)
  ]);
var ORIGINAL_COLS = 33; // A s/d AG — header asli tidak ditimpa oleh setupSheet()
var PRODUCT_START = HEADERS.indexOf(PRODUCTS[0]); // index kolom R (0-based)

// Batas keamanan input
var ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
var MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // per file, setelah decode Base64
var MAX_TEXT_LENGTH = 2000;

// ============================================================================
// ENDPOINTS
// ============================================================================
function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : '';
    if (action === 'results') return jsonOut_({ status: 'success', data: readResults_() });
    if (action === 'surveyors') return jsonOut_({ status: 'success', data: readSurveyors_() });
    return jsonOut_({ status: 'success', message: 'Competitor-Survey API aktif' });
  } catch (err) {
    return errorOut_(err);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type === 'feedback') return withLock_(function () { return saveFeedback_(data); });

    var invalid = validateSubmission_(data);
    if (invalid) return jsonOut_({ status: 'error', message: invalid });

    var sheet = getSheet_();
    // Anti-duplikat: payload Outbox yang dikirim ulang tidak ditulis dua kali
    if (isDuplicate_(sheet, data.submissionId)) return duplicateOut_();

    // Upload ke Drive DI LUAR lock (langkah paling lambat) agar submit bersamaan tidak saling antre/timeout
    var fileBase = sanitize_(data.idPelanggan + '_' + data.namaPelanggan) + '_' +
      Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmmss');
    var foto = saveBase64ToDrive_(data.foto, 'FOTO_' + fileBase);
    var ttd = saveBase64ToDrive_(data.ttd, 'TTD_' + fileBase);

    return withLock_(function () {
      // Cek ulang di dalam lock: dua kiriman identik bisa lolos cek pertama secara bersamaan
      if (isDuplicate_(sheet, data.submissionId)) {
        trashQuietly_(foto.file);
        trashQuietly_(ttd.file);
        return duplicateOut_();
      }
      sheet.appendRow(buildRow_(data, foto.url, ttd.url));
      return jsonOut_({ status: 'success', message: 'Data tersimpan', row: sheet.getLastRow() });
    });
  } catch (err) {
    return errorOut_(err);
  }
}

/** Susun 1 baris — urutan PERSIS sama dengan HEADERS / kolom Tab "Report Hasil Survei". */
function buildRow_(data, fotoUrl, ttdUrl) {
  var items = normalizeKeys_(data.items || {});
  return [
    text_(data.tglSurvei),                // A Tgl Survei
    text_(data.surveyor),                 // B Nama Surveyor
    text_(data.region),                   // C Region
    text_(data.workplace),                // D Workplace
    "'" + String(data.idPelanggan),       // E ID Pelanngan (dipaksa teks)
    text_(data.namaPelanggan),            // F Nama Pelanggan
    text_(data.channel),                  // G Channel
    text_(data.alamat),                   // H Alamat
    text_(data.kecamatan),                // I Kecamatan
    text_(data.kelurahan),                // J Kelurahan
    num_(data.latMaster),                 // K Latitude (koordinat master)
    num_(data.longMaster),                // L Longitude (koordinat master)
    num_(data.latMaster),                 // M Lat Awal (Master)
    num_(data.longMaster),                // N Long Awal (Master)
    num_(data.latAktual),                 // O Lat Akhir (Aktual)
    num_(data.longAktual),                // P Long Akhir (Aktual)
    num_(data.jarakMeter)                 // Q Jarak Validasi (meter, Haversine)
  ]
    .concat(PRODUCTS.map(function (p) {   // R s/d AG "Qty/Harga per unit", mis. 10/100.000
      return formatItem_(items[normalizeKey_(p)]);
    }))
    .concat([
      text_(data.statusLokasi),           // AH Status Lokasi
      text_(data.alasanLokasi),           // AI Alasan Lokasi
      num_(data.akurasiGps),              // AJ Akurasi GPS
      text_(data.promosi),                // AK Keterangan Promosi Kompetitor
      text_(data.catatan),                // AL Catatan
      fotoUrl,                            // AM Foto Bukti
      ttdUrl,                             // AN TTD
      Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'), // AO Timestamp Server
      text_(data.submissionId)            // AP Submission ID
    ]);
}

/** Validasi minimum payload survei. Mengembalikan pesan error, atau '' jika valid. */
function validateSubmission_(data) {
  var required = ['submissionId', 'idPelanggan', 'namaPelanggan', 'surveyor', 'tglSurvei'];
  for (var i = 0; i < required.length; i++) {
    if (!data[required[i]] || !String(data[required[i]]).trim()) return 'Field wajib kosong: ' + required[i];
  }
  if (!isFiniteNum_(data.latAktual) || !isFiniteNum_(data.longAktual)) return 'Koordinat aktual tidak valid';
  if (!data.foto || !data.ttd) return 'Foto dan TTD wajib ada';
  var items = data.items || {};
  for (var k in items) {
    var it = items[k] || {};
    if (!isBlankOrNonNegative_(it.qty) || !isBlankOrNonNegative_(it.harga)) return 'Qty/Harga tidak valid untuk ' + k;
  }
  return '';
}

// ============================================================================
// SETUP (jalankan sekali manual dari editor untuk membuat header & otorisasi)
// ============================================================================
function setupSheet() {
  var sheet = getSheet_();
  Logger.log('Sheet siap: ' + sheet.getName() + ' (' + sheet.getMaxColumns() + ' kolom)');
  var ss = openSpreadsheet_();
  if (!ss.getSheetByName(SURVEYOR_SHEET)) {
    var s = ss.insertSheet(SURVEYOR_SHEET);
    s.getRange(1, 1, 1, SURVEYOR_HEADERS.length).setValues([SURVEYOR_HEADERS]).setFontWeight('bold');
    s.setFrozenRows(1);
    Logger.log('Tab "' + SURVEYOR_SHEET + '" dibuat — isi nama surveyor di sana');
  }
  Logger.log('Folder upload: ' + getUploadFolder_().getUrl()); // memicu izin Drive
}

// ============================================================================
// HELPERS
// ============================================================================
function openSpreadsheet_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_() {
  var ss = openSpreadsheet_();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (!sheet.getRange(1, ORIGINAL_COLS + 1).getValue()) {
    // Lengkapi header kolom tambahan (AH dst.) tanpa menimpa header asli A–AG
    sheet.getRange(1, ORIGINAL_COLS + 1, 1, HEADERS.length - ORIGINAL_COLS)
      .setValues([HEADERS.slice(ORIGINAL_COLS)]).setFontWeight('bold');
  }
  return sheet;
}

/** Baca Tab "Report Hasil Survei" → array objek untuk Gallery, List Toko Sukses & Dashboard. */
function readResults_() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var col = function (name) { return HEADERS.indexOf(name); };
  var fmt = function (v) {
    return v instanceof Date ? Utilities.formatDate(v, TIMEZONE, 'yyyy-MM-dd HH:mm:ss') : v;
  };
  return values
    .filter(function (r) { return r[col('ID Pelanngan')] !== '' || r[col('Nama Pelanggan')] !== ''; })
    .map(function (r) {
      var items = {};
      PRODUCTS.forEach(function (p, i) { items[p] = parseItem_(r[PRODUCT_START + i]); }); // kolom R dst.
      return {
        tglSurvei: fmt(r[col('Tgl Survei')]),
        surveyor: r[col('Nama Surveyor')],
        region: r[col('Region')],
        workplace: r[col('Workplace')],
        idPelanggan: String(r[col('ID Pelanngan')]),
        namaPelanggan: r[col('Nama Pelanggan')],
        channel: r[col('Channel')],
        alamat: r[col('Alamat')],
        kecamatan: r[col('Kecamatan')],
        kelurahan: r[col('Kelurahan')],
        latMaster: r[col('Lat Awal (Master)')],
        longMaster: r[col('Long Awal (Master)')],
        latAktual: r[col('Lat Akhir (Aktual)')],
        longAktual: r[col('Long Akhir (Aktual)')],
        jarakMeter: r[col('Jarak Validasi')],
        items: items,
        statusLokasi: r[col('Status Lokasi')],
        alasanLokasi: r[col('Alasan Lokasi')],
        akurasiGps: r[col('Akurasi GPS (m)')],
        promosi: r[col('Keterangan Promosi Kompetitor')],
        catatan: r[col('Catatan')],
        foto: r[col('Foto Bukti')],
        ttd: r[col('TTD')],
        timestamp: fmt(r[col('Timestamp Server')]),
        submissionId: r[col('Submission ID')]
      };
    });
}

/** Tab "Surveyor" → [{nama, workplace}] untuk dropdown. Tab belum ada → [] (form memakai input teks). */
function readSurveyors_() {
  var sheet = openSpreadsheet_().getSheetByName(SURVEYOR_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return parseSurveyorRows_(sheet.getRange(2, 1, sheet.getLastRow() - 1, SURVEYOR_HEADERS.length).getValues());
}

/** Baris [Nama, Workplace, Aktif] → daftar unik. Kolom Aktif kosong = aktif; "TIDAK"/"N"/"NO"/FALSE = nonaktif. */
function parseSurveyorRows_(rows) {
  var seen = {};
  var out = [];
  rows.forEach(function (r) {
    var nama = String(r[0] || '').replace(/\s+/g, ' ').trim();
    var workplace = String(r[1] || '').trim();
    var aktif = String(r[2] === false ? 'FALSE' : r[2] || '').trim().toUpperCase();
    if (!nama || ['TIDAK', 'N', 'NO', 'FALSE', '0'].indexOf(aktif) > -1) return;
    var key = nama.toUpperCase() + '|' + workplace.toUpperCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push({ nama: nama, workplace: workplace });
  });
  return out;
}

function saveFeedback_(data) {
  if (!data.pesan || !String(data.pesan).trim()) return jsonOut_({ status: 'error', message: 'Pesan feedback kosong' });
  var ss = openSpreadsheet_();
  var sheet = ss.getSheetByName('Feedback') || ss.insertSheet('Feedback');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp Server', 'Waktu', 'Nama', 'Role', 'Kategori', 'Pesan']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  sheet.appendRow([
    Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
    text_(data.waktu), text_(data.nama), text_(data.role), text_(data.kategori), text_(data.pesan)
  ]);
  return jsonOut_({ status: 'success', message: 'Feedback tersimpan' });
}

function getUploadFolder_() {
  if (DRIVE_FOLDER_ID) return DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('UPLOAD_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* folder terhapus, buat ulang */ }
  }
  var folder = DriveApp.createFolder('Competitor-Survey Uploads');
  props.setProperty('UPLOAD_FOLDER_ID', folder.getId());
  return folder;
}

function isDuplicate_(sheet, submissionId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var col = HEADERS.length; // kolom Submission ID = kolom terakhir
  var found = sheet.getRange(2, col, lastRow - 1, 1)
    .createTextFinder(String(submissionId)).matchEntireCell(true).findNext();
  return !!found;
}

/**
 * Simpan gambar Base64 ke Drive. Hanya JPEG/PNG ≤ MAX_UPLOAD_BYTES yang diterima, karena file dibagikan
 * "anyone with link" — tanpa batasan ini endpoint publik bisa dipakai menyebar file sembarang.
 */
function saveBase64ToDrive_(dataUrl, name) {
  var m = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('Format gambar tidak valid');
  var mime = m[1].toLowerCase();
  if (ALLOWED_IMAGE_TYPES.indexOf(mime) === -1) throw new Error('Tipe file tidak diizinkan: ' + mime);
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('Ukuran gambar melebihi batas');
  var blob = Utilities.newBlob(bytes, mime, name + (mime === 'image/png' ? '.png' : '.jpg'));
  var file = getUploadFolder_().createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Kebijakan domain Workspace bisa melarang sharing publik — file tetap tersimpan
  }
  return { url: file.getUrl(), file: file };
}

function trashQuietly_(file) {
  try { if (file) file.setTrashed(true); } catch (e) { /* abaikan */ }
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// Sel produk: "Qty/Harga per unit" → mis. {qty:10, harga:100000} ditulis "10/100.000"
// Diawali apostrof agar Sheets tidak mengubahnya menjadi tanggal.
function formatItem_(it) {
  if (!it) return '';
  var hasQty = it.qty !== '' && it.qty !== null && it.qty !== undefined;
  var hasHarga = it.harga !== '' && it.harga !== null && it.harga !== undefined;
  if (!hasQty && !hasHarga) return '';
  var harga = hasHarga ? String(Math.round(Number(it.harga))).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '-';
  return "'" + (hasQty ? Number(it.qty) : 0) + '/' + harga;
}

function parseItem_(v) {
  if (v === '' || v === null || v === undefined) return { qty: '', harga: '' };
  if (typeof v === 'number') return { qty: '', harga: v }; // data lama: hanya harga
  var parts = String(v).split('/');
  var num = function (s) {
    var d = String(s || '').replace(/[^\d]/g, '');
    return d === '' ? '' : Number(d);
  };
  return { qty: num(parts[0]), harga: parts.length > 1 ? num(parts[1]) : '' };
}

// Normalisasi nama produk (huruf besar + spasi tunggal) agar tahan beda spasi/kapital
function normalizeKey_(k) {
  return String(k).toUpperCase().replace(/\s+/g, ' ').trim();
}
function normalizeKeys_(obj) {
  var out = {};
  Object.keys(obj).forEach(function (k) { out[normalizeKey_(k)] = obj[k]; });
  return out;
}

function sanitize_(s) {
  return String(s || '').replace(/[^\w\-]+/g, '_').substring(0, 80);
}

/**
 * Nilai teks dari pengguna → aman untuk sel Sheets. Teks diawali = + - @ diberi apostrof agar tidak
 * dieksekusi sebagai formula (formula injection, mis. =IMPORTXML ke server luar). Panjang dibatasi.
 */
function text_(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).substring(0, MAX_TEXT_LENGTH);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function num_(v) {
  return isFiniteNum_(v) ? Number(v) : '';
}

function isFiniteNum_(v) {
  return v !== '' && v !== null && v !== undefined && isFinite(Number(v));
}

function isBlankOrNonNegative_(v) {
  return v === '' || v === null || v === undefined || (isFiniteNum_(v) && Number(v) >= 0);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorOut_(err) {
  return jsonOut_({ status: 'error', message: String(err && err.message ? err.message : err) });
}

function duplicateOut_() {
  return jsonOut_({ status: 'success', message: 'Sudah tersimpan sebelumnya', duplicate: true });
}

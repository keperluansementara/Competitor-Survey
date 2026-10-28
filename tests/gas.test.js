// Menguji logika murni gas/Code.gs di Node (layanan Google di-stub).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { PRODUCTS as FRONTEND_PRODUCTS } from '../src/config';

const code = readFileSync(fileURLToPath(new URL('../gas/Code.gs', import.meta.url)), 'utf8');
const gas = {
  Utilities: { formatDate: () => '2026-10-28 10:00:00' },
  ContentService: { createTextOutput: (s) => ({ setMimeType: () => JSON.parse(s) }), MimeType: { JSON: 'json' } },
};
vm.createContext(gas);
vm.runInContext(code, gas);

const validPayload = () => ({
  submissionId: 'sub-1',
  tglSurvei: '2026-10-28 10:00:00',
  surveyor: 'Uyo',
  idPelanggan: '0008-08-000008961',
  namaPelanggan: 'CV. NEKASTI',
  latMaster: -6.17394,
  longMaster: 106.6664572,
  latAktual: -6.1741,
  longAktual: 106.6666,
  jarakMeter: 30,
  akurasiGps: 8,
  statusLokasi: 'VALID',
  items: { 'TICTAC PERBALL': { qty: 10, harga: 100000 }, 'OLALA PERKARTON': { qty: 0, harga: 55000 } },
  foto: 'data:image/jpeg;base64,AAAA',
  ttd: 'data:image/png;base64,AAAA',
});

describe('kontrak frontend ↔ Code.gs', () => {
  it('daftar & urutan produk sama persis dengan src/config.js', () => {
    expect([...gas.PRODUCTS]).toEqual(FRONTEND_PRODUCTS.map((p) => p.key));
  });
  it('kolom produk dimulai di R dan header berjumlah 42 (A–AP)', () => {
    expect(gas.PRODUCT_START).toBe(17);
    expect(gas.HEADERS).toHaveLength(42);
  });
});

describe('formatItem_ / parseItem_', () => {
  it('menulis "qty/harga" sebagai teks dan membacanya kembali', () => {
    expect(gas.formatItem_({ qty: 10, harga: 100000 })).toBe("'10/100.000");
    expect(gas.formatItem_({ qty: 5, harga: '' })).toBe("'5/-");
    expect(gas.formatItem_({ qty: '', harga: '' })).toBe('');
    expect({ ...gas.parseItem_('10/100.000') }).toEqual({ qty: 10, harga: 100000 });
    expect({ ...gas.parseItem_('5/-') }).toEqual({ qty: 5, harga: '' });
    expect({ ...gas.parseItem_(42000) }).toEqual({ qty: '', harga: 42000 }); // data lama (harga saja)
  });
});

describe('text_ (formula injection)', () => {
  it('menetralkan teks yang diawali karakter formula', () => {
    expect(gas.text_('=IMPORTXML("http://x","//a")')).toBe(`'=IMPORTXML("http://x","//a")`);
    expect(gas.text_('+62812')).toBe("'+62812");
    expect(gas.text_('Toko Biasa')).toBe('Toko Biasa');
    expect(gas.text_(null)).toBe('');
    expect(gas.text_('x'.repeat(5000))).toHaveLength(2000);
  });
});

describe('validateSubmission_', () => {
  it('menerima payload valid', () => {
    expect(gas.validateSubmission_(validPayload())).toBe('');
  });
  it('menolak field wajib kosong, koordinat & qty tidak valid', () => {
    expect(gas.validateSubmission_({ ...validPayload(), idPelanggan: '' })).toMatch(/idPelanggan/);
    expect(gas.validateSubmission_({ ...validPayload(), latAktual: 'abc' })).toMatch(/Koordinat/);
    expect(gas.validateSubmission_({ ...validPayload(), foto: '' })).toMatch(/Foto/);
    expect(gas.validateSubmission_({ ...validPayload(), items: { 'TICTAC PERBALL': { qty: -1, harga: 1 } } })).toMatch(/tidak valid/);
  });
});

describe('parseSurveyorRows_', () => {
  it('membuang baris kosong, nonaktif & duplikat; merapikan spasi', () => {
    const rows = [
      ['Uyo', 'DEPO TANGERANG UTARA', 'YA'],
      ['  uyo ', 'DEPO TANGERANG UTARA', ''], // duplikat (beda huruf/spasi)
      ['Budi  Santoso', '', ''],            // tanpa depo → semua depo
      ['Andi', 'DEPO SERANG', 'TIDAK'],      // nonaktif
      ['Rina', 'DEPO SERANG', false],        // checkbox tidak dicentang
      ['', 'DEPO SERANG', 'YA'],
    ];
    expect(JSON.parse(JSON.stringify(gas.parseSurveyorRows_(rows)))).toEqual([
      { nama: 'Uyo', workplace: 'DEPO TANGERANG UTARA' },
      { nama: 'Budi Santoso', workplace: '' },
    ]);
  });
});

describe('buildRow_', () => {
  it('menghasilkan 42 kolom dengan posisi data yang benar', () => {
    const row = gas.buildRow_(validPayload(), 'FOTO_URL', 'TTD_URL');
    const col = (name) => row[gas.HEADERS.indexOf(name)];
    expect(row).toHaveLength(42);
    expect(col('ID Pelanngan')).toBe("'0008-08-000008961");
    expect(col('TICTAC PERBALL')).toBe("'10/100.000");
    expect(col('OLALA PERKARTON')).toBe("'0/55.000");
    expect(col('SUKRO PERBALL')).toBe('');
    expect(col('Lat Akhir (Aktual)')).toBe(-6.1741);
    expect(col('Foto Bukti')).toBe('FOTO_URL');
    expect(col('Submission ID')).toBe('sub-1');
  });
});

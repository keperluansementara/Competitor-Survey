import { describe, expect, it } from 'vitest';
import {
  csvSafe, driveThumb, formatDistance, formatItem, haversine, itemFilled, matchCustomer, matchStatus, outboxAfterSync,
  surveyorsForDepo, toNum,
} from '../src/lib';
import { tilesFor } from '../src/components/ui';
import { PINS, ROLE_ACCESS } from '../src/config';

describe('konfigurasi role', () => {
  const PAGES = ['list', 'map', 'gallery', 'sukses', 'dashboard', 'about', 'feedback'];
  it('setiap role di PINS punya daftar halaman di ROLE_ACCESS', () => {
    Object.values(PINS).forEach((role) => expect(ROLE_ACCESS[role], `role "${role}"`).toBeDefined());
  });
  it('semua kunci halaman di ROLE_ACCESS valid (cegah salah ketik)', () => {
    Object.entries(ROLE_ACCESS).forEach(([role, pages]) =>
      pages.forEach((p) => expect(PAGES, `role "${role}" halaman "${p}"`).toContain(p))
    );
  });
});

describe('surveyorsForDepo', () => {
  const list = [
    { nama: 'Uyo', workplace: 'DEPO A' },
    { nama: 'Budi', workplace: '' },
    { nama: 'Andi', workplace: 'DEPO B' },
  ];
  it('menampilkan surveyor depo tersebut + surveyor tanpa depo, urut abjad', () => {
    expect(surveyorsForDepo(list, 'DEPO A')).toEqual(['Budi', 'Uyo']);
  });
  it('depo tanpa surveyor khusus tetap mendapat surveyor umum', () => {
    expect(surveyorsForDepo(list, 'DEPO C')).toEqual(['Budi']);
  });
  it('daftar kosong → [] (form kembali ke input teks)', () => {
    expect(surveyorsForDepo([], 'DEPO A')).toEqual([]);
  });
});

describe('matchStatus', () => {
  it('memfilter Semua | Belum | Selesai', () => {
    expect(matchStatus(undefined, 'all')).toBe(true);
    expect(matchStatus(undefined, 'belum')).toBe(true);
    expect(matchStatus('sent', 'belum')).toBe(false);
    expect(matchStatus('sent', 'selesai')).toBe(true);
    expect(matchStatus('pending', 'selesai')).toBe(true);
    expect(matchStatus(undefined, 'selesai')).toBe(false);
  });
});

describe('haversine', () => {
  it('jarak 0 untuk titik yang sama', () => {
    expect(haversine(-6.17394, 106.6664572, -6.17394, 106.6664572)).toBe(0);
  });
  it('1 derajat lintang ≈ 111,2 km', () => {
    expect(haversine(0, 106, 1, 106)).toBeCloseTo(111195, -1);
  });
  it('menghitung jarak pendek dalam meter (validasi radius 100 m)', () => {
    const d = haversine(-6.17394, 106.6664572, -6.1741, 106.6666);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(40);
  });
});

describe('format Qty/Harga', () => {
  it('format sama dengan sel sheet: qty/harga', () => {
    expect(formatItem({ qty: 10, harga: 100000 })).toBe('10/100.000');
    expect(formatItem({ qty: 5, harga: '' })).toBe('5/-');
    expect(formatItem({ qty: '', harga: '' })).toBe('-');
  });
  it('itemFilled mengenali qty 0 sebagai terisi', () => {
    expect(itemFilled({ qty: 0, harga: '' })).toBe(true);
    expect(itemFilled({ qty: '', harga: '' })).toBe(false);
    expect(itemFilled(undefined)).toBe(false);
  });
});

describe('outboxAfterSync', () => {
  const a = { submissionId: 'a' };
  const b = { submissionId: 'b' };
  const c = { submissionId: 'c' }; // disimpan saat Sync berjalan

  it('membuang item terkirim tanpa menghapus item yang masuk selama Sync', () => {
    const next = outboxAfterSync([a, b, c], new Set(['a', 'b']));
    expect(next).toEqual([c]);
  });
  it('menandai item gagal dengan pesan error terakhir', () => {
    const next = outboxAfterSync([a, b], new Set(['a']), { b: 'Koneksi timeout' });
    expect(next).toEqual([{ submissionId: 'b', lastError: 'Koneksi timeout' }]);
  });
});

describe('utilitas lain', () => {
  it('driveThumb mengambil ID file Drive', () => {
    expect(driveThumb('https://drive.google.com/file/d/AbC_12-x/view?usp=drivesdk', 400))
      .toBe('https://drive.google.com/thumbnail?id=AbC_12-x&sz=w400');
    expect(driveThumb('')).toBe('');
  });
  it('csvSafe mencegah formula injection hanya pada teks', () => {
    expect(csvSafe('=HYPERLINK("x")')).toBe(`'=HYPERLINK("x")`);
    expect(csvSafe('@SUM(A1)')).toBe(`'@SUM(A1)`);
    expect(csvSafe('Toko Biasa')).toBe('Toko Biasa');
    expect(csvSafe(-6.17)).toBe(-6.17); // angka negatif tidak diubah
  });
  it('matchCustomer mencari di nama/ID/alamat tanpa peka huruf besar', () => {
    const c = { nama: 'BENNY MART', id: '0008-10', alamat: 'Jl. Poris', kelurahan: 'X', kecamatan: 'CIPONDOH' };
    expect(matchCustomer(c, 'benny')).toBe(true);
    expect(matchCustomer(c, 'cipondoh')).toBe(true);
    expect(matchCustomer(c, 'tangerang')).toBe(false);
    expect(matchCustomer(c, '')).toBe(true);
  });
  it('toNum menerima koma desimal', () => {
    expect(toNum('-6,17')).toBe(-6.17);
    expect(toNum('abc')).toBeNull();
  });
  it('formatDistance', () => {
    expect(formatDistance(35.4)).toBe('35 meter');
    expect(formatDistance(7405)).toBe('7.4 km');
    expect(formatDistance('')).toBe('-');
  });
  it('MiniMap hanya memuat tile yang terlihat', () => {
    // titik di tengah tile, kotak 520×112 → 3 kolom × 1 baris
    expect(tilesFor(128 + 256 * 10, 128 + 256 * 10, 520, 112)).toHaveLength(3);
  });
});

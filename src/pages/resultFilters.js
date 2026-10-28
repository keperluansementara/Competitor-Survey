export const filterByLocation = (r, filter) =>
  filter === 'all' || (filter === 'valid' ? r.statusLokasi === 'VALID' : r.statusLokasi !== 'VALID');

export const matchSearch = (r, search) => {
  const s = (search || '').toLowerCase();
  return !s || [r.namaPelanggan, r.idPelanggan, r.surveyor, r.kecamatan, r.region].some((v) => String(v || '').toLowerCase().includes(s));
};

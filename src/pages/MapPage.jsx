import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Crosshair, MapPin } from 'lucide-react';
import { getCurrentPosition, gmapsRoute, matchCustomer, matchStatus } from '../lib';
import { KecamatanFilter, STATUS_META, SurveyStatsCard } from '../components/ui';

const LAYERS = {
  peta: () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }),
  satelit: () =>
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri',
    }),
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

export default function MapPage({ customers, statusById, search, onSelect }) {
  const [filter, setFilter] = useState('all'); // all | belum | selesai
  const [kecamatan, setKecamatan] = useState('');
  const kecamatanList = useMemo(() => [...new Set(customers.map((c) => c.kecamatan))].sort(), [customers]);
  const inKecamatan = useMemo(() => (kecamatan ? customers.filter((c) => c.kecamatan === kecamatan) : customers), [customers, kecamatan]);
  const visible = useMemo(
    () => inKecamatan.filter((c) => matchStatus(statusById[c.id], filter) && matchCustomer(c, search)),
    [inKecamatan, statusById, filter, search]
  );
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const baseRef = useRef(null);
  const meRef = useRef(null);
  const fittedRef = useRef(false);
  const [layer, setLayer] = useState('peta');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: false, maxZoom: 19 }).setView([-6.2, 106.63], 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    clusterRef.current = L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false });
    map.addLayer(clusterRef.current);
    mapRef.current = map;
    return () => {
      map.stop();
      map.off();
      map.remove();
      baseRef.current = null;
      meRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (baseRef.current) map.removeLayer(baseRef.current);
    baseRef.current = LAYERS[layer]().addTo(map);
    baseRef.current.bringToBack();
  }, [layer]);

  useEffect(() => {
    const cluster = clusterRef.current;
    cluster.clearLayers();
    const pts = [];
    visible.forEach((c) => {
      if (c.lat == null || c.lng == null) return;
      const meta = STATUS_META[statusById[c.id] || 'none'];
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${meta.color};width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const popup = document.createElement('div');
      popup.innerHTML = `
        <div style="min-width:200px;font-family:inherit">
          <div style="font-weight:800;text-transform:uppercase">${esc(c.nama)}</div>
          <div style="font-size:11px;color:${meta.color};font-weight:600">${meta.label}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${esc(c.id)} · ${esc(c.channel)}</div>
          <div style="font-size:11px;margin:4px 0">${esc(c.alamat)}</div>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button data-act="survey" style="flex:1;background:#2563eb;color:#fff;border-radius:8px;padding:6px;font-size:12px;font-weight:700">Survei</button>
            <a href="${gmapsRoute(c.lat, c.lng)}" target="_blank" rel="noreferrer" style="flex:1;text-align:center;background:#059669;color:#fff;border-radius:8px;padding:6px;font-size:12px;font-weight:700">Rute</a>
          </div>
        </div>`;
      popup.querySelector('[data-act="survey"]').addEventListener('click', () => onSelect(c));
      cluster.addLayer(L.marker([c.lat, c.lng], { icon }).bindPopup(popup));
      pts.push([c.lat, c.lng]);
    });
    // Fit sekali saja (dan saat kecamatan diganti) agar refresh status tidak me-reset posisi peta yang sedang dilihat
    if (pts.length && !fittedRef.current) {
      mapRef.current.fitBounds(pts, { padding: [30, 30], maxZoom: 15, animate: false });
      fittedRef.current = true;
    }
  }, [visible, statusById, onSelect]);

  const locate = async () => {
    setLocating(true);
    try {
      const p = await getCurrentPosition();
      const map = mapRef.current;
      if (meRef.current) map.removeLayer(meRef.current);
      meRef.current = L.layerGroup([
        L.circle([p.lat, p.lng], { radius: p.acc, color: '#2563eb', weight: 1, fillOpacity: 0.1 }),
        L.circleMarker([p.lat, p.lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).bindTooltip('Posisi Anda'),
      ]).addTo(map);
      map.setView([p.lat, p.lng], 16, { animate: false });
    } catch (err) {
      alert('Tidak bisa mengambil lokasi: ' + err.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 text-sm font-black tracking-wide text-slate-800">
          <MapPin size={18} className="text-slate-400" /> MAP OF LOCATION
        </div>
        <KecamatanFilter options={kecamatanList} value={kecamatan}
          onChange={(v) => { setKecamatan(v); fittedRef.current = false; }} />
      </div>
      <SurveyStatsCard customers={inKecamatan} statusById={statusById} filter={filter} onFilter={setFilter} className="mb-4" />
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div ref={elRef} className="h-[calc(100dvh-300px)] min-h-[360px] w-full z-0" />
        {!visible.length && (
          <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
            <span className="bg-white/95 rounded-xl px-4 py-2 text-sm text-slate-500 shadow">Tidak ada toko yang cocok dengan filter.</span>
          </div>
        )}
        <div className="absolute top-3 left-3 z-[400] inline-flex bg-white rounded-xl shadow p-1">
          {['peta', 'satelit'].map((l) => (
            <button key={l} onClick={() => setLayer(l)}
              className={`px-4 py-1.5 text-[11px] font-extrabold tracking-wider rounded-lg ${layer === l ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={locate} title="Lokasi saya"
          className="absolute bottom-24 right-3 z-[400] w-11 h-11 rounded-full bg-white shadow flex items-center justify-center text-slate-700 hover:text-blue-600">
          <Crosshair size={20} className={locating ? 'animate-spin' : ''} />
        </button>
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 rounded-xl px-3 py-2 text-[11px] shadow space-y-1">
          {['none', 'pending', 'sent'].map((k) => (
            <div key={k} className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${STATUS_META[k].dot}`} /> {STATUS_META[k].label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

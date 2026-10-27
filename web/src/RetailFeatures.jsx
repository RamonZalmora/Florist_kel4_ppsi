import React, { useState } from 'react';
import { Upload, Search, ShieldCheck, Package, LoaderCircle } from 'lucide-react';
import { api, money, date } from './api';

export function PhotoField({ name = 'photo', initialValue = '', onBusyChange = () => {} }) {
  const [url, setUrl] = useState(initialValue),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(e) {
    const input = e.target,
      file = input.files[0];
    if (!file) return;
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      const form = new FormData();
      form.append('photo', file);
      const result = await api('/uploads', { method: 'POST', body: form });
      setUrl(result.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
      input.value = '';
    }
  }
  return (
    <div className="photo-field">
      <label>
        {name === 'logo' ? 'URL logo' : 'URL foto'}
        <input
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://… atau /uploads/…"
        />
      </label>
      <label className="upload-label">
        <Upload size={16} />
        {busy ? 'Mengunggah…' : 'Pilih foto dari perangkat'}
        <input
          aria-label={name === 'logo' ? 'Upload logo toko' : 'Upload foto produk'}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={upload}
        />
      </label>
      <p className="hint">
        JPEG/PNG/WebP, maksimal 5 MB dan 25 megapiksel. Foto disimpan lokal dan metadata
        dibersihkan.
      </p>
      {url && <img className="upload-preview" src={url} alt="Pratinjau foto" />}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function StoreEditor({ store, onSaved, notify }) {
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await api('/store', {
        method: 'PUT',
        body: JSON.stringify(Object.fromEntries(new FormData(e.target))),
      });
      onSaved(result);
      notify('Pengaturan toko disimpan. Refresh katalog untuk melihat perubahan.');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel store-editor editor-form" onSubmit={submit}>
      <h2>Pengaturan toko</h2>
      <p className="hint">
        Profil dan kontak disimpan di database. Perubahan tidak membutuhkan restart.
      </p>
      <label>
        Nama toko
        <input name="name" required defaultValue={store.name} maxLength={120} />
      </label>
      <label>
        Alamat toko
        <textarea name="address" defaultValue={store.address} maxLength={500} />
      </label>
      <label>
        Deskripsi toko
        <textarea name="description" defaultValue={store.description} maxLength={1500} />
      </label>
      <label>
        {' '}
        Cerita toko di Tentang Kami
        <textarea
          name="about_story"
          defaultValue={store.about_story || ''}
          maxLength={2000}
          rows={4}
          placeholder="Cerita dan karakter toko"
        />
      </label>
      <label>
        {' '}
        Layanan di Tentang Kami
        <textarea
          name="about_service"
          defaultValue={store.about_service || ''}
          maxLength={2000}
          rows={4}
          placeholder="Layanan dan cara konsultasi"
        />
      </label>
      <label>
        {' '}
        Tips perawatan bunga
        <textarea
          name="care_tips"
          defaultValue={store.care_tips || ''}
          maxLength={2000}
          rows={4}
          placeholder="Panduan perawatan bunga"
        />
      </label>
      <div className="form-grid">
        <label>
          WhatsApp konsultasi
          <input
            name="whatsapp"
            defaultValue={store.whatsapp}
            placeholder="628xxxxxxxxxx"
            maxLength={20}
          />
        </label>
        <label>
          Instagram toko
          <input
            name="instagram"
            defaultValue={store.instagram}
            placeholder="https://www.instagram.com/akun_toko/"
            maxLength={300}
          />
        </label>
      </div>
      <label>
        TikTok toko
        <input
          name="tiktok"
          defaultValue={store.tiktok || ''}
          placeholder="https://www.tiktok.com/@akun_toko"
          maxLength={300}
        />
      </label>
      <PhotoField name="logo" initialValue={store.logo} onBusyChange={setUploading} />
      <button className="btn primary" disabled={busy || uploading}>
        <ShieldCheck size={17} />
        {busy ? 'Menyimpan…' : 'Simpan pengaturan toko'}
      </button>
    </form>
  );
}

export function OrderTracker() {
  const [code, setCode] = useState(''),
    [result, setResult] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(
        await api('/track', { method: 'POST', body: JSON.stringify({ code: code.trim() }) }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="tracking-section" id="tracking">
      <div>
        <span className="eyebrow">YOUR BLOOM JOURNEY</span>
        <h2>Rangkaian Anda, sampai mana?</h2>
        <p>Masukkan kode pelacakan pribadi yang diberikan toko setelah pesanan dicatat.</p>
      </div>
      <div>
        <form onSubmit={submit} className="tracking-form">
          <label>
            Kode pelacakan
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              minLength={32}
              maxLength={32}
              required
              autoComplete="off"
              placeholder="Kode 32 karakter dari toko"
            />
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <Search size={17} />}Lacak pesanan
          </button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="tracking-result" role="status">
            <Package size={25} />
            <div>
              <strong>
                {result.order_code} ·{' '}
                {
                  {
                    pending: 'Baru',
                    processing: 'Diproses',
                    completed: 'Selesai',
                    cancelled: 'Dibatalkan',
                  }[result.status]
                }
              </strong>
              <p>Jadwal pengiriman: {date(result.delivery_date)}</p>
              <small>Koordinasikan perubahan jadwal langsung dengan toko.</small>
            </div>
          </div>
        )}
        <p className="hint">
          Simpan kode secara pribadi. Hasil pelacakan tidak menampilkan nama, telepon, atau catatan
          pelanggan.
        </p>
      </div>
    </section>
  );
}

export function SalesTrend({ trend = [] }) {
  const maximum = Math.max(...trend.map((x) => Number(x.total)), 1);
  return (
    <section className="panel sales-trend">
      <div className="panel-heading">
        <div>
          <h2>Tren penjualan periode</h2>
          <p>
            Harian untuk periode hingga 62 hari; bulanan untuk periode lebih panjang. Tanggal tanpa
            penjualan bernilai nol.
          </p>
        </div>
      </div>
      {trend.length ? (
        <div
          className="trend-scroll"
          role="img"
          aria-label={
            'Tren penjualan: ' + trend.map((x) => x.day + ' ' + money(x.total)).join(', ')
          }
        >
          <div className="trend-bars">
            {trend.map((x) => (
              <div className="trend-column" key={x.day}>
                <div className="trend-bar-space">
                  <div
                    style={{ height: (Number(x.total) / maximum) * 100 + '%' }}
                    title={money(x.total)}
                  />
                </div>
                <small>{x.day}</small>
                <span>{money(x.total)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty">Belum ada penjualan pada periode ini.</div>
      )}
    </section>
  );
}

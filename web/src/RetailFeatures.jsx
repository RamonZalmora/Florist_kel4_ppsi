import { defaultAboutStory } from './store-content';
import { SalesLineChart } from './SalesLineChart';
import React, { useState } from 'react';
import {
  Upload,
  Search,
  ShieldCheck,
  Package,
  LoaderCircle,
  Flower2,
  BookOpen,
  MapPin,
  Globe,
  Sparkles,
  Save,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { storeMapEmbed, storeMapLink } from './store-location';
import { api, money, date } from './api';

export function PhotoField({
  name = 'photo',
  initialValue = '',
  onBusyChange = () => {},
  onValueChange = () => {},
  uploadLabel,
  blankWhenEmpty = false,
}) {
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
      onValueChange(result.url);
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
      <div className="photo-upload-stage">
        {url ? (
          <img className="upload-preview" src={url} alt="Pratinjau foto" />
        ) : (
          <div
            className={
              blankWhenEmpty
                ? 'photo-upload-placeholder photo-upload-blank'
                : 'photo-upload-placeholder'
            }
          >
            {!blankWhenEmpty && (
              <>
                <Upload size={32} />
                <strong>Tambahkan foto terbaik</strong>
                <span>Tampilkan karakter koleksi Anda</span>
              </>
            )}
          </div>
        )}
        <label className="upload-label">
          {busy ? <LoaderCircle size={17} className="spin" /> : <Upload size={17} />}
          {busy ? 'Mengunggah…' : 'Pilih foto dari perangkat'}
          <input
            aria-label={
              uploadLabel || (name === 'logo' ? 'Upload logo toko' : 'Upload foto produk')
            }
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={upload}
          />
        </label>
        <span className="photo-upload-formats">JPG, PNG atau WebP · Maksimal 5 MB</span>
      </div>
      <label>
        {name === 'logo' ? 'URL logo' : 'URL foto'}
        <input
          name={name}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            onValueChange(e.target.value);
          }}
          required={!blankWhenEmpty}
          placeholder="https://… atau /uploads/…"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function StoreEditor({ store, onSaved, notify }) {
  const [draft, setDraft] = useState({
      ...store,
      about_story: store.about_story || defaultAboutStory,
    }),
    [section, setSection] = useState('profile');
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState('');
  const sections = [
    ['profile', 'Profil toko', Flower2],
    ['about', 'Tentang Kami', BookOpen],
    ['location', 'Lokasi toko', MapPin],
    ['channels', 'Kanal digital', Globe],
  ];
  const edit = (name, value) => {
    setDraft((d) => ({ ...d, [name]: value }));
    setDirty(true);
  };
  function field(name, label, { multiline = false, maxLength = 300, ...props } = {}) {
    const Input = multiline ? 'textarea' : 'input';
    return (
      <label>
        {label}
        <Input
          aria-label={label}
          name={name}
          value={draft[name] ?? ''}
          onChange={(e) => edit(name, e.target.value)}
          maxLength={maxLength}
          {...props}
        />
      </label>
    );
  }
  async function submit(e) {
    e.preventDefault();
    setError('');
    const body = {
      ...draft,
      about_service: '',
      care_tips: '',
      logo: new FormData(e.target).get('logo'),
    };
    for (const key of ['latitude', 'longitude'])
      body[key] = String(body[key] ?? '').trim() === '' ? null : Number(body[key]);
    if ((body.latitude === null) !== (body.longitude === null)) {
      setError('Isi kedua koordinat atau kosongkan keduanya.');
      setSection('location');
      return;
    }
    setBusy(true);
    try {
      const saved = await api('/store', { method: 'PUT', body: JSON.stringify(body) });
      setDraft(saved);
      onSaved(saved);
      setDirty(false);
      notify('Pengaturan disimpan. Landing dan Tentang Kami sudah mengikuti data terbaru.');
    } catch (e) {
      setError(e.message);
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  const map = storeMapEmbed(draft),
    link = storeMapLink(draft);
  return (
    <div className="store-settings-layout">
      <form
        className="owner-surface modern-store-editor"
        onSubmit={submit}
        onChange={() => setDirty(true)}
        onInvalidCapture={(e) => {
          const id = e.target.closest('[role=tabpanel]')?.id;
          if (id) setSection(id.replace('store-', ''));
        }}
      >
        <div className="owner-section-tabs" role="tablist" aria-label="Bagian pengaturan toko">
          {sections.map(([id, label, Icon]) => (
            <button
              type="button"
              role="tab"
              aria-selected={section === id}
              aria-controls={'store-' + id}
              id={'tab-' + id}
              key={id}
              onClick={() => setSection(id)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>
        <div className="store-form-body">
          <section
            id="store-profile"
            role="tabpanel"
            aria-labelledby="tab-profile"
            hidden={section !== 'profile'}
          >
            <div className="owner-panel-title">
              <Flower2 />
              <div>
                <h2>Identitas toko</h2>
                <p>Nama, deskripsi, dan logo untuk mengenalkan bisnis Anda.</p>
              </div>
            </div>
            {field('name', 'Nama toko', { required: true, maxLength: 120 })}
            {field('description', 'Deskripsi toko', {
              multiline: true,
              maxLength: 1500,
              rows: 4,
              placeholder: 'Ceritakan secara singkat keunikan toko Anda.',
            })}
            <PhotoField
              name="logo"
              initialValue={store.logo}
              onBusyChange={setUploading}
              onValueChange={(value) => edit('logo', value)}
            />
          </section>
          <section
            id="store-about"
            role="tabpanel"
            aria-labelledby="tab-about"
            hidden={section !== 'about'}
          >
            <div className="owner-panel-title">
              <BookOpen />
              <div>
                <h2>Cerita di balik rangkaian</h2>
                <p>Konten ini tampil langsung pada halaman Tentang Kami.</p>
              </div>
            </div>
            {field('about_story', 'Cerita toko di Tentang Kami', {
              multiline: true,
              maxLength: 2000,
              rows: 9,
              placeholder: 'Ceritakan tentang toko, produk, dan cara pemesanan dalam satu teks.',
            })}
            <p className="owner-inline-note">
              <Sparkles size={16} />
              Gunakan satu kolom ini untuk cerita toko, pilihan produk, dan cara pemesanan.
            </p>
          </section>
          <section
            id="store-location"
            role="tabpanel"
            aria-labelledby="tab-location"
            hidden={section !== 'location'}
          >
            <div className="owner-panel-title">
              <MapPin />
              <div>
                <h2>Alamat & titik lokasi</h2>
                <p>Alamat dan peta akan tampil di halaman Tentang Kami.</p>
              </div>
            </div>
            {field('address', 'Alamat toko', {
              multiline: true,
              maxLength: 500,
              rows: 3,
              placeholder: 'Nama jalan, kecamatan, Pekanbaru, Riau',
            })}
            <div className="form-grid">
              {field('latitude', 'Latitude (lintang)', {
                type: 'number',
                step: 'any',
                min: -90,
                max: 90,
                placeholder: '0.4734722222',
              })}
              {field('longitude', 'Longitude (bujur)', {
                type: 'number',
                step: 'any',
                min: -180,
                max: 180,
                placeholder: '101.3748055556',
              })}
            </div>
            <p className="hint">
              Di Google Maps, klik kanan pada titik toko lalu salin dua angka koordinat. Angka
              pertama adalah latitude, kedua longitude.
            </p>
            {field('map_url', 'Link Google Maps', {
              type: 'url',
              maxLength: 1000,
              placeholder: 'https://maps.app.goo.gl/...',
            })}
            <p className="owner-inline-note">
              <MapPin size={16} />
              Jika koordinat diisi, peta dan petunjuk arah menggunakan titik tersebut. Link dipakai
              saat koordinat dikosongkan.
            </p>
            {map && (
              <iframe
                className="settings-map-preview"
                title="Pratinjau titik lokasi toko"
                src={map}
                loading="lazy"
              />
            )}
          </section>
          <section
            id="store-channels"
            role="tabpanel"
            aria-labelledby="tab-channels"
            hidden={section !== 'channels'}
          >
            <div className="owner-panel-title">
              <Globe />
              <div>
                <h2>Tetap terhubung</h2>
                <p>Kontak konsultasi dan tautan toko pada landing page.</p>
              </div>
            </div>
            {field('whatsapp', 'WhatsApp konsultasi', {
              maxLength: 20,
              inputMode: 'numeric',
              pattern: '[0-9]{8,20}|',
              placeholder: '628xxxxxxxxxx',
            })}
            <p className="hint">Gunakan kode negara 62, tanpa tanda + atau spasi.</p>
            {field('instagram', 'Instagram toko', {
              type: 'url',
              placeholder: 'https://www.instagram.com/akun_toko/',
            })}
            {field('tiktok', 'TikTok toko', {
              type: 'url',
              placeholder: 'https://www.tiktok.com/@akun_toko',
            })}
            {field('shopee', 'Shopee toko', {
              type: 'url',
              placeholder: 'https://shopee.co.id/nama_toko',
            })}
            {field('tokopedia', 'Tokopedia toko', {
              type: 'url',
              placeholder: 'https://www.tokopedia.com/nama_toko',
            })}
          </section>
        </div>
        <div className="store-save-bar">
          <span className={dirty ? 'has-changes' : ''}>
            <span className="online-dot" />
            {dirty ? 'Ada perubahan belum disimpan' : 'Profil toko tersimpan'}
          </span>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn primary" disabled={busy || uploading}>
            <Save size={16} />
            {busy ? 'Menyimpan...' : 'Simpan pengaturan toko'}
          </button>
        </div>
      </form>
      <aside className="store-preview-column">
        <section className="store-profile-preview owner-surface">
          <span className="owner-preview-tag">
            <Eye size={14} />
            Pratinjau profil
          </span>
          <img src={draft.logo || '/assets/bien-mark.svg'} alt="Logo toko" />
          <h2>{draft.name || 'Nama toko'}</h2>
          <p>{draft.description || 'Deskripsi singkat toko Anda.'}</p>
          <div className="store-preview-address">
            <MapPin size={18} />
            <span>{draft.address || 'Alamat belum diisi'}</span>
          </div>
          {link && (
            <a className="btn outline" href={link} target="_blank" rel="noreferrer">
              Lihat titik lokasi
              <ArrowUpRight size={15} />
            </a>
          )}
        </section>
        <section className="owner-surface store-sync-note">
          <Globe size={24} />
          <h3>Terhubung ke landing</h3>
          <p>
            Setelah disimpan, profil, cerita, kontak, dan lokasi terbaru tampil saat halaman publik
            dibuka atau dimuat ulang.
          </p>
          <a href="/about" target="_blank" rel="noreferrer">
            Lihat Tentang Kami
            <ArrowUpRight size={15} />
          </a>
        </section>
      </aside>
    </div>
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
  return (
    <section className="panel sales-trend">
      <div className="panel-heading">
        <div>
          <h2>Tren penjualan periode</h2>
          <p>Pergerakan penjualan pada periode yang dipilih.</p>
        </div>
      </div>
      <SalesLineChart trend={trend} />
    </section>
  );
}

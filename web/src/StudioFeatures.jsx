import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Flower2,
  Mail,
  LockKeyhole,
  ShieldCheck,
  Download,
  CalendarDays,
  ArrowUpRight,
  Database,
  Search,
  RefreshCw,
  Package,
  ShoppingBag,
  Tags,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  LockKeyhole as ExportLock,
} from 'lucide-react';
import { api, money, date, today } from './api';

export function RecoveryScreen({
  mode = 'forgot',
  token = '',
  onBack = () => location.assign('/login'),
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [available, setAvailable] = useState(null),
    [deliveryMode, setDeliveryMode] = useState('');
  useEffect(() => {
    if (mode === 'forgot')
      api('/auth/recovery-status')
        .then((r) => {
          setAvailable(r.available);
          setDeliveryMode(r.mode);
        })
        .catch((e) => setError(e.message));
  }, [mode]);
  async function submit(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    if (mode === 'reset' && body.password !== body.confirm) {
      setError('Konfirmasi password belum sama.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const route =
        mode === 'forgot'
          ? '/forgot-password'
          : mode === 'verify'
            ? '/email/verify'
            : '/reset-password';
      const result = await api('/auth' + route, {
        method: 'POST',
        body: JSON.stringify({ ...body, token }),
      });
      setMessage(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const title =
    mode === 'forgot'
      ? 'Kembali ke ruang Anda.'
      : mode === 'verify'
        ? 'Satu langkah lebih aman.'
        : 'Mulai dengan password baru.';
  return (
    <main className="recovery-page">
      <section className="recovery-card">
        <button className="text-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Kembali ke login
        </button>
        <div className="flower-mark">
          <Flower2 size={32} />
        </div>
        <span className="eyebrow">BIEN VENDRE · ACCOUNT CARE</span>
        <h1>{title}</h1>
        <p>
          {mode === 'forgot'
            ? 'Gunakan email pemulihan yang sudah diverifikasi pada akun Anda.'
            : mode === 'verify'
              ? 'Konfirmasikan alamat email agar akun Anda dapat dipulihkan dengan aman.'
              : 'Gunakan minimal 12 karakter. Tautan hanya berlaku satu kali selama 15 menit.'}
        </p>
        {deliveryMode === 'local' && (
          <p className="soft-note local-mail-note">
            Mode lokal: instruksi disimpan di folder .local/mail pada laptop, bukan dikirim ke
            email. Buka file terbaru dengan Notepad. Email pemulihan harus diverifikasi terlebih
            dahulu lewat Pengaturan.
          </p>
        )}
        {message ? (
          <div className="success-message" role="status">
            <ShieldCheck size={24} />
            <p>{message}</p>
            <a className="btn primary" href="/login">
              Masuk kembali
            </a>
          </div>
        ) : (
          <form className="editor-form" onSubmit={submit}>
            {mode === 'forgot' && (
              <label>
                Email pemulihan
                <input name="email" type="email" required autoComplete="email" />
              </label>
            )}
            {mode === 'reset' && (
              <>
                <label>
                  Password baru
                  <input
                    name="password"
                    type="password"
                    minLength={12}
                    maxLength={72}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  Ulangi password
                  <input name="confirm" type="password" required autoComplete="new-password" />
                </label>
              </>
            )}
            {mode === 'forgot' && available === false && (
              <p className="form-error">
                Pemulihan email belum diaktifkan. Hubungi owner toko untuk bantuan.
              </p>
            )}
            {mode !== 'forgot' && !token && (
              <p className="form-error">
                Tautan tidak lengkap. Buka kembali tautan dari email Anda.
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn primary full"
              disabled={busy || (mode === 'forgot' ? available !== true : !token)}
            >
              {mode === 'verify' ? <ShieldCheck size={17} /> : <Mail size={17} />}{' '}
              {busy
                ? 'Memproses…'
                : mode === 'forgot'
                  ? 'Kirim instruksi pemulihan'
                  : mode === 'verify'
                    ? 'Verifikasi email'
                    : 'Simpan password baru'}
            </button>
          </form>
        )}
        <small className="hint">
          Tautan pemulihan bersifat pribadi. Tim toko tidak akan meminta password Anda.
        </small>
      </section>
    </main>
  );
}

export function AccountSecurity({ notify }) {
  const [profile, setProfile] = useState(null),
    [busy, setBusy] = useState(false),
    [changed, setChanged] = useState(false);
  const [mailMode, setMailMode] = useState('');
  useEffect(() => {
    api('/auth/recovery-status')
      .then((r) => setMailMode(r.mode))
      .catch((e) => notify(e.message, true));
  }, [notify]);
  useEffect(() => {
    api('/auth/profile')
      .then(setProfile)
      .catch((e) => notify(e.message, true));
  }, [notify]);
  async function submit(e, type) {
    e.preventDefault();
    const form = e.target,
      body = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      const r = await api('/auth/' + (type === 'email' ? 'email/request' : 'change-password'), {
        method: 'POST',
        body: JSON.stringify(body),
      });
      notify(r.message);
      form.reset();
      if (type === 'password') setChanged(true);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel security-panel">
      <div className="panel-heading">
        <div>
          <h2>Keamanan & pemulihan akun</h2>
          <p>Jaga akses bisnis tetap di tangan Anda.</p>
        </div>
        <ShieldCheck size={24} />
      </div>
      {mailMode === 'local' && (
        <p className="soft-note local-mail-note">
          Pengujian lokal: tautan verifikasi disimpan sebagai file pribadi di .local/mail. Tidak ada
          email yang dikirim ke internet.
        </p>
      )}
      {changed ? (
        <div className="success-message">
          <p>Password diperbarui dan seluruh sesi telah berakhir.</p>
          <a className="btn primary" href="/login">
            Login dengan password baru
          </a>
        </div>
      ) : (
        <div className="security-forms">
          <form className="editor-form" onSubmit={(e) => submit(e, 'email')}>
            <h3>Email pemulihan</h3>
            <p className="hint">
              {profile?.email_verified
                ? 'Terverifikasi: ' + profile.email
                : 'Belum ada email terverifikasi. Tambahkan alamat yang dapat Anda akses.'}
            </p>
            <label>
              Email
              <input type="email" name="email" required autoComplete="email" />
            </label>
            <label>
              Password saat ini
              <input type="password" name="password" required autoComplete="current-password" />
            </label>
            <button className="btn outline" disabled={busy}>
              <Mail size={17} /> Kirim verifikasi
            </button>
          </form>
          <form className="editor-form" onSubmit={(e) => submit(e, 'password')}>
            <h3>Ganti password</h3>
            <p className="hint">Semua sesi login akan berakhir setelah password berubah.</p>
            <label>
              Password saat ini
              <input
                type="password"
                name="current_password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              Password baru
              <input
                type="password"
                name="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </label>
            <button className="btn primary" disabled={busy}>
              <LockKeyhole size={17} /> Perbarui password
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export function DeliveryAgenda({ data, go }) {
  const [selected, setSelected] = useState(today());
  const active = data.orders.filter((o) => ['pending', 'processing'].includes(o.status)),
    scheduled = active.filter((o) => o.delivery_date.slice(0, 10) === selected),
    late = active.filter((o) => o.delivery_date.slice(0, 10) < today());
  return (
    <>
      <section className="agenda-banner">
        <CalendarDays size={32} />
        <div>
          <span className="eyebrow">EVERY MOMENT MATTERS</span>
          <h2>Tak ada momen yang terlewat.</h2>
          <p>
            {active.length} pesanan aktif · {late.length} melewati tanggal pengiriman
          </p>
        </div>
      </section>
      <div className="panel agenda-controls">
        <label>
          Tanggal pengiriman
          <input
            type="date"
            required
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          />
        </label>
        <span>Agenda dari maksimal 500 pesanan terbaru.</span>
      </div>
      <div className="agenda-list">
        {scheduled.length ? (
          scheduled.map((o) => (
            <article className="panel agenda-card" key={o.id}>
              <div className="agenda-day">
                <strong>{new Date(o.delivery_date).getDate()}</strong>
                <span>
                  {new Date(o.delivery_date).toLocaleDateString('id-ID', { month: 'short' })}
                </span>
              </div>
              <div>
                <span className="eyebrow">
                  BV-{String(o.id).padStart(4, '0')} ·{' '}
                  {o.status === 'pending' ? 'BARU' : 'DIPROSES'}
                </span>
                <h3>{o.customer_name}</h3>
                <p>{o.items.map((i) => `${i.quantity} × ${i.product_name}`).join(', ')}</p>
                <p className="hint">{o.request || 'Tidak ada permintaan khusus.'}</p>
              </div>
              <strong>{money(o.total)}</strong>
            </article>
          ))
        ) : (
          <div className="empty">
            <Flower2 size={36} />
            <p>Tidak ada pesanan aktif pada {selected ? date(selected) : 'tanggal ini'}.</p>
          </div>
        )}
      </div>
      {late.length > 0 && (
        <div className="soft-note">
          Ada {late.length} pesanan aktif dengan tanggal pengiriman yang sudah lewat. Periksa status
          dan koordinasikan dengan pelanggan.
        </div>
      )}
      <button className="btn outline" onClick={() => go('orders')}>
        Buka daftar pesanan <ArrowUpRight size={17} />
      </button>
    </>
  );
}

const dataNames = {
  products: ['Produk', Package, 'Katalog dan harga produk'],
  categories: ['Occasion', Tags, 'Kategori momen pelanggan'],
  product_types: ['Jenis produk', Flower2, 'Pengelompokan jenis produk'],
  orders: ['Pesanan', ShoppingBag, 'Nama pemesan dan jadwal pengiriman'],
  sales: ['Penjualan', BarChart3, 'Transaksi yang sudah selesai'],
  order_items: ['Detail pesanan', Package, 'Produk di dalam setiap pesanan'],
  recommendations: ['Relasi occasion', Tags, 'Hubungan produk dengan occasion'],
  store_settings: ['Profil toko', Flower2, 'Informasi publik toko Anda'],
};
const columnNames = {
  id: 'ID',
  name: 'Nama',
  price: 'Harga',
  flower_type: 'Jenis bunga',
  product_type_id: 'ID jenis',
  size: 'Ukuran',
  description: 'Deskripsi',
  photo: 'Foto',
  active: 'Status',
  category_id: 'ID occasion',
  product_id: 'ID produk',
  note: 'Catatan',
  customer_name: 'Atas nama',
  phone_number: 'Nomor telepon',
  order_date: 'Tanggal pesanan',
  delivery_date: 'Pengiriman',
  request: 'Permintaan',
  status: 'Status',
  total: 'Total',
  order_id: 'ID pesanan',
  product_name: 'Nama produk',
  quantity: 'Jumlah',
  subtotal: 'Subtotal',
  sale_date: 'Tanggal penjualan',
  total_sale: 'Penjualan',
  address: 'Alamat',
  map_url: 'Google Maps',
  latitude: 'Latitude',
  longitude: 'Longitude',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  shopee: 'Shopee',
  tokopedia: 'Tokopedia',
  logo: 'Logo',
  about_story: 'Cerita toko',
  about_service: 'Layanan',
  care_tips: 'Perawatan bunga',
  updated_at: 'Diperbarui',
  code: 'Kode',
};
const moneyColumns = new Set(['price', 'subtotal', 'total', 'total_sale']);
const businessColumns = {
  products: ['name', 'price', 'flower_type', 'active'],
  categories: ['name', 'photo', 'description'],
  product_types: ['name', 'photo', 'code'],
  orders: ['id', 'customer_name', 'phone_number', 'status', 'total'],
  sales: ['order_id', 'sale_date', 'total_sale'],
  order_items: ['order_id', 'product_name', 'quantity', 'subtotal'],
  recommendations: ['category_id', 'product_id', 'note'],
  store_settings: ['name', 'address', 'whatsapp'],
};
function businessValue(key, value) {
  if (value === null || value === '') return '-';
  if (moneyColumns.has(key)) return money(value);
  if (key === 'active') return value ? 'Aktif' : 'Diarsipkan';
  if (key === 'status')
    return (
      {
        pending: 'Belum selesai',
        processing: 'Diproses',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
      }[value] || value
    );
  if (key.endsWith('_date') || key === 'updated_at') return date(value);
  return String(value);
}
export function DataStudio({ notify }) {
  const [tables, setTables] = useState({}),
    [table, setTable] = useState('products'),
    [offset, setOffset] = useState(0),
    [q, setQ] = useState(''),
    [result, setResult] = useState({ rows: [], columns: [], total: 0, offset: 0 }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reload, setReload] = useState(0),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState('');
  useEffect(() => {
    api('/data')
      .then((r) => setTables(r.tables))
      .catch((e) => notify(e.message, true));
  }, [reload, notify]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setSelected(null);
    const timer = setTimeout(() => {
      api(
        '/data/' + table + '?' + new URLSearchParams({ offset: String(offset), limit: '10', q }),
        { signal: controller.signal },
      )
        .then((r) => {
          if (active) {
            setResult(r);
            setError('');
          }
        })
        .catch((e) => {
          if (active && e.name !== 'AbortError') setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [table, offset, q, reload]);
  async function download(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const value = await api('/data/export', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bien-vendre-data-' + today() + '.json';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPassword('');
      notify('Data bisnis berhasil diekspor.');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  const visibleColumns = businessColumns[table].filter((k) => result.columns.includes(k));
  const meta = dataNames[table],
    page = Math.floor(result.offset / 10) + 1,
    pages = Math.max(1, Math.ceil(result.total / 10));
  const pageNumbers = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b);
  return (
    <div className="business-workspace" aria-busy={loading}>
      <div className="owner-command-bar">
        <div>
          <Database size={24} />
          <div>
            <h1>Data bisnis</h1>
            <p>Jelajahi, cari, dan ekspor data toko dalam satu tempat.</p>
          </div>
        </div>
        <button className="btn outline" onClick={() => setReload((v) => v + 1)} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Muat ulang
        </button>
      </div>
      <div className="business-stat-grid">
        {['products', 'orders', 'sales', 'categories'].map((key, i) => {
          const [label, Icon] = dataNames[key];
          return (
            <article className={'reports-stat-card report-tone-' + i} key={key}>
              <span className="reports-stat-icon">
                <Icon size={20} />
              </span>
              <span>{label}</span>
              <strong>{tables[key] ?? '-'}</strong>
              <small>{key === 'sales' ? 'Transaksi tercatat' : 'Seluruh data tersimpan'}</small>
            </article>
          );
        })}
      </div>
      <div className="business-layout">
        <aside className="owner-surface business-nav">
          <h2>
            <Database size={17} />
            Jelajahi data
          </h2>
          {Object.entries(dataNames).map(([key, [label, Icon]]) => (
            <button
              key={key}
              aria-pressed={table === key}
              onClick={() => {
                setTable(key);
                setOffset(0);
                setQ('');
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              <strong>{tables[key] ?? 0}</strong>
            </button>
          ))}
          <p>
            <ShieldCheck size={15} />
            Data di sini hanya dapat dilihat. Perubahan dilakukan dari halaman pengelolaan terkait.
          </p>
        </aside>
        <section className="owner-surface business-data-panel">
          <div className="business-table-heading">
            <div>
              <h2>
                {meta[0]}
                <span>{result.total}</span>
              </h2>
              <p>{meta[2]}</p>
            </div>
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="Cari data bisnis"
                placeholder={'Cari di ' + meta[0].toLowerCase() + '...'}
                maxLength={120}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOffset(0);
                }}
              />
            </label>
          </div>
          {error ? (
            <div className="empty" role="alert">
              {error}
              <button className="btn outline" onClick={() => setReload((v) => v + 1)}>
                Coba lagi
              </button>
            </div>
          ) : (
            <>
              <div className="business-table-scroll">
                <table className="business-data-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      {visibleColumns.map((k) => (
                        <th key={k}>{columnNames[k] || k}</th>
                      ))}
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={row.id ?? i}>
                        <td>{result.offset + i + 1}</td>
                        {visibleColumns.map((k) => (
                          <td key={k} title={businessValue(k, row[k])}>
                            {k === 'photo' || k === 'logo' ? (
                              row[k] ? (
                                <img src={row[k]} alt="" loading="lazy" />
                              ) : (
                                '-'
                              )
                            ) : (
                              <span
                                className={
                                  k === 'status' || k === 'active'
                                    ? 'business-status status-' + String(row[k])
                                    : ''
                                }
                              >
                                {businessValue(k, row[k])}
                              </span>
                            )}
                          </td>
                        ))}
                        <td>
                          <button
                            className="icon-btn"
                            aria-label={'Detail data ' + row.id}
                            onClick={() => setSelected(row)}
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!result.rows.length && (
                <div className="empty">
                  <Search size={27} />
                  {loading
                    ? 'Memuat data...'
                    : q
                      ? 'Tidak ada data sesuai pencarian.'
                      : 'Belum ada data.'}
                </div>
              )}
            </>
          )}
          <div className="business-pagination">
            <span>
              {result.total ? result.offset + 1 : 0}-{Math.min(result.offset + 10, result.total)}{' '}
              dari {result.total} data
            </span>
            <nav aria-label="Halaman data bisnis">
              <button
                aria-label="Halaman sebelumnya"
                disabled={loading || page === 1}
                onClick={() => setOffset((page - 2) * 10)}
              >
                <ChevronLeft size={15} />
              </button>
              {pageNumbers.map((p, i) => (
                <React.Fragment key={p}>
                  {i > 0 && p - pageNumbers[i - 1] > 1 && <span>...</span>}
                  <button
                    aria-label={'Halaman ' + p}
                    aria-current={p === page ? 'page' : undefined}
                    disabled={loading}
                    onClick={() => setOffset((p - 1) * 10)}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
              <button
                aria-label="Halaman berikutnya"
                disabled={loading || page === pages}
                onClick={() => setOffset(page * 10)}
              >
                <ChevronRight size={15} />
              </button>
            </nav>
          </div>
        </section>
      </div>
      {selected && (
        <section className="owner-surface business-record-detail" aria-label="Detail data terpilih">
          <div className="owner-panel-title">
            <Eye />
            <div>
              <h2>
                Detail {meta[0].toLowerCase()} #{selected.id}
              </h2>
              <p>Informasi lengkap dari baris yang dipilih.</p>
            </div>
            <button
              className="icon-btn"
              aria-label="Tutup detail data"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
          </div>
          <dl>
            {Object.entries(selected).map(([k, v]) => (
              <div key={k}>
                <dt>{columnNames[k] || k}</dt>
                <dd>{businessValue(k, v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <details className="owner-surface business-export">
        <summary>
          <span>
            <Download size={21} />
            <span>
              <strong>Ekspor seluruh data bisnis</strong>
              <small>Unduh arsip JSON katalog, pesanan, penjualan, dan profil toko.</small>
            </span>
          </span>
          <ChevronRight size={18} />
        </summary>
        <form onSubmit={download}>
          <div>
            <h3>
              <ExportLock size={17} />
              Konfirmasi owner
            </h3>
            <p>
              Ekspor berisi semua tabel bisnis, termasuk kontak pemesan. Akun, password, sesi, dan
              token tidak disertakan. File ini bukan backup database lengkap.
            </p>
          </div>
          <label>
            Konfirmasi password owner
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="btn primary" disabled={busy}>
            <Download size={16} />
            {busy ? 'Memproses...' : 'Unduh JSON'}
          </button>
        </form>
      </details>
    </div>
  );
}

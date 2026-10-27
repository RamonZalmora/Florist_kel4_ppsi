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
    [available, setAvailable] = useState(null);
  useEffect(() => {
    if (mode === 'forgot')
      api('/auth/recovery-status')
        .then((r) => setAvailable(r.available))
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

export function DataStudio({ notify }) {
  const [tables, setTables] = useState({}),
    [table, setTable] = useState('products'),
    [offset, setOffset] = useState(0),
    [rows, setRows] = useState([]),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState('');
  useEffect(() => {
    api('/data')
      .then((r) => setTables(r.tables))
      .catch((e) => notify(e.message, true));
  }, [notify]);
  useEffect(() => {
    let active = true;
    setRows([]);
    api('/data/' + table + '?offset=' + offset)
      .then((r) => {
        if (active) setRows(r.rows);
      })
      .catch((e) => notify(e.message, true));
    return () => {
      active = false;
    };
  }, [table, offset, notify]);
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
        ),
        a = document.createElement('a');
      a.href = url;
      a.download = 'bien-vendre-data-' + today() + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPassword('');
      notify('Data bisnis berhasil diekspor. Simpan file secara pribadi.');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="agenda-banner">
        <Database size={30} />
        <div>
          <span className="eyebrow">YOUR BUSINESS, YOUR DATA</span>
          <h2>Data bisnis dalam jangkauan.</h2>
          <p>Lihat tabel tanpa menginstal aplikasi database tambahan.</p>
        </div>
      </section>
      <div className="data-tabs">
        {Object.entries(tables).map(([name, count]) => (
          <button
            key={name}
            className={name === table ? 'active' : ''}
            onClick={() => {
              setTable(name);
              setOffset(0);
            }}
          >
            {name}
            <strong>{count}</strong>
          </button>
        ))}
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              {Object.keys(rows[0] || { data: '' }).map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {Object.values(r).map((v, j) => (
                  <td className="data-value" key={j}>
                    {v === null ? '—' : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">Belum ada data.</div>}
      </section>
      <div className="toolbar data-pagination">
        <button className="btn outline" disabled={!offset} onClick={() => setOffset((o) => o - 50)}>
          Sebelumnya
        </button>
        <span>
          Baris {tables[table] ? offset + 1 : 0}–{Math.min(offset + 50, tables[table] || 0)}
        </span>
        <button
          className="btn outline"
          disabled={offset + 50 >= (tables[table] || 0)}
          onClick={() => setOffset((o) => o + 50)}
        >
          Berikutnya
        </button>
      </div>
      <form className="panel export-panel" onSubmit={download}>
        <div>
          <h2>Ekspor data bisnis</h2>
          <p>
            JSON berisi katalog, pesanan, dan penjualan. Akun, hash password, sesi, dan token tidak
            disertakan. File ini bukan backup database lengkap.
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
          <Download size={17} />
          {busy ? 'Memproses…' : 'Unduh JSON'}
        </button>
      </form>
    </>
  );
}

import { PhotoField, StoreEditor, SalesTrend } from './RetailFeatures';
import { RecoveryScreen, AccountSecurity, DataStudio } from './StudioFeatures';
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Flower2,
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ShoppingBag,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Search,
  ArrowUpRight,
  ArrowRight,
  Plus,
  X,
  Menu,
  Download,
  Check,
  ChevronRight,
  Leaf,
  Heart,
  CalendarDays,
  Eye,
  Pencil,
  Trash2,
  LoaderCircle,
  ArrowLeft,
  Phone,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Image,
  ShoppingBasket,
  LockKeyhole,
  Instagram,
  MessageCircle,
} from 'lucide-react';
import { api, setCsrf, money, date, today, orderCode } from './api';
import './styles.css';
const statuses = {
  pending: 'Belum selesai',
  completed: 'Selesai',
};
const asset = '/assets/bouquet-rose.svg';
function Photo({ src, alt, ...props }) {
  return (
    <img
      src={
        (src === '/assets/bouquet-rose.svg' && alt === 'Blush Graduation'
          ? '/assets/bouquets/graduation-pastel.webp'
          : src === '/assets/frame.svg' && alt === 'Memories Frame'
            ? '/assets/bouquets/gift-frame.webp'
            : null) ||
        {
          '/assets/bouquet-rose.svg': '/assets/product-rose.png',
          '/assets/bouquet-sun.svg': '/assets/product-sun.png',
          '/assets/bouquet-ivory.svg': '/assets/product-ivory.png',
        }[src] ||
        src ||
        asset
      }
      alt={alt}
      loading="lazy"
      onError={(e) => {
        if (!e.currentTarget.src.endsWith('bouquet-rose.svg')) e.currentTarget.src = asset;
      }}
      {...props}
    />
  );
}
function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    const prev = document.activeElement,
      old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector('.modal');
    dialog?.focus();
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = [...dialog.querySelectorAll('button,input,select,textarea,a[href]')].filter(
          (el) => !el.disabled,
        );
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', handler);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        className={'modal ' + (wide ? 'wide' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Empty({ text = 'Belum ada data.', children }) {
  return (
    <div className="empty">
      <Flower2 size={34} />
      <p>{text}</p>
      {children}
    </div>
  );
}
function Badge({ status }) {
  return (
    <span className={'badge ' + status}>
      <i />
      {statuses[status] || status}
    </span>
  );
}
function App() {
  const [recovery] = useState(() => {
    const mode =
      location.pathname === '/reset-password'
        ? 'reset'
        : location.pathname === '/verify-email'
          ? 'verify'
          : null;
    const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    if (mode) history.replaceState(null, '', location.pathname);
    return { mode, token };
  });
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true),
    [view, setView] = useState(location.pathname === '/login' ? 'login' : 'catalog'),
    [toast, setToast] = useState(null);
  const notify = useCallback((message, error = false) => setToast({ message, error }), []);
  useEffect(() => {
    api('/auth/me')
      .then((u) => {
        setUser(u);
        setCsrf(u.csrf_token);
        setView(['/catalog', '/about', '/'].includes(location.pathname) ? 'catalog' : 'dashboard');
      })
      .catch((e) => {
        if (e.status !== 401) notify(e.message, true);
      })
      .finally(() => setChecking(false));
  }, [notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setCsrf('');
      setView('catalog');
    } catch (e) {
      notify(e.message, true);
    }
  }
  if (recovery.mode) return <RecoveryScreen mode={recovery.mode} token={recovery.token} />;
  if (checking)
    return (
      <div className="boot">
        <Flower2 size={44} />
        <p>Menyiapkan cerita indah Anda…</p>
      </div>
    );
  return (
    <>
      {view === 'login' ? (
        <Login
          onBack={() => setView('catalog')}
          onLogin={(u) => {
            setUser(u);
            setCsrf(u.csrf_token);
            setView('dashboard');
          }}
        />
      ) : view === 'catalog' ? (
        <Catalog
          user={user}
          onLogin={() => setView('login')}
          onDashboard={() => setView('dashboard')}
          notify={notify}
        />
      ) : user ? (
        <Workspace user={user} view={view} setView={setView} logout={logout} notify={notify} />
      ) : (
        <Login
          onBack={() => setView('catalog')}
          onLogin={(u) => {
            setUser(u);
            setCsrf(u.csrf_token);
            setView('dashboard');
          }}
        />
      )}
      {toast && (
        <div className={'toast ' + (toast.error ? 'error' : '')} role="status">
          {toast.error ? <X size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Tutup notifikasi">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
function Login({ onBack, onLogin }) {
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.target);
    try {
      onLogin(
        await api('/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(f)) }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (forgot) return <RecoveryScreen onBack={() => setForgot(false)} />;
  return (
    <div className="login-page">
      <div className="login-art">
        <a className="brand" href="/catalog">
          <Flower2 /> Bien Vendre<span>FLORIST & GIFTS</span>
        </a>
        <div>
          <span className="eyebrow">A LITTLE BLOOM, A LOT OF LOVE</span>
          <h1>
            Setiap bunga,
            <br />
            punya cerita.
          </h1>
          <p>
            Kelola setiap pesanan dengan perhatian.
            <br />
            Tumbuhkan bisnis, satu momen pada satu waktu.
          </p>
        </div>
      </div>
      <div className="login-panel">
        <button className="text-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Kembali ke katalog
        </button>
        <div className="login-form">
          <div className="flower-mark">
            <Flower2 size={30} />
          </div>
          <span className="eyebrow">RUANG KERJA BIEN VENDRE</span>
          <h2>Selamat datang kembali.</h2>
          <p>Masuk sebagai admin atau owner untuk melanjutkan.</p>
          <form onSubmit={submit}>
            <label>
              Username
              <input
                name="username"
                required
                autoComplete="username"
                placeholder="Masukkan username"
                maxLength={64}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Masukkan password"
                maxLength={128}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary full" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={18} /> : <LockKeyhole size={17} />}{' '}
              {busy ? 'Memproses…' : 'Masuk ke dashboard'}
              <ArrowRight size={18} />
            </button>
          </form>
          <button className="text-btn recovery-link" onClick={() => setForgot(true)}>
            Lupa password?
          </button>
          <div className="security-note">
            <ShieldCheck size={16} /> Akses aman, sesuai peran Anda.
          </div>
        </div>
        <small>© {new Date().getFullYear()} Bien Vendre. Crafted with care.</small>
      </div>
    </div>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.93 9.93 0 0 0-8.53 15.05L2 22l5.11-1.34A9.94 9.94 0 1 0 12.04 2Zm0 18.13a8.13 8.13 0 0 1-4.14-1.13l-.3-.18-3.03.8.81-2.95-.2-.31a8.16 8.16 0 1 1 6.86 3.77Zm4.48-6.11c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12s-.62.79-.76.95c-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.21-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.8-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2.01 0 1.18.86 2.33.98 2.49.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.18 1.12.15 1.54.09.47-.07 1.44-.59 1.64-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}
function MarketplaceIcon({ name }) {
  if (name === 'Shopee')
    return (
      <svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M8 10h16l1.6 17H6.4L8 10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="2" />
        <path
          d="M19.4 15.4c-.8-.8-2-1.2-3.4-1.2-1.7 0-2.8.8-2.8 2s.9 1.7 2.9 2c2.1.3 2.9.9 2.9 2s-1.2 2.1-3 2.1c-1.4 0-2.7-.5-3.5-1.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 9 4 4l6 3a14 14 0 0 1 12 0l6-3-1 5a11 11 0 1 1-22 0Z" fill="currentColor" />
      <circle cx="11" cy="15" r="5" fill="#278342" />
      <circle cx="21" cy="15" r="5" fill="#278342" />
      <circle cx="11" cy="15" r="2" fill="white" />
      <circle cx="21" cy="15" r="2" fill="white" />
      <path d="m13.5 21 2.5 2 2.5-2" stroke="#278342" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function getSocialChannels(store, whatsapp) {
  const instagram =
    /^https:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(store.instagram || '') ||
    /^https:\/\/share\.google\/[a-zA-Z0-9_-]+\/?$/.test(store.instagram || '');
  const shopee = /^https:\/\/(?:www\.)?shopee\.co\.id\/[a-zA-Z0-9_.-]+\/?$/.test(
    store.shopee || '',
  );
  let tokopedia = false;
  try {
    const u = new URL(store.tokopedia);
    tokopedia =
      u.protocol === 'https:' &&
      ['tokopedia.com', 'www.tokopedia.com'].includes(u.hostname) &&
      /^\/[a-zA-Z0-9_.-]+\/?$/.test(u.pathname) &&
      !u.username &&
      !u.password &&
      !u.port;
  } catch {
    /* no valid store link */
  }
  return [
    {
      name: 'WhatsApp',
      icon: <WhatsAppIcon />,
      href: whatsapp ? 'https://wa.me/' + whatsapp : '',
      className: 'wa',
    },
    {
      name: 'Shopee',
      icon: <MarketplaceIcon name="Shopee" />,
      href: shopee ? store.shopee : '',
      className: 'shopee',
    },
    {
      name: 'Tokopedia',
      icon: <MarketplaceIcon name="Tokopedia" />,
      href: tokopedia ? store.tokopedia : '',
      className: 'tokopedia',
    },
    {
      name: 'Instagram',
      icon: <Instagram size={25} />,
      href: instagram ? store.instagram : '',
      className: 'ig',
    },
  ];
}
function SocialLinks({ store, whatsapp }) {
  return (
    <div className="social-links">
      {getSocialChannels(store, whatsapp).map(({ name, icon, href }) =>
        href ? (
          <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={name}>
            {icon}
            <span>{name}</span>
            <ExternalLink size={13} />
          </a>
        ) : (
          <span
            key={name}
            className="social-unavailable"
            aria-label={name + ' belum dikonfigurasi'}
          >
            {icon}
            <span>{name}</span>
            <small>Segera hadir</small>
          </span>
        ),
      )}
    </div>
  );
}
function FloatingSocial({ store, whatsapp }) {
  return (
    <aside className="floating-social" aria-label="Media sosial toko">
      <span className="floating-label">HUBUNGI</span>
      {getSocialChannels(store, whatsapp).map(({ name, icon, href, className }) =>
        href ? (
          <a
            key={name}
            className={className}
            href={href}
            target="_blank"
            rel="noreferrer"
            title={name}
            aria-label={name}
          >
            {icon}
          </a>
        ) : (
          <span
            key={name}
            className={className + ' disabled'}
            title={name + ' belum dikonfigurasi'}
            aria-label={name + ' belum dikonfigurasi'}
          >
            {icon}
          </span>
        ),
      )}
    </aside>
  );
}
function AboutPage({ store, whatsapp, onExplore }) {
  return (
    <div className="about-page">
      <section className="about-intro">
        <div className="about-intro-copy">
          <span className="eyebrow">THE STORY OF {store.name || 'BIEN VENDRE'}</span>
          <h1>
            Untuk momen yang <em>ingin dikenang.</em>
          </h1>
          <p>
            {store.description ||
              'Bien Vendre menghadirkan rangkaian bunga dan hadiah yang membantu Anda menyampaikan perhatian di setiap momen istimewa.'}
          </p>
          <button className="btn primary" onClick={onExplore}>
            Jelajahi koleksi <ArrowUpRight size={17} />
          </button>
        </div>
        <div
          className="about-intro-photo"
          role="img"
          aria-label="Rangkaian bunga pilihan florist"
        />
      </section>
      <section className="about-story">
        <div>
          <span className="eyebrow">FLORIST & GIFTS</span>
          <h2>
            Dirangkai untuk
            <br />
            <em>cerita Anda.</em>
          </h2>
        </div>
        <div>
          <p>
            {store.about_story ||
              'Kami membantu Anda menemukan rangkaian yang sesuai untuk pernikahan, wisuda, ulang tahun, dan hadiah spesial. Jelajahi koleksi dan rekomendasi berdasarkan momen yang ingin dirayakan.'}
          </p>
          <p>
            {store.about_service ||
              'Setiap produk dilengkapi informasi jenis bunga, ukuran, dan harga. Untuk mendiskusikan pilihan atau permintaan khusus, hubungi toko melalui kanal yang tersedia.'}
          </p>
        </div>
      </section>
      <section className="about-values">
        <article>
          <Flower2 />
          <h3>Pilihan untuk setiap momen</h3>
          <p>
            Temukan buket dan hadiah berdasarkan occasion, dari perayaan hingga ungkapan perhatian.
          </p>
        </article>
        <article>
          <Heart />
          <h3>Sentuhan personal</h3>
          <p>Diskusikan kebutuhan dan detail hadiah bersama tim toko sebelum memesan.</p>
        </article>
        <article>
          <Leaf />
          <h3>Informasi yang jelas</h3>
          <p>Lihat deskripsi, jenis, ukuran, dan harga produk untuk membantu memilih rangkaian.</p>
        </article>
      </section>
      <section className="about-contact">
        <div>
          <span className="eyebrow">LET'S CONNECT</span>
          <h2>Mari ceritakan momen Anda.</h2>
          <p>
            Hubungi toko untuk konsultasi, ketersediaan bunga, detail pesanan, dan informasi
            pengambilan atau pengiriman.
          </p>
          {store.address && (
            <p>
              <Leaf size={16} /> {store.address}
            </p>
          )}
          <SocialLinks store={store} whatsapp={whatsapp} />
        </div>
        <div className="about-care">
          <h3>Merawat bunga potong</h3>
          <p>
            {store.care_tips ||
              'Potong ujung batang secara miring, gunakan air bersih, dan ganti air secara berkala. Simpan rangkaian jauh dari panas dan sinar matahari langsung.'}
          </p>
          <small>Ketersediaan bunga dan detail rangkaian dapat dikonfirmasi kepada toko.</small>
        </div>
      </section>
    </div>
  );
}
function Catalog({ user, onLogin, onDashboard, notify }) {
  const [sort, setSort] = useState('newest'),
    [page, setPage] = useState(location.pathname === '/about' ? 'about' : 'catalog'),
    [occasion, setOccasion] = useState(false),
    [catalogPage, setCatalogPage] = useState(1),
    [favorites, setFavorites] = useState([]);
  const [visitor] = useState(() => {
    let id = localStorage.getItem('bv_visitor');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('bv_visitor', id);
    }
    return id;
  });
  useEffect(() => {
    api('/favorites/' + visitor)
      .then(setFavorites)
      .catch(() => {});
  }, [visitor]);
  async function toggleFavorite(p) {
    try {
      const favorite = !favorites.includes(String(p.id));
      const result = await api('/favorites/' + p.id, {
        method: 'PUT',
        body: JSON.stringify({ visitor, favorite }),
      });
      setFavorites((current) =>
        favorite ? [...current, String(p.id)] : current.filter((id) => id !== String(p.id)),
      );
      setProducts((current) =>
        current.map((item) =>
          item.id === p.id ? { ...item, favorite_count: result.count } : item,
        ),
      );
    } catch (e) {
      notify(e.message, true);
    }
  }
  const [products, setProducts] = useState([]),
    [categories, setCategories] = useState([]),
    [store, setStore] = useState({}),
    [category, setCategory] = useState(''),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    Promise.all([api('/categories'), api('/store')])
      .then(([c, s]) => {
        setCategories(c);
        setStore(s);
      })
      .catch((e) => notify(e.message, true));
  }, [notify]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api(
        '/products?' +
          new URLSearchParams({
            search,
            sort: occasion ? sort : 'popular',
            ...(category ? { category } : {}),
          }),
      )
        .then((p) => {
          if (active) {
            setProducts(p);
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, search, sort, occasion]);
  useEffect(() => setCatalogPage(1), [category, search, sort, occasion]);
  useEffect(() => {
    const syncPage = () => setPage(location.pathname === '/about' ? 'about' : 'catalog');
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);
  function navigatePublic(next, hash = '') {
    const path = next === 'about' ? '/about' : '/catalog';
    history.pushState(null, '', path + hash);
    setPage(next);
    if (next === 'about') window.scrollTo({ top: 0, behavior: 'smooth' });
    else
      setTimeout(
        () => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }),
        0,
      );
  }
  async function showProduct(id) {
    try {
      setDetail(await api('/products/' + id));
    } catch (e) {
      notify(e.message, true);
    }
  }
  const pageCount = Math.max(1, Math.ceil(products.length / 9));
  const currentPage = Math.min(catalogPage, pageCount);
  const visibleProducts = occasion
    ? products.slice((currentPage - 1) * 9, currentPage * 9)
    : products.slice(0, 9);
  const whatsapp = store.whatsapp?.replace(/\D/g, '');
  const consult = (p) =>
    whatsapp
      ? 'https://wa.me/' +
        whatsapp +
        '?text=' +
        encodeURIComponent(
          `Halo, saya ingin memesan ${p.name} seharga ${money(p.price)}. Apakah produk ini tersedia?`,
        )
      : null;
  return (
    <div className="catalog-page">
      <nav className="public-nav">
        <a className="brand" href="/catalog">
          {store.logo ? (
            <img className="store-logo" src={store.logo} alt="Logo toko" />
          ) : (
            <Flower2 size={30} />
          )}
          <div>
            {store.name || 'Bien Vendre'}
            <small>FLORIST & GIFTS</small>
          </div>
        </a>
        <div className="nav-links">
          <a
            href="#collection"
            onClick={(e) => {
              e.preventDefault();
              navigatePublic('catalog', '#collection');
              setOccasion(false);
              setCategory('');
            }}
          >
            Koleksi bunga
          </a>
          <a
            href="#collection"
            onClick={(e) => {
              e.preventDefault();
              navigatePublic('catalog', '#collection');
              setOccasion(true);
              setCategory('');
            }}
          >
            Occasion
          </a>
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              navigatePublic('about');
            }}
          >
            Tentang kami
          </a>
        </div>
        <button className="btn outline" onClick={user ? onDashboard : onLogin}>
          {user ? <LayoutDashboard size={16} /> : <LockKeyhole size={16} />}{' '}
          {user ? 'Dashboard' : 'Login tim'}
        </button>
      </nav>
      <main>
        {page === 'catalog' && (
          <>
            {!occasion && (
              <section className="catalog-hero">
                <div className="hero-copy">
                  <span className="pill">
                    <Leaf size={14} /> Dirangkai dengan hati, untuk Anda
                  </span>
                  <h1>
                    Bunga yang indah.
                    <br />
                    Cerita yang <em>bermakna.</em>
                  </h1>
                  <p>
                    Temukan rangkaian bunga dan hadiah untuk setiap momen istimewa. Karena perhatian
                    kecil bisa berarti segalanya.
                  </p>
                  <a className="btn primary" href="#collection">
                    Jelajahi koleksi <ArrowUpRight size={19} />
                  </a>
                  <div className="hero-foot">
                    <Heart size={16} />
                    <span>Personal, penuh makna, dibuat dengan cinta.</span>
                  </div>
                </div>
                <div className="hero-stamp">
                  <Flower2 size={28} />
                  <span>MADE WITH LOVE</span>
                  <small>Bien Vendre</small>
                </div>
              </section>
            )}
            {!occasion && (
              <section className="moments" id="moments">
                <div>
                  <span className="eyebrow">UNTUK SETIAP CERITA</span>
                  <h2>Apa yang ingin Anda rayakan?</h2>
                </div>
                <div className="moment-list">
                  {categories.map((c, i) => (
                    <button
                      className={category === String(c.id) ? 'moment active' : 'moment'}
                      key={c.id}
                      onClick={() => {
                        setOccasion(true);
                        setCategory(String(c.id));
                        document
                          .getElementById('collection')
                          .scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <span>{[<Heart />, <Sparkles />, <Flower2 />, <ShoppingBag />][i % 4]}</span>
                      <strong>{c.name}</strong>
                      <small>{c.description}</small>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="collection" id="collection">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">OUR THOUGHTFUL COLLECTION</span>
                  <h2>
                    {occasion
                      ? 'Bunga untuk setiap occasion'
                      : category
                        ? 'Rekomendasi untuk momen Anda'
                        : 'Sedikit bunga, banyak bahagia.'}
                  </h2>
                  <p>
                    {category
                      ? 'Pilihan produk yang dikurasi berdasarkan kategori.'
                      : 'Pilih rangkaian yang paling dekat dengan cerita Anda.'}
                  </p>
                </div>
                <label className="search-box">
                  <Search size={18} />
                  <input
                    aria-label="Cari produk"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari bunga atau hadiah…"
                  />
                </label>
              </div>
              <div className={occasion ? 'catalog-layout' : 'catalog-home-layout'}>
                {occasion && (
                  <aside className="catalog-sidebar">
                    <h3>Temukan bunga</h3>
                    <div className="filter-tabs">
                      <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>
                        Semua koleksi
                      </button>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          className={category === String(c.id) ? 'active' : ''}
                          onClick={() => setCategory(String(c.id))}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    <div className="catalog-tools">
                      <label>
                        Urutkan
                        <select value={sort} onChange={(e) => setSort(e.target.value)}>
                          <option value="newest">Terbaru diperbarui</option>
                          <option value="popular">Paling banyak favorit</option>
                        </select>
                      </label>
                      <button
                        className="text-btn"
                        onClick={() => {
                          setCategory('');
                          setSort('newest');
                        }}
                      >
                        Reset filter
                      </button>
                    </div>
                  </aside>
                )}
                <div className="catalog-results">
                  {loading ? (
                    <div className="empty">
                      <LoaderCircle className="spin" /> Memuat koleksi…
                    </div>
                  ) : error ? (
                    <Empty text={error} />
                  ) : !products.length ? (
                    <Empty text="Belum ada produk yang sesuai. Coba kategori atau pencarian lain." />
                  ) : (
                    <div className="product-grid">
                      {visibleProducts.map((p, i) => (
                        <article className="product-card" key={p.id}>
                          <div
                            className={'product-picture tone-' + (i % 3)}
                            onClick={() => showProduct(p.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') showProduct(p.id);
                            }}
                          >
                            <Photo src={p.photo} alt={p.name} />
                            <span className="view-product">
                              <Eye size={16} /> Lihat detail
                            </span>
                            {p.categories?.[0] && (
                              <span className="product-tag">{p.categories[0].name}</span>
                            )}
                          </div>
                          <div className="product-card-info">
                            <div>
                              <h3>{p.name}</h3>
                              <p>{p.flower_type}</p>
                            </div>
                            <ArrowUpRight size={20} />
                          </div>
                          <strong className="product-price">{money(p.price)}</strong>
                          <button
                            className={
                              'favorite-btn ' + (favorites.includes(String(p.id)) ? 'selected' : '')
                            }
                            aria-label={
                              (favorites.includes(String(p.id))
                                ? 'Hapus favorit '
                                : 'Tambahkan favorit ') + p.name
                            }
                            aria-pressed={favorites.includes(String(p.id))}
                            onClick={() => toggleFavorite(p)}
                          >
                            <Heart
                              size={17}
                              fill={favorites.includes(String(p.id)) ? 'currentColor' : 'none'}
                            />{' '}
                            {p.favorite_count || 0} favorit
                          </button>
                          {consult(p) ? (
                            <a
                              className="product-order"
                              href={consult(p)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={'Pesan ' + p.name + ' via WhatsApp'}
                            >
                              <MessageCircle size={16} /> Pesan via WhatsApp
                            </a>
                          ) : (
                            <span className="product-order-unavailable">
                              WhatsApp belum tersedia
                            </span>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                  {!loading &&
                    !error &&
                    products.length > 0 &&
                    (occasion ? (
                      <nav className="pagination" aria-label="Halaman produk">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCatalogPage(currentPage - 1)}
                        >
                          Sebelumnya
                        </button>
                        {Array.from({ length: pageCount }, (_, i) => (
                          <button
                            key={i}
                            aria-current={currentPage === i + 1 ? 'page' : undefined}
                            onClick={() => setCatalogPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          disabled={currentPage === pageCount}
                          onClick={() => setCatalogPage(currentPage + 1)}
                        >
                          Selanjutnya
                        </button>
                      </nav>
                    ) : (
                      <button
                        className="btn outline browse-all"
                        onClick={() => {
                          setOccasion(true);
                          setCategory('');
                        }}
                      >
                        Lihat semua koleksi <ArrowRight size={17} />
                      </button>
                    ))}
                </div>
              </div>
            </section>
            <section className="about-banner" id="about">
              <Flower2 size={50} />
              <div>
                <span className="eyebrow">DARI HATI, UNTUK HATI</span>
                <h2>Hadiah yang terasa personal.</h2>
                <p>{store.description || 'Bunga dan hadiah untuk merayakan setiap cerita.'}</p>
                <a
                  href="/about"
                  className="text-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    navigatePublic('about');
                  }}
                >
                  Kenali kami <ArrowRight size={16} />
                </a>
              </div>
            </section>
          </>
        )}
        {page === 'about' && (
          <AboutPage
            store={store}
            whatsapp={whatsapp}
            onExplore={() => {
              setOccasion(false);
              navigatePublic('catalog', '#collection');
            }}
          />
        )}
      </main>
      <footer>
        <div className="brand">
          <Flower2 /> Bien Vendre
        </div>
        <span>© {new Date().getFullYear()} · Florist & Gifts</span>
        <SocialLinks store={store} whatsapp={whatsapp} />
      </footer>
      <FloatingSocial store={store} whatsapp={whatsapp} />
      {detail && (
        <Modal title="Detail produk" onClose={() => setDetail(null)} wide>
          <div className="product-detail">
            <Photo src={detail.photo} alt={detail.name} />
            <div>
              <span className="eyebrow">BIEN VENDRE COLLECTION</span>
              <h2>{detail.name}</h2>
              <strong className="detail-price">{money(detail.price)}</strong>
              <p>{detail.description}</p>
              <dl>
                <dt>Jenis bunga</dt>
                <dd>{detail.flower_type}</dd>
                <dt>Ukuran</dt>
                <dd>{detail.size}</dd>
              </dl>
              <div className="detail-tags">
                {detail.categories.map((c) => (
                  <span key={c.id} title={c.note}>
                    {c.name}
                  </span>
                ))}
              </div>
              {consult(detail) ? (
                <a
                  className="btn primary full"
                  href={consult(detail)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone size={18} /> Pesan via WhatsApp
                </a>
              ) : (
                <p className="hint">
                  Kanal konsultasi toko belum dikonfigurasi. Hubungi toko secara langsung untuk
                  pemesanan.
                </p>
              )}
              <small className="hint">Pesanan dicatat oleh admin setelah konsultasi.</small>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
const navAdmin = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['products', 'Produk', Package],
  ['categories', 'Kategori', Tags],
  ['recommendations', 'Rekomendasi', Sparkles],
  ['orders', 'Pesanan', ShoppingBag],
  ['reports', 'Riwayat & laporan', ChartNoAxesCombined],
  ['customers', 'Pelanggan', Users],
];
const navOwner = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['orders', 'Daftar pesanan', ShoppingBag],
  ['reports', 'Riwayat & laporan', ChartNoAxesCombined],
  ['data', 'Data bisnis', Package],
  ['customers', 'Pelanggan', Users],
];
function Workspace({ user, view, setView, logout, notify }) {
  const [mobile, setMobile] = useState(false),
    [version, setVersion] = useState(0),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState('');
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api('/dashboard'),
      api('/orders'),
      api('/categories'),
      api(user.role === 'admin' ? '/manage/products' : '/products'),
      ...(user.role === 'admin' ? [api('/manage/recommendations')] : []),
    ])
      .then(([dashboard, orders, categories, products, recommendations]) => {
        if (active) setData({ dashboard, orders, categories, products, recommendations });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version, user.role]);
  function go(v) {
    setView(v);
    setMobile(false);
    setQuery('');
  }
  const navigation = user.role === 'admin' ? navAdmin : navOwner,
    title = navigation.find((n) => n[0] === view)?.[1] || 'Pengaturan';
  const shared = { data, query, notify, refresh, user };
  return (
    <div className="workspace">
      <aside className={'sidebar ' + (mobile ? 'open' : '')}>
        <a className="brand" href="/catalog">
          <div className="brand-icon">
            <Flower2 size={23} />
          </div>
          <div>
            Bien Vendre<small>FLORIST & GIFTS</small>
          </div>
        </a>
        <div className="sidebar-label">RUANG KERJA</div>
        <nav>
          {navigation.map(([id, label, Icon]) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => go(id)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-label">LAINNYA</div>
        <nav>
          <button onClick={() => go('settings')} className={view === 'settings' ? 'active' : ''}>
            <Settings size={18} /> Pengaturan
          </button>
          <button onClick={() => go('catalog')}>
            <ExternalLink size={18} /> Lihat katalog
          </button>
        </nav>
        <div className="sidebar-floral">
          <Leaf />
          <span>
            Grow beautifully.
            <br />
            <em>One bloom at a time.</em>
          </span>
          <Flower2 size={36} />
        </div>
        <div className="user-panel">
          <span className="avatar">{user.name[0]}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role === 'admin' ? 'Admin toko' : 'Owner'}</small>
          </div>
          <button onClick={logout} aria-label="Keluar" title="Keluar">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {mobile && <div className="sidebar-overlay" onClick={() => setMobile(false)} />}
      <div className="workspace-main">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Buka menu"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Ruang kerja <ChevronRight size={14} /> <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="today">
              <CalendarDays size={15} />
              {date(new Date())}
            </span>
            <button
              className="icon-btn"
              onClick={refresh}
              aria-label="Muat ulang data"
              title="Muat ulang data"
            >
              <RefreshCw size={17} className={loading ? 'spin' : ''} />
            </button>
            <span className="avatar small">{user.name[0]}</span>
          </div>
        </header>
        <main className="workspace-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">BIEN VENDRE / {user.role.toUpperCase()}</span>
              <h1>{view === 'dashboard' ? 'Dashboard' : title}</h1>
              <p>
                {view === 'dashboard'
                  ? `Selamat datang, ${user.name}. Mari buat hari ini bermakna.`
                  : {
                      products: 'Kelola setiap rangkaian dalam koleksi Anda.',
                      categories: 'Kategori momen untuk rekomendasi yang lebih personal.',
                      recommendations: 'Hubungkan produk terbaik dengan momen yang tepat.',
                      orders: 'Setiap pesanan adalah cerita yang perlu dirawat.',
                      customers: 'Kenali pelanggan dari pesanan yang telah dicatat.',
                      reports: 'Pantau penjualan dan unduh laporan berdasarkan periode.',
                      settings: 'Informasi toko dan akses akun Anda.',
                      data: 'Jelajahi dan unduh data bisnis Anda secara aman.',
                    }[view]}
              </p>
            </div>
            {view !== 'dashboard' && view !== 'settings' && view !== 'reports' && (
              <label className="search-box">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari data…"
                  aria-label="Cari data"
                />
              </label>
            )}
          </div>
          {error ? (
            <Empty text={error}>
              <button className="btn outline" onClick={refresh}>
                Coba lagi
              </button>
            </Empty>
          ) : loading && !data ? (
            <div className="empty">
              <LoaderCircle className="spin" /> Memuat data toko…
            </div>
          ) : (
            data && (
              <>
                {view === 'dashboard' && <Dashboard {...shared} go={go} />}{' '}
                {view === 'products' && <Products {...shared} />}{' '}
                {view === 'categories' && <Categories {...shared} />}{' '}
                {view === 'recommendations' && <Recommendations {...shared} />}{' '}
                {view === 'orders' && <Orders {...shared} />}{' '}
                {view === 'customers' && <Customers {...shared} />}{' '}
                {view === 'reports' && <Reports notify={notify} />}{' '}
                {view === 'data' && <DataStudio notify={notify} />}
                {view === 'settings' && <StoreSettings user={user} notify={notify} />}
              </>
            )
          )}
          <div className="workspace-footer">
            <span>Bien Vendre · Dirangkai dengan hati</span>
            <span>
              <span className="online-dot" /> Data toko tersimpan
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
function Dashboard({ data, user, go }) {
  const { summary, trend, popular } = data.dashboard,
    max = Math.max(...trend.map((t) => Number(t.total)), 1),
    total = trend.reduce((n, t) => n + Number(t.total), 0);
  const stats = [
    [
      'Penjualan bulan ini',
      money(summary.revenue),
      ChartNoAxesCombined,
      'Transaksi pesanan selesai',
      'sage',
    ],
    ['Total pesanan', summary.total_orders, ShoppingBag, 'Pesanan tercatat', 'peach'],
    ['Pelanggan', summary.customers, Users, 'Berdasarkan nomor telepon', 'lavender'],
    ['Produk aktif', summary.products, Package, 'Tersedia di katalog', 'gold'],
  ];
  return (
    <>
      <div className="dashboard-banner">
        <div>
          <span className="eyebrow">LET YOUR BUSINESS BLOOM</span>
          <h2>
            Rangkai kebahagiaan,
            <br />
            tumbuhkan <em>cerita indah.</em>
          </h2>
          <p>Setiap detail kecil membuat momen mereka istimewa.</p>
        </div>
        <span className="banner-pill">
          <Flower2 size={17} /> Made with love
        </span>
      </div>
      <div className="stat-grid">
        {stats.map(([label, value, Icon, hint, tone]) => (
          <article className="stat-card" key={label}>
            <div className={'stat-icon ' + tone}>
              <Icon size={22} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Ringkasan penjualan</h2>
              <p>Performa toko dalam 7 hari terakhir</p>
            </div>
            <span className="period-chip">
              <CalendarDays size={14} /> 7 hari terakhir
            </span>
          </div>
          <div className="chart-summary">
            <strong>{money(total)}</strong>
            <span>Total penjualan selesai</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={
              'Penjualan tujuh hari terakhir: ' +
              trend.map((t) => date(t.day) + ' ' + money(t.total)).join(', ')
            }
          >
            <div className="chart-grid">
              <span>{money(max)}</span>
              <span>{money(max / 2)}</span>
              <span>Rp 0</span>
            </div>
            <div className="bars">
              {trend.map((t, i) => (
                <div className="bar-column" key={t.day}>
                  <div className="bar-area">
                    <div
                      className={'bar ' + (i === 6 ? 'current' : '')}
                      style={{ height: (Number(t.total) / max) * 100 + '%' }}
                      title={money(t.total)}
                    >
                      <span>{money(t.total)}</span>
                    </div>
                  </div>
                  <small>{new Date(t.day).toLocaleDateString('id-ID', { weekday: 'short' })}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel recent-orders">
          <div className="panel-heading">
            <div>
              <h2>Pesanan terbaru</h2>
              <p>Rangkaian yang sedang menunggu cerita</p>
            </div>
            <button className="text-btn" onClick={() => go('orders')}>
              Lihat semua <ArrowUpRight size={16} />
            </button>
          </div>
          <OrderTable
            orders={data.orders.filter((o) => o.status !== 'cancelled').slice(0, 5)}
            user={user}
            compact
          />
        </section>
        <section className="panel popular-products">
          <div className="panel-heading">
            <div>
              <h2>Favorit pelanggan</h2>
              <p>Berdasarkan tanda hati pelanggan</p>
            </div>
            <Heart size={18} />
          </div>
          {popular.map((p, i) => (
            <div className="popular-row" key={p.id}>
              <Photo src={p.photo} alt={p.name} />
              <div>
                <strong>{p.name}</strong>
                <small>{p.favorite_count} favorit</small>
              </div>
              <span>0{i + 1}</span>
            </div>
          ))}
          <button
            className="text-btn full"
            onClick={() => go(user.role === 'admin' ? 'products' : 'catalog')}
          >
            Jelajahi koleksi <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <div className="demo-notice">
        <Image size={15} />
        <span>Data awal merupakan contoh demo, bukan transaksi toko sesungguhnya.</span>
      </div>
    </>
  );
}
function FormActions({ busy, onClose }) {
  return (
    <div className="form-actions">
      <button type="button" className="btn outline" onClick={onClose}>
        Batal
      </button>
      <button className="btn primary" disabled={busy}>
        {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{' '}
        {busy ? 'Menyimpan…' : 'Simpan'}
      </button>
    </div>
  );
}
function useMutation(notify, refresh) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function mutate(path, method, body, done, message = 'Data berhasil disimpan.') {
    setBusy(true);
    setError('');
    try {
      await api(path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      notify(message);
      refresh();
      done?.();
    } catch (e) {
      setError(e.message);
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, mutate, setError };
}
function Products({ data, query, notify, refresh }) {
  const [uploading, setUploading] = useState(false);
  const [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    { busy, error, mutate, setError } = useMutation(notify, refresh);
  const products = data.products.filter((p) =>
    (p.name + ' ' + p.flower_type).toLowerCase().includes(query.toLowerCase()),
  );
  function open(p) {
    setError('');
    setEdit(p);
  }
  function submit(e) {
    e.preventDefault();
    const f = new FormData(e.target),
      body = Object.fromEntries(f);
    body.price = Number(body.price);
    body.active = f.get('active') === 'on';
    mutate(
      '/manage/products' + (edit.id ? '/' + edit.id : ''),
      edit.id ? 'PUT' : 'POST',
      body,
      () => setEdit(null),
    );
  }
  return (
    <>
      <div className="toolbar">
        <span>{products.length} produk dalam koleksi</span>
        <button className="btn primary" onClick={() => open({ active: true, photo: asset })}>
          <Plus size={17} /> Tambah produk
        </button>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Jenis & ukuran</th>
              <th>Harga</th>
              <th>Favorit</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="table-product">
                    <Photo src={p.photo} alt={p.name} />
                    <div>
                      <strong>{p.name}</strong>
                      <small>PRD-{String(p.id).padStart(3, '0')}</small>
                    </div>
                  </div>
                </td>
                <td>
                  {p.flower_type}
                  <small className="cell-sub">{p.size}</small>
                </td>
                <td className="nowrap">{money(p.price)}</td>
                <td>
                  <Heart size={14} /> {p.favorite_count || 0}
                </td>
                <td>
                  <span className={'badge ' + (p.active ? 'completed' : 'cancelled')}>
                    <i />
                    {p.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      aria-label={'Edit ' + p.name}
                      onClick={() => open(p)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label={'Hapus ' + p.name}
                      onClick={() => setRemove(p)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.length && <Empty text="Produk belum tersedia." />}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit produk' : 'Tambah produk'} onClose={() => setEdit(null)}>
          <form className="editor-form" onSubmit={submit}>
            <label>
              Nama produk
              <input name="name" defaultValue={edit.name} required maxLength={120} />
            </label>
            <div className="form-grid">
              <label>
                Harga (Rp)
                <input
                  type="number"
                  name="price"
                  min="1"
                  max="1000000000"
                  step="0.01"
                  defaultValue={edit.price}
                  required
                />
              </label>
              <label>
                Ukuran
                <input
                  name="size"
                  defaultValue={edit.size}
                  placeholder="Medium · 12 tangkai"
                  required
                  maxLength={80}
                />
              </label>
            </div>
            <label>
              Jenis bunga
              <input name="flower_type" defaultValue={edit.flower_type} required maxLength={150} />
            </label>
            <label>
              Deskripsi
              <textarea
                name="description"
                defaultValue={edit.description}
                required
                maxLength={5000}
                rows={4}
              />
            </label>
            <PhotoField initialValue={edit.photo} onBusyChange={setUploading} />
            <label className="checkbox">
              <input type="checkbox" name="active" defaultChecked={edit.active} /> Aktif di katalog
            </label>
            {error && <p className="form-error">{error}</p>}
            <FormActions busy={busy || uploading} onClose={() => setEdit(null)} />
          </form>
        </Modal>
      )}
      {remove && (
        <Modal title="Hapus produk?" onClose={() => setRemove(null)}>
          <p>
            Hapus <strong>{remove.name}</strong>? Produk yang digunakan dalam rekomendasi atau
            pesanan tidak dapat dihapus. Anda dapat menonaktifkannya melalui Edit.
          </p>
          <div className="form-actions">
            <button className="btn outline" onClick={() => setRemove(null)}>
              Batal
            </button>
            <button
              className="btn destructive"
              disabled={busy}
              onClick={() =>
                mutate(
                  '/manage/products/' + remove.id,
                  'DELETE',
                  null,
                  () => setRemove(null),
                  'Produk dihapus.',
                )
              }
            >
              <Trash2 size={16} /> Hapus
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Categories({ data, query, notify, refresh }) {
  const [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    { busy, error, mutate, setError } = useMutation(notify, refresh);
  function submit(e) {
    e.preventDefault();
    mutate(
      '/manage/categories' + (edit.id ? '/' + edit.id : ''),
      edit.id ? 'PUT' : 'POST',
      Object.fromEntries(new FormData(e.target)),
      () => setEdit(null),
    );
  }
  return (
    <>
      <div className="toolbar">
        <span>{data.categories.length} kategori momen</span>
        <button
          className="btn primary"
          onClick={() => {
            setError('');
            setEdit({ photo: '/assets/floral-hero.svg' });
          }}
        >
          <Plus size={17} /> Tambah kategori
        </button>
      </div>
      <div className="category-grid">
        {data.categories
          .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
          .map((c, i) => (
            <article className="panel category-card" key={c.id}>
              <div className={'category-symbol tone-' + (i % 3)}>
                <Flower2 size={30} />
              </div>
              <h2>{c.name}</h2>
              <p>{c.description || 'Belum ada deskripsi.'}</p>
              <span>{c.product_count} rekomendasi produk</span>
              <div className="row-actions">
                <button
                  className="btn outline"
                  onClick={() => {
                    setError('');
                    setEdit(c);
                  }}
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => setRemove(c)}
                  aria-label={'Hapus ' + c.name}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
      </div>
      {!data.categories.length && <Empty text="Belum ada kategori." />}
      {edit && (
        <Modal title={edit.id ? 'Edit kategori' : 'Tambah kategori'} onClose={() => setEdit(null)}>
          <form className="editor-form" onSubmit={submit}>
            <label>
              Nama kategori
              <input name="name" required defaultValue={edit.name} maxLength={100} />
            </label>
            <label>
              Deskripsi
              <textarea
                name="description"
                defaultValue={edit.description}
                maxLength={1000}
                rows={3}
              />
            </label>
            <label>
              URL foto
              <input name="photo" required defaultValue={edit.photo} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <FormActions busy={busy} onClose={() => setEdit(null)} />
          </form>
        </Modal>
      )}
      {remove && (
        <Modal title="Hapus kategori?" onClose={() => setRemove(null)}>
          <p>
            Kategori <strong>{remove.name}</strong> hanya dapat dihapus setelah rekomendasi terkait
            dihapus.
          </p>
          <div className="form-actions">
            <button className="btn outline" onClick={() => setRemove(null)}>
              Batal
            </button>
            <button
              className="btn destructive"
              disabled={busy}
              onClick={() =>
                mutate(
                  '/manage/categories/' + remove.id,
                  'DELETE',
                  null,
                  () => setRemove(null),
                  'Kategori dihapus.',
                )
              }
            >
              Hapus kategori
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Recommendations({ data, query, notify, refresh }) {
  const [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    { busy, error, mutate, setError } = useMutation(notify, refresh);
  function submit(e) {
    e.preventDefault();
    mutate(
      '/manage/recommendations' + (edit.id ? '/' + edit.id : ''),
      edit.id ? 'PUT' : 'POST',
      Object.fromEntries(new FormData(e.target)),
      () => setEdit(null),
    );
  }
  return (
    <>
      <div className="toolbar">
        <span>Pilihan produk untuk setiap momen</span>
        <button
          className="btn primary"
          disabled={!data.products.length || !data.categories.length}
          onClick={() => {
            setError('');
            setEdit({});
          }}
        >
          <Plus size={17} /> Tambah rekomendasi
        </button>
      </div>
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori momen</th>
              <th>Catatan rekomendasi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.recommendations
              .filter((r) =>
                (r.product_name + ' ' + r.category_name)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="table-product">
                      <Photo src={r.photo} alt={r.product_name} />
                      <strong>
                        {r.product_name}
                        {!r.active && <small className="cell-sub">Produk nonaktif</small>}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <span className="tag">{r.category_name}</span>
                  </td>
                  <td>{r.note || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setError('');
                          setEdit(r);
                        }}
                        aria-label={'Edit rekomendasi ' + r.product_name}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => setRemove(r)}
                        aria-label={'Hapus rekomendasi ' + r.product_name}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!data.recommendations.length && (
          <Empty text="Tambahkan kategori dan produk, lalu hubungkan dalam rekomendasi." />
        )}
      </div>
      {edit && (
        <Modal
          title={edit.id ? 'Edit rekomendasi' : 'Tambah rekomendasi'}
          onClose={() => setEdit(null)}
        >
          <form className="editor-form" onSubmit={submit}>
            <label>
              Kategori
              <select name="category_id" defaultValue={edit.category_id || ''} required>
                <option value="" disabled>
                  Pilih kategori
                </option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Produk
              <select name="product_id" defaultValue={edit.product_id || ''} required>
                <option value="" disabled>
                  Pilih produk
                </option>
                {data.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {!p.active ? ' (nonaktif)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alasan rekomendasi
              <textarea name="note" defaultValue={edit.note} maxLength={300} rows={3} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <FormActions busy={busy} onClose={() => setEdit(null)} />
          </form>
        </Modal>
      )}
      {remove && (
        <Modal title="Hapus rekomendasi?" onClose={() => setRemove(null)}>
          <p>
            Hapus rekomendasi <strong>{remove.product_name}</strong> dari kategori{' '}
            {remove.category_name}?
          </p>
          <div className="form-actions">
            <button className="btn outline" onClick={() => setRemove(null)}>
              Batal
            </button>
            <button
              className="btn destructive"
              disabled={busy}
              onClick={() =>
                mutate(
                  '/manage/recommendations/' + remove.id,
                  'DELETE',
                  null,
                  () => setRemove(null),
                  'Rekomendasi dihapus.',
                )
              }
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function OrderTable({ orders, user, compact, onDetail, onEdit, onRemove, onStatus }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pesanan</th>
            <th>Pelanggan</th>
            <th>{compact ? 'Produk' : 'Pengiriman'}</th>
            <th>Total</th>
            {!compact && <th>Status</th>}
            {!compact && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{orderCode(o.id)}</strong>
                <small className="cell-sub">{date(o.order_date)}</small>
              </td>
              <td>
                <div className="customer-cell">
                  <span className="avatar tiny">{o.customer_name[0]}</span>
                  <div>
                    {o.customer_name}
                    {!compact && <small className="cell-sub">{o.phone_number}</small>}
                  </div>
                </div>
              </td>
              <td>
                {compact ? (
                  <>
                    <span>{o.items[0]?.product_name}</span>
                    {o.items.length > 1 && (
                      <small className="cell-sub">+{o.items.length - 1} produk lain</small>
                    )}
                  </>
                ) : (
                  date(o.delivery_date)
                )}
              </td>
              <td className="nowrap">{money(o.total)}</td>
              {!compact && (
                <td>
                  <Badge status={o.status} />
                </td>
              )}
              {!compact && (
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      onClick={() => onDetail(o)}
                      aria-label={'Detail ' + orderCode(o.id)}
                    >
                      <Eye size={16} />
                    </button>
                    {user.role === 'admin' && ['pending', 'processing'].includes(o.status) && (
                      <>
                        <button
                          className="icon-btn"
                          onClick={() => onEdit(o)}
                          aria-label={'Edit ' + orderCode(o.id)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => onStatus(o)}
                          aria-label={'Status ' + orderCode(o.id)}
                        >
                          <ArrowRight size={16} />
                        </button>
                        {o.status === 'pending' && (
                          <button
                            className="icon-btn danger"
                            onClick={() => onRemove(o)}
                            aria-label={'Hapus ' + orderCode(o.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && <Empty text="Belum ada pesanan yang sesuai." />}
    </div>
  );
}
function Orders({ data, user, query, notify, refresh }) {
  const [filter, setFilter] = useState(''),
    [edit, setEdit] = useState(null),
    [detail, setDetail] = useState(null),
    [remove, setRemove] = useState(null),
    [status, setStatus] = useState(null),
    { busy, mutate } = useMutation(notify, refresh);
  const orders = data.orders.filter(
    (o) =>
      o.status !== 'cancelled' &&
      (!filter || o.status === filter) &&
      (o.customer_name + ' ' + o.phone_number + ' ' + orderCode(o.id))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="toolbar">
        <div className="filter-tabs">
          <button className={!filter ? 'active' : ''} onClick={() => setFilter('')}>
            Semua
          </button>
          {Object.entries(statuses).map(([k, v]) => (
            <button key={k} onClick={() => setFilter(k)} className={filter === k ? 'active' : ''}>
              {v}
            </button>
          ))}
        </div>
        {user.role === 'admin' && (
          <button className="btn primary" onClick={() => setEdit({})}>
            <Plus size={17} /> Catat pesanan
          </button>
        )}
      </div>
      <section className="panel">
        <OrderTable
          orders={orders}
          user={user}
          onDetail={setDetail}
          onEdit={setEdit}
          onRemove={setRemove}
          onStatus={setStatus}
        />
      </section>
      <p className="hint">
        Menampilkan maksimal 500 pesanan terbaru. Pesanan selesai tersimpan pada riwayat penjualan
        owner.
      </p>
      {edit && (
        <OrderEditor
          order={edit}
          products={data.products.filter((p) => p.active)}
          notify={notify}
          refresh={refresh}
          onClose={() => setEdit(null)}
        />
      )}{' '}
      {detail && (
        <Modal title={'Pesanan ' + orderCode(detail.id)} onClose={() => setDetail(null)} wide>
          <div className="order-detail-head">
            <div>
              <h3>{detail.customer_name}</h3>
              <p>{detail.phone_number}</p>
            </div>
            <Badge status={detail.status} />
          </div>
          <dl className="order-dates">
            <dt>Tanggal pesanan</dt>
            <dd>{date(detail.order_date)}</dd>
            <dt>Pengiriman</dt>
            <dd>{date(detail.delivery_date)}</dd>
          </dl>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Jumlah</th>
                  <th>Harga</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.product_name}</td>
                    <td>{i.quantity}</td>
                    <td>{money(i.price)}</td>
                    <td>{money(i.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="order-total">
            <span>Total pesanan</span>
            <strong>{money(detail.total)}</strong>
          </div>
          <div className="soft-note">
            <p>
              <strong>Permintaan pelanggan</strong>
              <br />
              {detail.request || 'Tidak ada catatan khusus.'}
            </p>
          </div>
        </Modal>
      )}
      {remove && (
        <Modal title="Hapus pesanan baru?" onClose={() => setRemove(null)}>
          <p>
            Hapus {orderCode(remove.id)} milik {remove.customer_name}? Tindakan ini menghapus item
            pesanan terkait.
          </p>
          <div className="form-actions">
            <button className="btn outline" onClick={() => setRemove(null)}>
              Batal
            </button>
            <button
              className="btn destructive"
              disabled={busy}
              onClick={() =>
                mutate(
                  '/orders/' + remove.id,
                  'DELETE',
                  null,
                  () => setRemove(null),
                  'Pesanan dihapus.',
                )
              }
            >
              Hapus pesanan
            </button>
          </div>
        </Modal>
      )}
      {status && (
        <Modal title="Perbarui status pesanan" onClose={() => setStatus(null)}>
          <p>
            {orderCode(status.id)} · {status.customer_name}
          </p>
          <p>
            Saat ini: <Badge status={status.status} />
          </p>
          <div className="status-actions">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                mutate(
                  '/orders/' + status.id + '/status',
                  'PATCH',
                  { status: 'completed' },
                  () => setStatus(null),
                  'Pesanan selesai dan penjualan tercatat.',
                )
              }
            >
              <Check size={17} /> Selesaikan & catat penjualan
            </button>
          </div>
          <p className="hint">
            Pesanan selesai otomatis menjadi penjualan dan tidak dapat diubah lagi.
          </p>
        </Modal>
      )}
    </>
  );
}
function OrderEditor({ order, products, onClose, notify, refresh }) {
  const [items, setItems] = useState(
      order.items?.map((i) => ({ product_id: String(i.product_id), quantity: i.quantity })) || [
        { product_id: '', quantity: 1 },
      ],
    ),
    { busy, error, mutate } = useMutation(notify, refresh);
  function update(i, key, v) {
    setItems((prev) => prev.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
  }
  function submit(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.items = items.map((i) => ({
      product_id: Number(i.product_id),
      quantity: Number(i.quantity),
    }));
    mutate(
      '/orders' + (order.id ? '/' + order.id : ''),
      order.id ? 'PUT' : 'POST',
      body,
      onClose,
      'Pesanan berhasil dicatat.',
    );
  }
  const total = items.reduce(
    (n, i) =>
      n +
      Number(products.find((p) => String(p.id) === i.product_id)?.price || 0) *
        Number(i.quantity || 0),
    0,
  );
  return (
    <Modal
      title={order.id ? 'Edit ' + orderCode(order.id) : 'Catat pesanan baru'}
      onClose={onClose}
      wide
    >
      <form className="editor-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Nama pelanggan
            <input
              name="customer_name"
              required
              maxLength={120}
              defaultValue={order.customer_name}
            />
          </label>
          <label>
            Nomor telepon
            <input
              name="phone_number"
              type="tel"
              required
              maxLength={24}
              defaultValue={order.phone_number}
              placeholder="08xxxxxxxxxx"
            />
          </label>
          <label>
            Tanggal pesanan
            <input
              name="order_date"
              type="date"
              required
              defaultValue={order.order_date?.slice(0, 10) || today()}
            />
          </label>
          <label>
            Tanggal pengiriman
            <input
              name="delivery_date"
              type="date"
              required
              defaultValue={order.delivery_date?.slice(0, 10) || today()}
            />
          </label>
        </div>
        <div className="items-heading">
          <strong>Produk pesanan</strong>
          <button
            type="button"
            className="text-btn"
            disabled={items.length >= 30}
            onClick={() => setItems([...items, { product_id: '', quantity: 1 }])}
          >
            <Plus size={16} /> Tambah item
          </button>
        </div>
        {items.map((item, i) => (
          <div className="order-item-editor" key={i}>
            <label>
              Produk {i + 1}
              <select
                aria-label={'Produk ' + (i + 1)}
                required
                value={item.product_id}
                onChange={(e) => update(i, 'product_id', e.target.value)}
              >
                <option value="" disabled>
                  Pilih produk
                </option>
                {products.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jumlah
              <input
                aria-label={'Jumlah ' + (i + 1)}
                type="number"
                min={1}
                max={100}
                required
                value={item.quantity}
                onChange={(e) => update(i, 'quantity', e.target.value)}
              />
            </label>
            <button
              type="button"
              className="icon-btn danger"
              disabled={items.length === 1}
              aria-label={'Hapus item ' + (i + 1)}
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
        <div className="order-total">
          <span>Estimasi total</span>
          <strong>{money(total)}</strong>
        </div>
        <p className="hint">Harga final dihitung server dari harga produk saat penyimpanan.</p>
        <label>
          Permintaan / kartu ucapan
          <textarea name="request" rows={3} maxLength={3000} defaultValue={order.request} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <FormActions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}
function Customers({ query, notify }) {
  const [payload, setPayload] = useState(null);
  useEffect(() => {
    api('/customers')
      .then(setPayload)
      .catch((e) => notify(e.message, true));
  }, [notify]);
  if (!payload) return <Empty text="Memuat pelanggan…" />;
  const customers = payload.rows.filter((c) =>
    (c.name + ' ' + c.phone).toLowerCase().includes(query.toLowerCase()),
  );
  const cards = [
    ['Total pelanggan', payload.summary.customers],
    ['Pelanggan berulang', payload.summary.repeat_customers],
    ['Pembelian selesai', money(payload.summary.revenue)],
    ['Pesanan aktif', payload.summary.active_orders],
  ];
  return (
    <>
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <article className="stat-card" key={label}>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </article>
        ))}
      </div>
      <div className="toolbar">
        <span>{customers.length} pelanggan · dirangkum dari pesanan</span>
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Telepon</th>
              <th>Pesanan</th>
              <th>Total pembelian selesai</th>
              <th>Pesanan terakhir</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.phone}>
                <td>
                  <div className="customer-cell">
                    <span className="avatar">{c.name[0]}</span>
                    <strong>{c.name}</strong>
                  </div>
                </td>
                <td>{c.phone}</td>
                <td>{c.orders}</td>
                <td>{money(c.total)}</td>
                <td>{date(c.last)}</td>
                <td>
                  <a
                    className="btn outline"
                    href={'https://wa.me/' + c.phone.replace(/\D/g, '').replace(/^0/, '62')}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chat
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && <Empty text="Pelanggan akan tampil setelah pesanan dicatat." />}
      </section>
      <p className="hint">
        Tabel menampilkan maksimal 500 pelanggan terbaru; kartu metrik mencakup seluruh pesanan.
        Identitas dikelompokkan menurut nomor telepon.
      </p>
    </>
  );
}
function Reports({ notify }) {
  const [from, setFrom] = useState(today().slice(0, 7) + '-01'),
    [to, setTo] = useState(today()),
    [result, setResult] = useState(null),
    [loading, setLoading] = useState(false),
    [downloading, setDownloading] = useState(false),
    [error, setError] = useState('');
  async function load(e) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      setResult(await api('/reports?' + new URLSearchParams({ from, to })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function download() {
    setDownloading(true);
    try {
      const response = await fetch(
        '/api/reports/pdf?' + new URLSearchParams({ from: result.from, to: result.to }),
        { credentials: 'same-origin' },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error);
      }
      const url = URL.createObjectURL(await response.blob()),
        a = document.createElement('a');
      a.href = url;
      a.download = `bien-vendre-${result.from}-${result.to}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Laporan PDF berhasil diunduh.');
    } catch (e) {
      notify(e.message, true);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <>
      <form className="panel report-filters" onSubmit={load}>
        <label>
          Dari tanggal
          <input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Sampai tanggal
          <input
            type="date"
            required
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button className="btn primary" disabled={loading}>
          {loading ? <LoaderCircle size={17} className="spin" /> : <Search size={17} />} Tampilkan
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="report-summary">
            <div className="panel">
              <span>Total penjualan</span>
              <strong>{money(result.total)}</strong>
              <small>
                {date(result.from)} – {date(result.to)}
              </small>
            </div>
            <div className="panel">
              <span>Transaksi selesai</span>
              <strong>{result.count}</strong>
              <small>Pesanan yang tercatat sebagai penjualan</small>
            </div>
          </div>
          <SalesTrend trend={result.trend} />
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Riwayat penjualan</h2>
                <p>Hanya pesanan dengan status selesai</p>
              </div>
              <button className="btn outline" onClick={download} disabled={downloading}>
                <Download size={17} />
                {downloading ? 'Mengunduh…' : 'Unduh PDF'}
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pesanan</th>
                    <th>Tanggal penjualan</th>
                    <th>Pelanggan</th>
                    <th>Telepon</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{orderCode(r.order_id)}</strong>
                      </td>
                      <td>{date(r.sale_date)}</td>
                      <td>{r.customer_name}</td>
                      <td>{r.phone_number}</td>
                      <td>{money(r.total_sale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!result.rows.length && <Empty text="Tidak ada penjualan pada periode ini." />}
            </div>
          </section>
        </>
      )}
    </>
  );
}
function StoreSettings({ user, notify }) {
  const [store, setStore] = useState(null);
  useEffect(() => {
    api('/store')
      .then(setStore)
      .catch((e) => notify(e.message, true));
  }, [notify]);
  return (
    <>
      <AccountSecurity notify={notify} />
      {store && user.role === 'owner' && (
        <StoreEditor key={JSON.stringify(store)} store={store} onSaved={setStore} notify={notify} />
      )}
      <div className="settings-grid">
        <section className="panel settings-card">
          <div className="flower-mark">
            <Flower2 size={26} />
          </div>
          <h2>{store?.name || 'Bien Vendre'}</h2>
          <p>Florist & Gifts</p>
          {store && (
            <dl>
              <dt>Lokasi</dt>
              <dd>{store.address}</dd>
              <dt>WhatsApp</dt>
              <dd>{store.whatsapp || 'Belum dikonfigurasi'}</dd>
              <dt>Instagram</dt>
              <dd>{store.instagram || 'Belum dikonfigurasi'}</dd>
              <dt>Shopee</dt>
              <dd>{store.shopee || 'Belum dikonfigurasi'}</dd>
              <dt>Tokopedia</dt>
              <dd>{store.tokopedia || 'Belum dikonfigurasi'}</dd>
            </dl>
          )}
          <p className="hint">
            {user.role === 'owner'
              ? 'Ubah profil dan kanal digital melalui formulir pengaturan toko.'
              : 'Profil toko dikelola oleh owner.'}
          </p>
        </section>
        <section className="panel settings-card">
          <ShieldCheck size={30} />
          <h2>Akses akun</h2>
          <dl>
            <dt>Nama</dt>
            <dd>{user.name}</dd>
            <dt>Username</dt>
            <dd>{user.username}</dd>
            <dt>Peran</dt>
            <dd>{user.role === 'admin' ? 'Admin' : 'Owner'}</dd>
          </dl>
          <p className="soft-note">
            {user.role === 'admin'
              ? 'Anda dapat mengelola produk, kategori, rekomendasi, pesanan, dan melihat laporan penjualan.'
              : 'Anda dapat melihat pesanan, riwayat penjualan, dan mengunduh laporan PDF.'}
          </p>
          <p className="hint">
            Katalog pelanggan dapat diakses tanpa login. Atur email pemulihan dan password melalui
            panel keamanan di atas.
          </p>
        </section>
      </div>
    </>
  );
}
createRoot(document.getElementById('root')).render(<App />);

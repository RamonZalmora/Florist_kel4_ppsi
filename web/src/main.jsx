import { SalesLineChart } from './SalesLineChart';
import { hasCoordinates, storeMapLink, storeMapEmbed } from './store-location';
import { OrderStatusChart } from './OrderStatusChart';
import { PhotoField, StoreEditor } from './RetailFeatures';
import { RecoveryScreen, AccountSecurity, DataStudio } from './StudioFeatures';
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Flower2,
  MapPin,
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
  FileSpreadsheet,
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
import { api, setCsrf, money, date, today, orderCode, whatsappUrl } from './api';
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
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.querySelector('.workspace-content')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [view]);
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
          <img className="login-brand-mark" src="/assets/bien-mark.svg" alt="" /> Bien Vendre
          <span>FLORIST & GIFTS</span>
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
            <img className="login-brand-mark" src="/assets/bien-mark.svg" alt="" />
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
function TikTokIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2-2.75V9.4a6.33 6.33 0 1 0 5.45 6.27V8.68A8.16 8.16 0 0 0 20.5 10V6.57a4.85 4.85 0 0 1-.91.12Z" />
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
  const tiktok =
    /^https:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?(?:\?[^\s#]*)?(?:#[^\s]*)?$/.test(
      store.tiktok || '',
    );
  let instagram = false;
  try {
    const u = new URL(store.instagram);
    instagram =
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      ((['instagram.com', 'www.instagram.com'].includes(u.hostname) &&
        /^\/[a-zA-Z0-9_.]+\/?$/.test(u.pathname)) ||
        (u.hostname === 'share.google' && /^\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname) && !u.search));
  } catch {
    /* not configured */
  }
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
    { name: 'TikTok', icon: <TikTokIcon />, href: tiktok ? store.tiktok : '', className: 'tiktok' },
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
  const mapEmbed = storeMapEmbed(store),
    mapLink = storeMapLink(store);
  return (
    <div className="about-page">
      <section className="about-intro">
        <div className="about-intro-copy">
          <img
            className="about-brand-seal"
            src={store.logo || '/assets/bien-logo-generated.webp'}
            alt={'Logo ' + store.name}
          />
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
      <section className="about-location" aria-label="Lokasi toko">
        <div className="location-copy">
          <span className="eyebrow">VISIT & CONNECT</span>
          <h2>
            Temukan kami.
            <br />
            <em>Mulai cerita Anda.</em>
          </h2>
          <p>
            Diskusikan rangkaian pilihan, ketersediaan produk, dan detail pengambilan bersama tim
            Bien Vendre.
          </p>
          {store.address && (
            <div className="location-address">
              <MapPin size={21} />
              <div>
                <strong>Alamat toko</strong>
                <p>{store.address}</p>
              </div>
            </div>
          )}
          <p className="hint">
            Hubungi toko sebelum berkunjung untuk memastikan jadwal dan ketersediaan.
          </p>
        </div>
        <div className="location-destination">
          {mapEmbed ? (
            <iframe
              className="location-map"
              title="Peta lokasi Bien Vendre"
              src={mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="location-art" aria-hidden="true">
              <div className="location-ring" />
              <MapPin size={55} />
              <span>BIEN VENDRE</span>
            </div>
          )}
          <div className="location-destination-info">
            <span className="eyebrow">GOOGLE MAPS</span>
            <h3>Titik lokasi toko</h3>
            {hasCoordinates(store) && (
              <p className="location-coordinates">
                {Number(store.latitude).toFixed(6)}, {Number(store.longitude).toFixed(6)}
              </p>
            )}
            <p>Buka lokasi untuk melihat alamat, rute, dan petunjuk arah.</p>
            {mapLink ? (
              <a className="btn primary" href={mapLink} target="_blank" rel="noreferrer">
                Buka Google Maps <ArrowUpRight size={17} />
              </a>
            ) : (
              <span className="hint">Lokasi dapat ditanyakan melalui kontak toko.</span>
            )}
          </div>
        </div>
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
      </section>
    </div>
  );
}
function Catalog({ user, onLogin, onDashboard, notify }) {
  const [sort, setSort] = useState('newest'),
    [page, setPage] = useState(location.pathname === '/about' ? 'about' : 'catalog'),
    [occasion, setOccasion] = useState(
      new URLSearchParams(location.search).get('view') === 'collection',
    ),
    [catalogPage, setCatalogPage] = useState(1),
    [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia('(min-width: 721px)').matches);
  const [products, setProducts] = useState([]),
    [categories, setCategories] = useState([]),
    [availableTypes, setAvailableTypes] = useState([]),
    [store, setStore] = useState({}),
    [category, setCategory] = useState(''),
    [productType, setProductType] = useState(''),
    [budget, setBudget] = useState(''),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    Promise.all([api('/categories'), api('/store'), api('/product-types')])
      .then(([c, s, types]) => {
        setAvailableTypes(types);
        setCategories(c.filter((item) => Number(item.product_count) > 0));
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
            ...(productType &&
            availableTypes.some((t) => t.code === productType || 'id:' + t.id === productType)
              ? {
                  type_id: availableTypes.find(
                    (t) => t.code === productType || 'id:' + t.id === productType,
                  )?.id,
                }
              : {}),
            ...(budget === 'hemat' ? { max_price: '99999.99' } : {}),
            ...(budget === 'menengah' ? { min_price: '100000', max_price: '249999.99' } : {}),
            ...(budget === 'premium' ? { min_price: '250000' } : {}),
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
  }, [category, productType, budget, search, sort, occasion, availableTypes]);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [page, occasion]);
  useEffect(() => setCatalogPage(1), [category, productType, budget, search, sort, occasion]);
  useEffect(() => {
    history.scrollRestoration = 'manual';
    const syncPage = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setPage(location.pathname === '/about' ? 'about' : 'catalog');
      setOccasion(new URLSearchParams(location.search).get('view') === 'collection');
    };
    window.addEventListener('popstate', syncPage);
    return () => window.removeEventListener('popstate', syncPage);
  }, []);
  function navigatePublic(next, hash = '') {
    const path =
      next === 'about' ? '/about' : next === 'collection' ? '/catalog?view=collection' : '/catalog';
    history.pushState(null, '', path + hash);
    setPage(next === 'collection' ? 'catalog' : next);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  async function showProduct(id) {
    try {
      setDetail(await api('/products/' + id));
    } catch (e) {
      notify(e.message, true);
    }
  }
  const collectionPageSize = 8;
  const pageCount = Math.max(1, Math.ceil(products.length / collectionPageSize));
  const currentPage = Math.min(catalogPage, pageCount);
  const visibleProducts = occasion
    ? products.slice((currentPage - 1) * collectionPageSize, currentPage * collectionPageSize)
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
  function openCollection(categoryId = '', type = '') {
    navigatePublic('collection');
    setOccasion(true);
    setCategory(String(categoryId));
    setProductType(type);
    setBudget('');
    setSearch('');
  }
  const used = new Set();
  const homeGroups = ['Wedding', 'Wisuda', 'Hadiah', 'Dekorasi']
    .map((name) => {
      const group = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
      const preferred = {
        Wedding: /wedding|hand bouquet/i,
        Wisuda: /wisuda|graduation/i,
        Hadiah: /bouquet|buket/i,
        Dekorasi: /vas|bunga meja/i,
      }[name];
      const items = products
        .filter((p) => p.categories?.some((c) => String(c.id) === String(group?.id)))
        .sort(
          (a, b) =>
            Number(b.sold_count || 0) - Number(a.sold_count || 0) ||
            Number(preferred.test(b.name)) - Number(preferred.test(a.name)) ||
            Number(b.id) - Number(a.id),
        )
        .slice(0, 3);
      items.forEach((p) => used.add(String(p.id)));
      return { ...group, name, items };
    })
    .filter((group) => group.items.length);
  const singleTypes = [
    ['snack', 'Snack', /snack|wafer/i],
    ['uang', 'Uang', /uang/i],
    ['akrilik', 'Akrilik', /akrilik/i],
    ['frame', 'Frame & mahar', /frame/i],
    ['boneka', 'Boneka', /boneka/i],
    ['klobot', 'Klobot', /klobot/i],
  ];
  const homeSingles = singleTypes
    .filter(([code]) => availableTypes.some((t) => t.code === code))
    .map(([type, label, match]) => {
      const item = products.find(
        (p) => !used.has(String(p.id)) && match.test(p.name + ' ' + p.flower_type),
      );
      if (item) used.add(String(item.id));
      return { type, label, item };
    })
    .filter((entry) => entry.item);
  function renderProduct(p, i, ranked = false) {
    return (
      <article
        className={
          'product-card retail-product-card' +
          (ranked === true ? ' ranked-product rank-' + (i + 1) : '')
        }
        key={p.id}
      >
        <div
          className={'product-picture tone-' + (i % 3)}
          onClick={() => showProduct(p.id)}
          role="button"
          aria-label={'Lihat detail ' + p.name}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              showProduct(p.id);
            }
          }}
        >
          <Photo src={p.photo} alt={p.name} />
          <span className="view-product">
            <Eye size={16} /> Lihat detail
          </span>
        </div>
        <div className="product-card-info">
          <div>
            <h3>{p.name}</h3>
            <strong className="product-price">{money(p.price)}</strong>
            <p>{p.flower_type}</p>
          </div>
          <ArrowUpRight size={20} />
        </div>
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
          <span className="product-order-unavailable">WhatsApp belum tersedia</span>
        )}
      </article>
    );
  }
  return (
    <div
      className={
        'catalog-page ' +
        (!occasion && page === 'catalog' ? 'boutique-home' : occasion ? 'collection-view' : '')
      }
    >
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
            href="/catalog"
            onClick={(e) => {
              e.preventDefault();
              navigatePublic('catalog');
              setOccasion(false);
              setCategory('');
              setProductType('');
              setBudget('');
              setSearch('');
            }}
          >
            Beranda
          </a>
          <a
            href="/catalog?view=collection"
            onClick={(e) => {
              e.preventDefault();
              navigatePublic('collection');
              setOccasion(true);
              setCategory('');
              setProductType('');
              setBudget('');
              setSearch('');
            }}
          >
            Koleksi bunga
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
                <div className="hero-showcase">
                  <div className="hero-orbit">
                    <Sparkles size={22} />
                    <span>Little details. Lasting memories.</span>
                  </div>
                  <img
                    className="hero-bouquet layered-flowers"
                    src="/assets/hero-grand-flowers.webp"
                    alt="Ilustrasi rangkaian bunga bertumpuk bernuansa biru, lavender, dan blush"
                  />
                  <div className="hero-note">
                    <span className="dimensional-icon">
                      <Heart size={22} />
                    </span>
                    <div>
                      <strong>A little joy, beautifully wrapped.</strong>
                      <small>Bunga · Hadiah · Momen berharga</small>
                    </div>
                  </div>
                  <button className="hero-mini" onClick={() => openCollection('', 'boneka')}>
                    <img src="/assets/catalog/product-54.webp" alt="" />
                    <span>
                      Hadiah kecil,
                      <br />
                      <strong>kesan istimewa ↗</strong>
                    </span>
                  </button>
                </div>
              </section>
            )}
            {!occasion && categories.length > 0 && (
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
                        setProductType('');
                        setBudget('');
                        setSearch('');
                        document
                          .getElementById('collection')
                          .scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      <span className="moment-image">
                        <img src={c.photo} alt="" loading="lazy" />
                      </span>
                      <span className="moment-icon">
                        {[<Heart />, <Sparkles />, <Flower2 />, <ShoppingBag />][i % 4]}
                      </span>
                      <strong>{c.name}</strong>
                      <small>
                        {c.product_count} pilihan · {c.description}
                      </small>
                      <ArrowUpRight size={17} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="collection" id="collection">
              <div className="section-heading">
                {occasion ? (
                  <h1 className="collection-title">Koleksi kami</h1>
                ) : (
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
                )}
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
                    <details
                      className="catalog-filter-panel"
                      open={filtersOpen}
                      onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
                    >
                      <summary>
                        <span>Filter koleksi</span>
                        <span className="filter-indicator">
                          {Number(Boolean(category)) +
                            Number(Boolean(productType)) +
                            Number(Boolean(budget))}{' '}
                          filter
                        </span>
                      </summary>
                      <div className="filter-group">
                        <h3>
                          Occasion <small>momen spesial</small>
                        </h3>
                        <div className="filter-tabs">
                          <button
                            className={!category ? 'active' : ''}
                            aria-pressed={!category}
                            onClick={() => setCategory('')}
                          >
                            Semua koleksi
                          </button>
                          {categories.map((c) => (
                            <button
                              key={c.id}
                              className={category === String(c.id) ? 'active' : ''}
                              aria-pressed={category === String(c.id)}
                              onClick={() => setCategory(String(c.id))}
                            >
                              <span>{c.name}</span>
                              <span className="filter-count">{c.product_count}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="filter-group">
                        <h3>
                          Jenis produk <small>pilih kesukaanmu</small>
                        </h3>
                        <div className="filter-chips">
                          {[
                            ['', 'Semua'],
                            ...availableTypes.map((t) => [t.code || 'id:' + t.id, t.name]),
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              className={productType === value ? 'active' : ''}
                              aria-pressed={productType === value}
                              onClick={() => setProductType(value)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="filter-group">
                        <h3>
                          Harga <small>sesuai anggaran</small>
                        </h3>
                        <div className="budget-list">
                          {[
                            ['', 'Semua harga', ''],
                            ['hemat', 'Hemat', 'Di bawah Rp100.000'],
                            ['menengah', 'Menengah', 'Rp100.000–Rp249.999'],
                            ['premium', 'Premium', 'Mulai Rp250.000'],
                          ].map(([value, label, description]) => (
                            <button
                              key={value}
                              className={budget === value ? 'active' : ''}
                              aria-pressed={budget === value}
                              onClick={() => setBudget(value)}
                            >
                              <span className="budget-dot" />
                              <span>
                                <strong>{label}</strong>
                                {description && <small>{description}</small>}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="catalog-tools">
                        <label>
                          Urutkan
                          <select value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="newest">Terbaru diperbarui</option>
                            <option value="popular">Produk terlaris</option>
                          </select>
                        </label>
                        <button
                          className="text-btn"
                          onClick={() => {
                            setCategory('');
                            setProductType('');
                            setBudget('');
                            setSearch('');
                            setSort('newest');
                          }}
                        >
                          Reset filter
                        </button>
                      </div>
                    </details>
                  </aside>
                )}
                <div className="catalog-results">
                  {occasion && !loading && !error && (
                    <div className="catalog-result-bar">
                      <span>
                        <strong>{products.length}</strong> produk ditemukan
                      </span>
                    </div>
                  )}
                  {loading ? (
                    <div className="empty">
                      <LoaderCircle className="spin" /> Memuat koleksi…
                    </div>
                  ) : error ? (
                    <Empty text={error} />
                  ) : !products.length ? (
                    <Empty text="Belum ada produk yang sesuai. Coba kategori atau pencarian lain." />
                  ) : !occasion && !search ? (
                    <div className="home-curation">
                      <div className="home-group-grid">
                        {homeGroups.map((group, i) => (
                          <section className={'home-product-group group-tone-' + i} key={group.id}>
                            <div className="home-group-heading">
                              <img
                                className="occasion-sculpture"
                                src={
                                  '/assets/occasions/' +
                                  ['wedding', 'wisuda', 'hadiah', 'dekorasi'][i] +
                                  '.webp'
                                }
                                alt=""
                                aria-hidden="true"
                              />

                              <div>
                                <h3>{group.name}</h3>
                              </div>
                              <button
                                aria-label={'Lihat koleksi ' + group.name}
                                onClick={() => openCollection(group.id)}
                              >
                                Lihat lebih banyak <ArrowUpRight size={15} />
                              </button>
                            </div>
                            <div className="home-group-products">
                              {group.items.map((p, index) => renderProduct(p, index, true))}
                            </div>
                          </section>
                        ))}
                      </div>
                      {homeSingles.length > 0 && (
                        <section className="home-discover">
                          <div className="home-discover-heading">
                            <span className="dimensional-icon">
                              <Sparkles />
                            </span>
                            <div>
                              <span className="eyebrow">LITTLE FINDS, BIG SMILES</span>
                              <h3>Temukan kesukaan lainnya.</h3>
                            </div>
                          </div>
                          <div className="home-single-grid">
                            {homeSingles.map(({ type, label, item }) => (
                              <div className="home-single" key={type}>
                                <button
                                  className="single-type"
                                  onClick={() => openCollection('', type)}
                                >
                                  {label}
                                  <ArrowUpRight size={14} />
                                </button>
                                {renderProduct(item, 0)}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                      {!homeGroups.length && (
                        <div className="product-grid">{visibleProducts.map(renderProduct)}</div>
                      )}
                    </div>
                  ) : (
                    <div className="product-grid">{visibleProducts.map(renderProduct)}</div>
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
      <footer className="public-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="brand">
              <img className="footer-logo" src={store.logo || '/assets/bien-mark.svg'} alt="" />
              {store.name || 'Bien Vendre'}
            </div>
            <p>
              Bunga dan hadiah untuk momen yang ingin dikenang. Temukan perhatian kecil yang terasa
              istimewa.
            </p>
            <span className="footer-signature">Thoughtfully arranged. Beautifully yours.</span>
          </div>
          <div className="footer-column">
            <h3>Jelajahi</h3>
            <a href="/catalog">Beranda</a>
            <a href="/catalog?view=collection">Koleksi bunga & hadiah</a>
            <a href="/about">Tentang kami</a>
            <p>Pernikahan · Wisuda · Hadiah · Dekorasi</p>
          </div>
          <div className="footer-column footer-location">
            <h3>Lokasi & konsultasi</h3>
            {store.address && (
              <p>
                <MapPin size={17} />
                <span>{store.address}</span>
              </p>
            )}
            {storeMapLink(store) && (
              <a href={storeMapLink(store)} target="_blank" rel="noreferrer">
                Lihat lokasi di Google Maps <ArrowUpRight size={14} />
              </a>
            )}
            {whatsapp && (
              <a href={'https://wa.me/' + whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle size={16} />+{whatsapp}
              </a>
            )}
            <small>Konfirmasi jadwal kunjungan dan detail pesanan melalui WhatsApp.</small>
          </div>
        </div>
        <div className="footer-channels">
          <span>Terhubung dengan kami</span>
          <SocialLinks store={store} whatsapp={whatsapp} />
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {store.name || 'Bien Vendre'} · Florist & Gifts
          </span>
          <span>Dirangkai dengan perhatian, untuk setiap cerita.</span>
        </div>
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
              {detail.photo?.startsWith('/assets/catalog/') && (
                <p className="hint">
                  Gambar merupakan ilustrasi yang dibuat ulang; bentuk dan detail produk
                  dikonfirmasi saat pemesanan.
                </p>
              )}
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
  ['orders', 'Pesanan', ShoppingBag],
  ['reports', 'Riwayat & laporan', ChartNoAxesCombined],
];
const navOwner = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['orders', 'Daftar pesanan', ShoppingBag],
  ['reports', 'Riwayat & laporan', ChartNoAxesCombined],
  ['data', 'Data bisnis', Package],
];
function Workspace({ user, view, setView, logout, notify }) {
  const [mobile, setMobile] = useState(false),
    [version, setVersion] = useState(0),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [productCategory, setProductCategory] = useState(''),
    [classificationKind, setClassificationKind] = useState('occasion'),
    [classificationSearch, setClassificationSearch] = useState('');
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api('/dashboard'),
      api('/orders'),
      api('/categories'),
      api('/product-types'),
      api(user.role === 'admin' ? '/manage/products' : '/products'),
      ...(user.role === 'admin' ? [api('/manage/recommendations')] : []),
    ])
      .then(([dashboard, orders, categories, productTypes, products, recommendations]) => {
        if (active)
          setData({ dashboard, orders, categories, productTypes, products, recommendations });
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
  const sidebarItems = [
    ...navigation,
    ['settings', 'Pengaturan', Settings],
    ['catalog', 'Lihat katalog', ExternalLink],
  ];
  const activeMenuIndex = sidebarItems.findIndex(([id]) => id === view);
  const shared = {
    data,
    query,
    setQuery,
    notify,
    refresh,
    user,
    go,
    productCategory,
    setProductCategory,
    classificationKind,
    classificationSearch,
  };
  return (
    <div
      className={
        'workspace' +
        (view === 'dashboard'
          ? ' workspace-dashboard'
          : view === 'categories'
            ? ' workspace-classifications'
            : view === 'products'
              ? ' workspace-products'
              : view === 'orders'
                ? ' workspace-orders'
                : view === 'reports'
                  ? ' workspace-reports'
                  : view === 'settings' || view === 'data'
                    ? ' workspace-owner'
                    : '')
      }
    >
      <aside className={'sidebar ' + (mobile ? 'open' : '')}>
        <a className="brand" href="/catalog">
          <img className="workspace-logo" src="/assets/bien-mark.svg" alt="" />
          <div>
            Bien Vendre<small>FLORIST & GIFTS</small>
          </div>
        </a>
        <div className="sidebar-label">RUANG KERJA</div>
        <nav
          className="sidebar-navigation"
          aria-label="Menu ruang kerja"
          style={{ '--nav-index': Math.max(0, activeMenuIndex) }}
        >
          <span className="sidebar-active-surface" aria-hidden="true" />
          {sidebarItems.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? 'active' : ''}
              aria-current={view === id ? 'page' : undefined}
              onClick={() => go(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-floral">
          <Flower2 size={22} />
          <span>Grow beautifully.</span>
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
          {view === 'categories' ? (
            <ClassificationHeader
              data={data}
              kind={classificationKind}
              setKind={setClassificationKind}
              search={classificationSearch}
              setSearch={setClassificationSearch}
            />
          ) : (
            <>
              {view === 'dashboard' ? (
                <div className="dashboard-store-status">
                  <span className="dashboard-store-mark">
                    <Flower2 size={23} />
                  </span>
                  <div>
                    <strong>
                      Bien Vendre <span>STUDIO</span>
                    </strong>
                    <small>
                      <span className="online-dot" /> Ruang kerja{' '}
                      {user.role === 'admin' ? 'admin' : 'owner'}
                    </small>
                  </div>
                  <button onClick={() => go('orders')} className="dashboard-order-shortcut">
                    <ShoppingBag size={14} /> {data ? data.dashboard.summary.pending_orders : '…'}{' '}
                    belum selesai <ArrowUpRight size={12} />
                  </button>
                </div>
              ) : (
                <div className="breadcrumb">
                  Ruang kerja <ChevronRight size={14} /> <strong>{title}</strong>
                </div>
              )}
              <div className="topbar-right">
                <span className="today">
                  <CalendarDays size={15} />
                  {new Date().toLocaleDateString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
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
                {view === 'dashboard' && (
                  <div className="dashboard-top-user">
                    <strong>{user.name}</strong>
                    <small>{user.role === 'admin' ? 'Admin toko' : 'Owner'}</small>
                  </div>
                )}
              </div>
            </>
          )}
        </header>
        <main className="workspace-content">
          {view !== 'dashboard' &&
            view !== 'categories' &&
            view !== 'products' &&
            view !== 'orders' &&
            view !== 'settings' &&
            view !== 'reports' &&
            view !== 'data' && (
              <div className="workspace-search-strip">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari data…"
                    aria-label="Cari data"
                  />
                </label>
              </div>
            )}
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
                {view === 'orders' && <Orders {...shared} />}{' '}
                {view === 'reports' && <Reports data={data} notify={notify} />}{' '}
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
  const [salesDays, setSalesDays] = useState(7);
  const [categoryPeriod, setCategoryPeriod] = useState('all');
  const [sellerGroup, setSellerGroup] = useState('category');
  const { summary, trend: weekTrend, popular } = data.dashboard;
  const trend = (data.dashboard.trend30 || weekTrend).slice(-salesDays);
  const best = popular.slice(0, 4);
  const periodTotal = trend.reduce((sum, day) => sum + Number(day.total), 0);
  const occasionColors = [
    '#3164bc',
    '#20a89b',
    '#9970cb',
    '#e6a04d',
    '#dc7999',
    '#4f9fc4',
    '#8b9e4e',
    '#b77559',
  ];
  const occasions = (
    (sellerGroup === 'category' ? data.dashboard.occasionSales : data.dashboard.productTypeSales) ||
    []
  )
    .map((occasion, index) => ({
      ...occasion,
      color: occasionColors[index] || `hsl(${Math.round((index * 137.508 + 215) % 360)} 48% 55%)`,
      quantity:
        categoryPeriod === 'all'
          ? Number(occasion.total_orders || 0)
          : occasion.sales.reduce((sum, day) => sum + Number(day.orders), 0),
    }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'id'));
  const peak = trend.reduce(
    (highest, day) => (Number(day.total) > Number(highest?.total || 0) ? day : highest),
    null,
  );
  const completedOrdersInPeriod =
    categoryPeriod === 'all'
      ? Number(data.dashboard.completedOrderSales?.all_time ?? summary.completed_orders)
      : Number(data.dashboard.completedOrderSales?.last_30_days || 0);
  const categoryPercent = (quantity) =>
    completedOrdersInPeriod ? (quantity / completedOrdersInPeriod) * 100 : 0;
  const percentLabel = (quantity) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(categoryPercent(quantity)) +
    '%';
  const statDetails = [
    [money(weekTrend.reduce((sum, day) => sum + Number(day.total), 0)), 'dalam 7 hari'],
    [summary.pending_orders, 'belum selesai'],
    user.role === 'admin'
      ? [data.productTypes.length, 'jenis produk tersedia']
      : [summary.completed_orders, 'pesanan selesai'],
    [summary.completed_orders, 'pesanan selesai'],
  ];
  const stats = [
    ['Penjualan bulan ini', money(summary.revenue), ChartNoAxesCombined, 'Dari pesanan selesai'],
    ['Total pesanan', summary.total_orders, ShoppingBag, 'Seluruh pesanan tercatat'],
    user.role === 'admin'
      ? ['Occasion & jenis produk', data.categories.length, Tags, 'Occasion tersedia di katalog']
      : ['Pelanggan', summary.customers, Users, 'Berdasarkan nomor telepon'],
    ['Produk aktif', summary.products, Package, 'Tersedia di katalog'],
  ];
  const recent = data.orders.filter((order) => order.status !== 'cancelled').slice(0, 4);
  const miniSeries = [
    weekTrend.map((day) => Number(day.total)),
    weekTrend.map(
      (day) =>
        data.orders.filter((order) => String(order.order_date).slice(0, 10) === day.day).length,
    ),
    user.role === 'admin'
      ? null
      : weekTrend.map(
          (day) =>
            new Set(
              data.orders
                .filter((order) => String(order.order_date).slice(0, 10) === day.day)
                .map((order) => order.phone_number),
            ).size,
        ),
  ];
  return (
    <div className="sales-dashboard">
      <div className="sales-stats">
        {stats.map(([label, value, Icon, hint], index) => {
          const values = miniSeries[index];
          const points = values
            ?.map((value, i) => `${i * 15},${48 - (value / Math.max(1, ...values)) * 36}`)
            .join(' ');
          return (
            <article className={'sales-stat sales-stat-' + index} key={label}>
              <div className="sales-stat-icon">
                <Icon size={18} />
              </div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
              {values?.length ? (
                <svg
                  className="sales-mini-chart"
                  viewBox="0 0 90 54"
                  role="img"
                  aria-label={'Tren 7 hari: ' + label + '. ' + values.join(', ')}
                >
                  <defs>
                    <linearGradient id={'mini-fill-' + index} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity=".35" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={`0,54 ${points} 90,54`} fill={`url(#mini-fill-${index})`} />
                  <polyline
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <Flower2 className="sales-stat-flower" size={58} aria-hidden="true" />
              )}
              <div className="sales-stat-detail">
                <span className="sales-stat-detail-dot" />
                <b>{statDetails[index][0]}</b>
                <span>{statDetails[index][1]}</span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="sales-overview-grid">
        <section className="sales-panel sales-chart">
          <div className="sales-panel-heading">
            <div>
              <h2>
                <ChartNoAxesCombined size={17} /> Ringkasan penjualan
              </h2>
              <p>Penjualan selesai dalam {salesDays} hari terakhir</p>
            </div>
            <div className="sales-chart-actions">
              <div className="sales-range-control" role="group" aria-label="Periode penjualan">
                {[7, 30].map((days) => (
                  <button
                    key={days}
                    aria-pressed={salesDays === days}
                    onClick={() => setSalesDays(days)}
                  >
                    {days} hari
                  </button>
                ))}
              </div>
              <button className="sales-period" onClick={() => go('reports')}>
                <CalendarDays size={14} /> Lihat laporan <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
          <div className="sales-chart-body">
            <div className="sales-period-summary">
              <div className="sales-summary-primary">
                <span className="sales-summary-label">Total penjualan {salesDays} hari</span>
                <strong className="sales-summary-total">{money(periodTotal)}</strong>
                <small>
                  {trend.length > 0 && `${date(trend[0].day)} – ${date(trend.at(-1).day)}`}
                </small>
              </div>
              <div className="sales-summary-average">
                <span>Rata-rata per hari</span>
                <strong>{money(trend.length ? periodTotal / trend.length : 0)}</strong>
              </div>
              <div className="sales-summary-peak">
                <span>
                  <Sparkles size={14} /> Penjualan tertinggi
                </span>
                <strong>{money(peak?.total || 0)}</strong>
                <small>{peak ? date(peak.day) : 'Belum ada penjualan selesai'}</small>
              </div>
            </div>
            <div className="sales-chart-plot">
              <span className="sales-chart-key">
                <i /> Penjualan harian · {salesDays} hari
              </span>
              <SalesLineChart
                compact
                trend={trend}
                label={`Penjualan ${salesDays} hari terakhir`}
              />
            </div>
          </div>
        </section>
        <section className="sales-panel sales-breakdown">
          <div className="sales-panel-heading">
            <div>
              <h2>
                <Flower2 size={17} />{' '}
                {sellerGroup === 'category' ? 'Kategori terlaris' : 'Jenis produk terlaris'}
              </h2>
              <p>
                {sellerGroup === 'category'
                  ? 'Kategori pada pesanan yang sudah selesai'
                  : 'Jenis produk pada pesanan yang sudah selesai'}
              </p>
            </div>
            <div className="sales-breakdown-selects">
              <select
                className="sales-occasion-period"
                aria-label="Kelompok produk terlaris"
                value={sellerGroup}
                onChange={(event) => setSellerGroup(event.target.value)}
              >
                <option value="category">Kategori</option>
                <option value="type">Jenis bunga / produk</option>
              </select>
              <select
                className="sales-occasion-period"
                aria-label="Periode kategori terlaris"
                value={categoryPeriod}
                onChange={(event) => setCategoryPeriod(event.target.value)}
              >
                <option value="all">Semua waktu</option>
                <option value="30">30 hari terakhir</option>
              </select>
            </div>
          </div>
          <div className="sales-breakdown-content">
            <div
              className="sales-donut sales-category-rings"
              role="img"
              aria-label={
                completedOrdersInPeriod
                  ? occasions
                      .map(
                        (occasion) =>
                          `${occasion.name}: ${occasion.quantity} pesanan, ${percentLabel(occasion.quantity)}`,
                      )
                      .join(', ')
                  : 'Belum ada penjualan produk dengan kategori pada periode ini'
              }
            >
              <svg viewBox="0 0 200 200" aria-hidden="true">
                {occasions.map((occasion, index) => {
                  const spacing = Math.min(10, 48 / Math.max(1, occasions.length - 1));
                  const radius = 90 - index * spacing;
                  const strokeWidth = Math.min(7, spacing * 0.72);
                  const percent = categoryPercent(occasion.quantity);
                  return (
                    <g key={occasion.id} transform="rotate(-90 100 100)">
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke={occasion.color}
                        strokeOpacity=".13"
                        strokeWidth={strokeWidth}
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke={occasion.color}
                        strokeWidth={strokeWidth}
                        pathLength="100"
                        strokeDasharray={`${percent} ${100 - percent}`}
                        strokeLinecap={percent ? 'round' : 'butt'}
                      />
                    </g>
                  );
                })}
              </svg>
              <div>
                <strong>{completedOrdersInPeriod}</strong>
                <small>pesanan selesai</small>
              </div>
            </div>
            <div className="sales-legend">
              {occasions.length ? (
                occasions.map((occasion) => (
                  <div
                    key={occasion.id ?? 'unassigned'}
                    data-occasion-id={occasion.id ?? 'unassigned'}
                  >
                    <i style={{ background: occasion.color }} />
                    <span>
                      {occasion.name}
                      <small>{occasion.quantity} pesanan</small>
                    </span>
                    <strong>{percentLabel(occasion.quantity)}</strong>
                  </div>
                ))
              ) : (
                <p>
                  Belum ada {sellerGroup === 'category' ? 'kategori' : 'jenis produk'} yang
                  ditambahkan.
                </p>
              )}
            </div>
          </div>
          <div className="sales-breakdown-footer">
            <ShoppingBag size={16} />
            <span>Total pesanan selesai</span>
            <strong>{completedOrdersInPeriod} pesanan</strong>
          </div>
          <p className="sales-occasion-note">
            Persentase dari {completedOrdersInPeriod} pesanan selesai. Tiap{' '}
            {sellerGroup === 'category' ? 'kategori' : 'jenis produk'} dihitung sekali per pesanan.
            Satu pesanan dapat memuat beberapa{' '}
            {sellerGroup === 'category' ? 'kategori' : 'jenis produk'}, sehingga total persentase
            dapat melebihi 100%.
          </p>
        </section>
      </div>
      <div className="sales-detail-grid">
        <section className="sales-panel sales-products-panel">
          <div className="sales-panel-heading">
            <div>
              <h2>
                <ShoppingBag size={16} /> Produk paling dibeli
              </h2>
              <p>Jumlah dari pesanan selesai</p>
            </div>
            <button
              className="text-btn"
              onClick={() => go(user.role === 'admin' ? 'products' : 'catalog')}
            >
              Lihat semua <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sales-list">
            {best.length ? (
              best.map((p) => (
                <div className="sales-product-row" key={p.id}>
                  <Photo src={p.photo} alt={p.name} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.categories
                        ?.map((category) => category.name)
                        .slice(0, 2)
                        .join(' · ') || (!p.active ? 'Produk arsip' : 'Koleksi Bien Vendre')}
                    </small>
                  </span>
                  <b>{p.sold_count} terjual</b>
                </div>
              ))
            ) : (
              <p className="sales-empty">Belum ada produk terjual.</p>
            )}
          </div>
        </section>
        <section className="sales-panel sales-recent-panel">
          <div className="sales-panel-heading">
            <div>
              <h2>
                <ShoppingBasket size={16} /> Pesanan terbaru
              </h2>
              <p>Aktivitas pesanan toko</p>
            </div>
            <button className="text-btn" onClick={() => go('orders')}>
              Lihat semua <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sales-list">
            {recent.length ? (
              recent.map((o) => (
                <div className="sales-order-row" key={o.id}>
                  <span className="sales-avatar">
                    {(o.customer_name || '?').charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <strong>{o.customer_name}</strong>
                    <small>
                      {orderCode(o.id)} · {date(o.order_date)}
                    </small>
                  </span>
                  <div>
                    <b>{money(o.total)}</b>
                    <small className={'sales-status ' + (o.status === 'completed' ? 'done' : '')}>
                      {o.status === 'completed' ? 'Selesai' : 'Belum selesai'}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="sales-empty">Belum ada pesanan.</p>
            )}
          </div>
        </section>
        <section className="sales-panel sales-order-summary">
          <div className="sales-panel-heading">
            <div>
              <h2>
                <Package size={16} /> Status pesanan
              </h2>
              <p>Ringkasan aktivitas toko</p>
            </div>
            <ShoppingBag size={18} />
          </div>
          <div className="sales-completion">
            <div className="sales-completion-symbol">
              <Package size={28} />
              <span>
                <Check size={13} />
              </span>
            </div>
            <div>
              <strong>
                {Math.round(
                  (Number(summary.completed_orders) /
                    Math.max(
                      1,
                      Number(summary.completed_orders) + Number(summary.pending_orders),
                    )) *
                    100,
                )}
                %
              </strong>
              <small>pesanan selesai</small>
            </div>
          </div>
          <div className="sales-completion-track">
            <span
              style={{
                width: `${(Number(summary.completed_orders) / Math.max(1, Number(summary.completed_orders) + Number(summary.pending_orders))) * 100}%`,
              }}
            />
          </div>
          <div className="sales-status-count">
            <span>Belum selesai</span>
            <strong>{summary.pending_orders}</strong>
          </div>
          <div className="sales-status-count">
            <span>Selesai</span>
            <strong>{summary.completed_orders}</strong>
          </div>
          <button className="text-btn" onClick={() => go('orders')}>
            Kelola pesanan <ArrowRight size={15} />
          </button>
        </section>
      </div>
    </div>
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
function Products({ data, query, setQuery, notify, refresh, productCategory, setProductCategory }) {
  const [uploading, setUploading] = useState(false);
  const [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    [typeFilter, setTypeFilter] = useState(
      productCategory.startsWith('type:') ? productCategory.slice(5) : '',
    ),
    [page, setPage] = useState(1),
    { busy, error, mutate, setError } = useMutation(notify, refresh);
  const occasionFilter = productCategory.startsWith('type:') ? '' : productCategory;
  const linksFor = (id) =>
    data.recommendations.filter((link) => String(link.product_id) === String(id));
  const products = data.products.filter((product) => {
    const links = linksFor(product.id);
    return (
      (product.name + ' ' + product.flower_type).toLowerCase().includes(query.toLowerCase()) &&
      (!occasionFilter ||
        (occasionFilter === 'none'
          ? !links.length
          : links.some((link) => String(link.category_id) === occasionFilter))) &&
      (!typeFilter ||
        (typeFilter === 'none'
          ? !product.product_type_id
          : String(product.product_type_id) === typeFilter))
    );
  });
  const pageSize = 7;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleProducts = products.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const topSellers = [...data.dashboard.popular]
    .sort(
      (a, b) =>
        Number(b.completed_order_count) - Number(a.completed_order_count) ||
        Number(b.sold_count) - Number(a.sold_count),
    )
    .slice(0, 5);
  function resetFilters() {
    setProductCategory('');
    setTypeFilter('');
    setQuery('');
    setPage(1);
  }
  function open(product) {
    setError('');
    setEdit(product);
  }
  function submit(event) {
    event.preventDefault();
    if (uploading) return;
    const form = new FormData(event.target),
      body = Object.fromEntries(form);
    body.price = Number(body.price);
    body.active = form.get('active') === 'on';
    body.product_type_id = form.get('product_type_id') ? Number(form.get('product_type_id')) : null;
    body.category_ids = form.getAll('category_ids').map(Number);
    mutate(
      '/manage/products' + (edit.id ? '/' + edit.id : ''),
      edit.id ? 'PUT' : 'POST',
      body,
      () => setEdit(null),
    );
  }
  return (
    <>
      <div className="product-workspace">
        <div className="product-overview-heading">
          <h2>
            <ChartNoAxesCombined size={18} /> Top seller <span>5 produk teratas</span>
          </h2>
          <button className="btn primary" onClick={() => open({ active: true, photo: asset })}>
            <Plus size={17} /> Tambah produk
          </button>
        </div>
        <section className="product-top-sellers" aria-label="Lima produk terlaris">
          {topSellers.length ? (
            topSellers.map((product, index) => (
              <article
                className={'product-seller-card seller-tone-' + index}
                key={product.id}
                data-product-id={product.id}
              >
                <span className="product-seller-rank">0{index + 1}</span>
                <Photo src={product.photo} alt={product.name} />
                <div>
                  <strong title={product.name}>{product.name}</strong>
                  <span>{product.completed_order_count} pesanan selesai</span>
                </div>
              </article>
            ))
          ) : (
            <div className="product-seller-empty">
              <ShoppingBag size={20} />
              <span>Produk terlaris akan muncul setelah pesanan diselesaikan.</span>
            </div>
          )}
        </section>
        <div className="product-management-layout">
          <section className="product-table-panel">
            <div className="product-table-heading">
              <h2>
                Koleksi produk <span>{products.length}</span>
              </h2>
              <label className="search-box product-table-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nama produk"
                  aria-label="Cari produk"
                />
              </label>
            </div>
            {typeFilter && (
              <div className="product-type-context">
                <Package size={14} />
                <span>
                  Jenis:{' '}
                  <strong>
                    {typeFilter === 'none'
                      ? 'Belum ditentukan'
                      : data.productTypes.find((type) => String(type.id) === typeFilter)?.name}
                  </strong>
                </span>
                <button
                  className="text-btn"
                  onClick={() => {
                    setTypeFilter('');
                    if (productCategory.startsWith('type:')) setProductCategory('');
                    setPage(1);
                  }}
                  aria-label="Hapus filter jenis"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            <div className="product-table-scroll">
              <table className="catalog-management-table" aria-label="Daftar produk">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Harga & jenis</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => {
                    const links = linksFor(product.id);
                    const type = data.productTypes.find(
                      (entry) => String(entry.id) === String(product.product_type_id),
                    );
                    return (
                      <tr key={product.id} data-product-id={product.id}>
                        <td>
                          <div className="catalog-product-cell">
                            <Photo src={product.photo} alt={product.name} />
                            <div className="catalog-product-copy">
                              <strong>{product.name}</strong>
                              <small>PRD-{String(product.id).padStart(3, '0')}</small>
                              <div className="catalog-product-occasions">
                                {links.slice(0, 2).map((link) => (
                                  <span key={link.id}>
                                    {link.category_name ||
                                      data.categories.find(
                                        (entry) => String(entry.id) === String(link.category_id),
                                      )?.name}
                                  </span>
                                ))}
                                {links.length > 2 && (
                                  <span title={links.map((link) => link.category_name).join(', ')}>
                                    +{links.length - 2}
                                  </span>
                                )}
                                {!links.length && <small>Tanpa occasion</small>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong className="catalog-product-price">{money(product.price)}</strong>
                          <small className="catalog-product-type">
                            {type?.name || 'Belum ditentukan'} / {product.size}
                          </small>
                        </td>
                        <td>
                          <span
                            className={
                              'catalog-product-status ' + (product.active ? 'is-active' : '')
                            }
                          >
                            <i />
                            {product.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              aria-label={'Edit ' + product.name}
                              onClick={() => open(product)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-btn danger"
                              aria-label={'Hapus ' + product.name}
                              onClick={() => setRemove(product)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!products.length && (
              <Empty text="Tidak ada produk yang cocok.">
                <button className="btn outline" onClick={resetFilters}>
                  Reset filter
                </button>
              </Empty>
            )}
            <div className="product-pagination">
              <span>
                {products.length ? (currentPage - 1) * pageSize + 1 : 0}-
                {Math.min(currentPage * pageSize, products.length)} dari {products.length} produk
              </span>
              <div>
                <button
                  className="icon-btn"
                  aria-label="Halaman sebelumnya"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ArrowLeft size={15} />
                </button>
                <strong>
                  {currentPage} / {pageCount}
                </strong>
                <button
                  className="icon-btn"
                  aria-label="Halaman berikutnya"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </section>
          <aside className="product-filter-panel" aria-label="Filter produk">
            <div className="product-filter-heading">
              <h2>
                <Settings size={17} /> Filter koleksi
              </h2>
              <button className="text-btn" onClick={resetFilters}>
                Reset
              </button>
            </div>
            <label>
              Occasion
              <select
                aria-label="Filter occasion"
                value={occasionFilter}
                onChange={(event) => {
                  setProductCategory(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua occasion</option>
                {data.categories.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
                <option value="none">Tanpa occasion</option>
              </select>
            </label>
            <label>
              Jenis produk
              <select
                aria-label="Filter jenis produk"
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  if (productCategory.startsWith('type:')) setProductCategory('');
                  setPage(1);
                }}
              >
                <option value="">Semua jenis</option>
                {data.productTypes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
                <option value="none">Belum ditentukan</option>
              </select>
            </label>
            <div className="product-filter-summary">
              <div>
                <span>Aktif</span>
                <strong>{products.filter((product) => product.active).length}</strong>
              </div>
              <div>
                <span>Nonaktif</span>
                <strong>{products.filter((product) => !product.active).length}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {edit && (
        <Modal wide title={edit.id ? 'Edit produk' : 'Tambah produk'} onClose={() => setEdit(null)}>
          <form className="editor-form modern-catalog-editor product-editor" onSubmit={submit}>
            <div className="catalog-editor-intro">
              <span className="dimensional-icon">
                <ShoppingBag size={22} />
              </span>
              <div>
                <strong>
                  {edit.id ? 'Sempurnakan detail koleksi' : 'Tambahkan cerita baru ke koleksi'}
                </strong>
                <p>Lengkapi detail, pilih occasion, dan unggah foto produk.</p>
              </div>
            </div>
            <div className="catalog-editor-layout">
              <div className="catalog-editor-main">
                <h3 className="form-section-title">01 / Informasi produk</h3>
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
                <h3 className="form-section-title">02 / Jenis & bahan</h3>
                <label>
                  Jenis produk
                  <select
                    name="product_type_id"
                    aria-label="Jenis produk"
                    required
                    defaultValue={edit.product_type_id || data.productTypes[0]?.id || ''}
                  >
                    <option value="">Pilih jenis produk</option>
                    {data.productTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bahan / rincian produk
                  <input
                    name="flower_type"
                    defaultValue={edit.flower_type}
                    required
                    maxLength={150}
                  />
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
                <h3 className="form-section-title">03 / Occasion produk</h3>
                <fieldset className="product-occasions">
                  <legend>Occasion / kategori</legend>
                  <p>Pilih satu atau beberapa momen yang cocok untuk produk ini.</p>
                  {data.categories.length ? (
                    <div className="occasion-options">
                      {data.categories.map((c) => (
                        <label key={c.id}>
                          <input
                            type="checkbox"
                            name="category_ids"
                            value={c.id}
                            defaultChecked={data.recommendations.some(
                              (r) =>
                                String(r.product_id) === String(edit.id) &&
                                String(r.category_id) === String(c.id),
                            )}
                          />
                          <span>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p>Belum ada occasion. Tambahkan kategori di menu Kategori.</p>
                  )}
                </fieldset>
              </div>
              <aside className="catalog-editor-media">
                <h3 className="form-section-title">04 / Foto & publikasi</h3>
                <PhotoField initialValue={edit.photo} onBusyChange={setUploading} />
                <label className="checkbox">
                  <input type="checkbox" name="active" defaultChecked={edit.active} /> Aktif di
                  katalog
                </label>
              </aside>
            </div>
            {error && <p className="form-error">{error}</p>}
            <FormActions busy={busy || uploading} onClose={() => setEdit(null)} />
          </form>
        </Modal>
      )}
      {remove && (
        <Modal title="Hapus produk?" onClose={() => setRemove(null)}>
          <p>
            Hapus <strong>{remove.name}</strong>? Produk yang terhubung dengan occasion atau pesanan
            tidak dapat dihapus. Anda dapat menonaktifkannya melalui Edit.
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
function ClassificationHeader({ data, kind, setKind, search, setSearch }) {
  const tabs = [
    ['occasion', 'Occasion', Flower2, data?.categories.length || 0],
    ['type', 'Jenis produk', Package, data?.productTypes.length || 0],
  ];
  return (
    <div className="classification-command">
      <div
        className="classification-switcher"
        role="tablist"
        aria-label="Kelompok kategori"
        style={{ '--classification-tab': kind === 'type' ? 1 : 0 }}
      >
        <span className="classification-tab-surface" aria-hidden="true" />
        {tabs.map(([id, label, Icon, count], index) => (
          <button
            key={id}
            id={'classification-tab-' + id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            aria-controls={'classification-panel-' + id}
            tabIndex={kind === id ? 0 : -1}
            onClick={() => {
              setKind(id);
              setSearch('');
            }}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
                setKind(tabs[next][0]);
                setSearch('');
                document.getElementById('classification-tab-' + tabs[next][0])?.focus();
              }
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
            <small>{count}</small>
          </button>
        ))}
      </div>
      <label className="search-box classification-search">
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={kind === 'type' ? 'Cari jenis produk…' : 'Cari occasion…'}
          aria-label="Cari kategori"
        />
      </label>
    </div>
  );
}
function Categories(props) {
  return (
    <div className="classification-workspace">
      <ClassificationSection
        key={props.classificationKind}
        {...props}
        query={props.classificationSearch}
        kind={props.classificationKind}
      />
    </div>
  );
}
function ClassificationSection({ data, query, notify, refresh, go, setProductCategory, kind }) {
  const isType = kind === 'type';
  const entries = (isType ? data.productTypes : data.categories).filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );
  const [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    [uploading, setUploading] = useState(false);
  const { busy, error, mutate, setError } = useMutation(notify, refresh);
  const path = '/manage/' + (isType ? 'product-types' : 'categories');
  const defaultPhoto =
    '/assets/classifications/' + (isType ? 'type-bunga' : 'occasion-hadiah') + '-v1.webp';
  function submit(event) {
    event.preventDefault();
    if (uploading) return;
    mutate(
      path + (edit.id ? '/' + edit.id : ''),
      edit.id ? 'PUT' : 'POST',
      Object.fromEntries(new FormData(event.target)),
      () => setEdit(null),
      (isType ? 'Jenis produk' : 'Occasion') + ' berhasil disimpan.',
    );
  }
  return (
    <section
      className="classification-section"
      role="tabpanel"
      id={'classification-panel-' + kind}
      aria-labelledby={'classification-tab-' + kind}
    >
      <div className="classification-section-heading">
        <div className="classification-title">
          <span className="dimensional-icon">
            {isType ? <Package size={23} /> : <Flower2 size={23} />}
          </span>
          <div>
            <h2>{isType ? 'Jenis produk' : 'Occasion'}</h2>
            <p>
              {isType
                ? 'Kelompokkan koleksi menurut jenis dan karakter produknya.'
                : 'Rangkai koleksi untuk setiap momen istimewa pelanggan.'}
            </p>
          </div>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            setError('');
            setEdit({ photo: defaultPhoto });
          }}
        >
          <Plus size={17} />
          {isType ? 'Tambah jenis' : 'Tambah occasion'}
        </button>
      </div>
      <div className="classification-collection-meta">
        <span>
          <span className="online-dot" />
          {entries.length} {isType ? 'jenis produk' : 'occasion'}
        </span>
        <span>Terhubung langsung dengan katalog toko</span>
      </div>
      <div className="classification-grid">
        {entries.map((c, index) => {
          const items = data.products.filter(
            (p) =>
              p.active &&
              (isType
                ? String(p.product_type_id) === String(c.id)
                : data.recommendations.some(
                    (r) =>
                      String(r.category_id) === String(c.id) &&
                      String(r.product_id) === String(p.id),
                  )),
          );
          return (
            <article
              className={'classification-card classification-tone-' + (index % 4)}
              key={c.id}
            >
              <div className="classification-card-top">
                <span className="classification-kind">{isType ? 'JENIS PRODUK' : 'OCCASION'}</span>
                <span className="classification-product-count">
                  <Package size={12} />
                  {items.length} produk
                </span>
              </div>
              <div className="classification-cover">
                <Photo src={c.photo || defaultPhoto} alt={'Ikon ' + c.name} loading="eager" />
              </div>
              <div className="classification-card-body">
                <h3>{c.name}</h3>
                <p>
                  {c.description ||
                    (isType
                      ? 'Temukan koleksi pilihan untuk jenis produk ini.'
                      : 'Pilihan rangkaian untuk momen yang berkesan.')}
                </p>
                <div className="classification-preview">
                  {items.slice(0, 3).map((p) => (
                    <Photo key={p.id} src={p.photo} alt={p.name} />
                  ))}
                  <span>
                    {items.length
                      ? items.length > 3
                        ? '+' + (items.length - 3) + ' koleksi lainnya'
                        : 'Koleksi tersedia'
                      : 'Siap untuk koleksi baru'}
                  </span>
                </div>
                <div className="classification-actions">
                  <button
                    className="classification-view-btn"
                    onClick={() => {
                      setProductCategory(isType ? 'type:' + c.id : String(c.id));
                      go('products');
                    }}
                  >
                    Lihat produk <ArrowUpRight size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label={'Edit ' + c.name}
                    onClick={() => {
                      setError('');
                      setEdit(c);
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label={'Hapus ' + c.name}
                    onClick={() => {
                      setError('');
                      setRemove(c);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!entries.length && (
        <Empty
          text={
            query
              ? 'Tidak ada kategori yang cocok dengan pencarian.'
              : isType
                ? 'Belum ada jenis produk.'
                : 'Belum ada occasion.'
          }
        />
      )}
      {edit && (
        <Modal
          wide
          title={(edit.id ? 'Edit ' : 'Tambah ') + (isType ? 'jenis produk' : 'occasion')}
          onClose={() => setEdit(null)}
        >
          <form className="editor-form modern-catalog-editor" onSubmit={submit}>
            <div className="catalog-editor-intro">
              <span className="dimensional-icon">
                {isType ? <Package size={22} /> : <Flower2 size={22} />}
              </span>
              <div>
                <strong>
                  {edit.id ? 'Perbarui identitas koleksi' : 'Buat kelompok koleksi baru'}
                </strong>
                <p>Nama, deskripsi, dan foto akan tampil pada katalog pelanggan.</p>
              </div>
            </div>
            <div className="catalog-editor-layout">
              <div className="catalog-editor-main">
                <h3 className="catalog-form-heading">
                  Informasi {isType ? 'jenis produk' : 'occasion'}
                </h3>
                <label>
                  {isType ? 'Nama jenis' : 'Nama occasion'}
                  <input
                    name="name"
                    defaultValue={edit.name}
                    required
                    maxLength={100}
                    placeholder={isType ? 'Contoh: Bunga artificial' : 'Contoh: Anniversary'}
                  />
                </label>
                <label>
                  Deskripsi
                  <textarea
                    name="description"
                    defaultValue={edit.description}
                    maxLength={1000}
                    rows={5}
                    placeholder="Ceritakan karakter koleksi dan momen yang sesuai…"
                  />
                </label>
                <div className="catalog-form-tip">
                  <Sparkles size={17} />
                  <p>
                    Gunakan nama singkat dan foto yang mudah dikenali agar pelanggan lebih cepat
                    menemukan koleksinya.
                  </p>
                </div>
              </div>
              <aside className="catalog-editor-media">
                <h3 className="catalog-form-heading">Foto & ikon koleksi</h3>
                <PhotoField
                  initialValue={edit.photo || defaultPhoto}
                  uploadLabel={isType ? 'Upload foto jenis produk' : 'Upload foto occasion'}
                  onBusyChange={setUploading}
                />
              </aside>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <FormActions busy={busy || uploading} onClose={() => setEdit(null)} />
          </form>
        </Modal>
      )}
      {remove && (
        <Modal title={'Hapus ' + remove.name + '?'} onClose={() => setRemove(null)}>
          <p>Data yang masih digunakan produk perlu dilepas terlebih dahulu.</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="btn outline" onClick={() => setRemove(null)}>
              Batal
            </button>
            <button
              className="btn destructive"
              disabled={busy}
              onClick={() => mutate(path + '/' + remove.id, 'DELETE', null, () => setRemove(null))}
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function OrderTable({ orders, user, onDetail, onEdit, onRemove, onStatus }) {
  const day = today();
  return (
    <div className="order-table-scroll">
      <table className="orders-management-table" aria-label="Daftar pesanan">
        <thead>
          <tr>
            <th>Pesanan & pemesan</th>
            <th>Produk</th>
            <th>Pengiriman</th>
            <th>Total</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const unfinished = ['pending', 'processing'].includes(order.status);
            const delivery = String(order.delivery_date).slice(0, 10);
            const categories = [
              ...new Map(
                order.items
                  .flatMap((item) => item.categories || [])
                  .map((category) => [String(category.id), category]),
              ).values(),
            ];
            return (
              <tr key={order.id} data-order-id={order.id}>
                <td>
                  <button
                    className="order-code-link"
                    onClick={() => onDetail(order)}
                    aria-label={'Detail ' + orderCode(order.id)}
                  >
                    {orderCode(order.id)} <ArrowUpRight size={12} />
                  </button>
                  <strong className="order-customer-name">{order.customer_name}</strong>
                  <div className="order-contact-line">
                    <span>{order.phone_number}</span>
                    {whatsappUrl(order.phone_number) && (
                      <a
                        className="order-chat-button"
                        href={whatsappUrl(order.phone_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={'Chat WhatsApp ' + orderCode(order.id)}
                      >
                        <MessageCircle size={11} /> Chat WA
                      </a>
                    )}
                  </div>
                </td>
                <td>
                  <div className="order-product-preview">
                    <Photo src={order.items[0]?.photo} alt="" />
                    <div>
                      <strong title={order.items[0]?.product_name}>
                        {order.items[0]?.product_name || 'Produk pesanan'}
                      </strong>
                      <small>
                        {order.items.reduce((sum, item) => sum + Number(item.quantity), 0)} unit
                        {order.items.length > 1 ? ' / ' + order.items.length + ' produk' : ''}
                      </small>
                      <div className="order-category-tags">
                        {categories.slice(0, 2).map((category) => (
                          <span key={category.id}>{category.name}</span>
                        ))}
                        {categories.length > 2 && <span>+{categories.length - 2}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <strong className="order-delivery-date">{date(order.delivery_date)}</strong>
                  <small
                    className={
                      'order-delivery-label ' +
                      (unfinished && delivery < day
                        ? 'overdue'
                        : unfinished && delivery === day
                          ? 'today'
                          : '')
                    }
                  >
                    {unfinished && delivery < day
                      ? 'Terlambat'
                      : unfinished && delivery === day
                        ? 'Kirim hari ini'
                        : order.status === 'completed'
                          ? 'Sudah selesai'
                          : 'Terjadwal'}
                  </small>
                </td>
                <td>
                  <strong className="order-table-total">{money(order.total)}</strong>
                </td>
                <td>
                  <Badge status={order.status === 'processing' ? 'pending' : order.status} />
                </td>
                <td>
                  <div className="row-actions">
                    {user.role === 'admin' && unfinished ? (
                      <>
                        <button
                          className="icon-btn"
                          aria-label={'Edit ' + orderCode(order.id)}
                          onClick={() => onEdit(order)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn order-complete-btn"
                          aria-label={'Status ' + orderCode(order.id)}
                          title="Selesaikan pesanan"
                          onClick={() => onStatus(order)}
                        >
                          <Check size={15} />
                        </button>
                        {order.status === 'pending' && (
                          <button
                            className="icon-btn danger"
                            aria-label={'Hapus ' + orderCode(order.id)}
                            onClick={() => onRemove(order)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        className="icon-btn"
                        aria-label={'Lihat ' + orderCode(order.id)}
                        onClick={() => onDetail(order)}
                      >
                        <Eye size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!orders.length && <Empty text="Tidak ada pesanan yang sesuai dengan filter." />}
    </div>
  );
}
function OrderPagination({ page, pages, total, onChange, label = 'pesanan' }) {
  const pageNumbers =
    pages <= 7
      ? Array.from({ length: pages }, (_, index) => index + 1)
      : [
          ...new Set([
            1,
            ...Array.from({ length: 5 }, (_, index) => page + index - 2).filter(
              (value) => value > 0 && value <= pages,
            ),
            pages,
          ]),
        ].sort((a, b) => a - b);
  return (
    <nav className="order-pagination" aria-label={'Halaman ' + label}>
      <span>
        {total ? (page - 1) * 7 + 1 : 0}-{Math.min(page * 7, total)} dari {total} {label}
      </span>
      <div>
        <button
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ArrowLeft size={14} />
        </button>
        {pageNumbers.map((number, index) => (
          <React.Fragment key={number}>
            {index > 0 && number - pageNumbers[index - 1] > 1 && <span>...</span>}
            <button
              aria-label={'Halaman ' + number}
              aria-current={number === page ? 'page' : undefined}
              onClick={() => onChange(number)}
            >
              {number}
            </button>
          </React.Fragment>
        ))}
        <button
          aria-label="Halaman berikutnya"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ArrowRight size={14} />
        </button>
      </div>
    </nav>
  );
}
function Orders({ data, user, query, setQuery, notify, refresh, go }) {
  const defaults = {
    period: 'all',
    status: 'all',
    category: '',
    type: '',
    due: 'all',
    sort: 'newest',
  };
  const [filters, setFilters] = useState(defaults),
    [page, setPage] = useState(1),
    [report, setReport] = useState(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(''),
    [retry, setRetry] = useState(0),
    [edit, setEdit] = useState(null),
    [detail, setDetail] = useState(null),
    [remove, setRemove] = useState(null),
    [status, setStatus] = useState(null),
    { busy, mutate } = useMutation(notify, refresh);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      const parameters = new URLSearchParams({
        period: filters.period,
        status: filters.status,
        due: filters.due,
        sort: filters.sort,
        page: String(page),
        q: query,
      });
      if (filters.category) parameters.set('category', filters.category);
      if (filters.type) parameters.set('type', filters.type);
      api('/orders/workspace?' + parameters, { signal: controller.signal })
        .then((value) => {
          if (active) {
            setReport(value);
            setLoadError('');
          }
        })
        .catch((error) => {
          if (active && error.name !== 'AbortError') setLoadError(error.message);
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
  }, [filters, query, page, data.orders, retry]);
  function changeFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setPage(1);
  }
  function resetFilters() {
    setFilters(defaults);
    setQuery('');
    setPage(1);
  }
  function priority(due) {
    setFilters((previous) => ({
      ...previous,
      period: 'all',
      status: 'pending',
      due: previous.due === due ? 'all' : due,
    }));
    setPage(1);
  }
  const summary = report?.summary || {
    total: 0,
    completed: 0,
    pending: 0,
    completed_value: 0,
    due_today: 0,
    overdue: 0,
  };
  const completion = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  const cards = [
    ['Pesanan', summary.total, ShoppingBag, 'all'],
    ['Selesai', summary.completed, Check, 'completed'],
    ['Belum selesai', summary.pending, Package, 'pending'],
    ['Nilai pesanan selesai', money(summary.completed_value), ChartNoAxesCombined, 'completed'],
  ];
  return (
    <>
      <div className="orders-workspace" aria-busy={loading}>
        <div className="orders-command">
          <div className="orders-period-switch" role="group" aria-label="Periode pesanan">
            {[
              ['all', 'Semua waktu'],
              ['7', '7 hari terakhir'],
              ['month', 'Bulan ini'],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filters.period === value}
                onClick={() => changeFilter('period', value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="orders-command-actions">
            <button className="btn outline" onClick={() => go('reports')}>
              <ChartNoAxesCombined size={15} /> Laporan
            </button>
            {user.role === 'admin' && (
              <button className="btn primary" onClick={() => setEdit({})}>
                <Plus size={17} /> Catat pesanan
              </button>
            )}
          </div>
        </div>
        <div className="order-summary-cards">
          {cards.map(([label, value, Icon, selected], index) => (
            <button
              key={label}
              className={'order-summary-card order-summary-tone-' + index}
              data-summary={['total', 'completed', 'pending', 'completed-value'][index]}
              onClick={() => changeFilter('status', selected)}
            >
              <span className="order-summary-icon">
                <Icon size={19} />
              </span>
              <span>{label}</span>
              <strong>{loading && !report ? '-' : value}</strong>
            </button>
          ))}
        </div>
        <div className="order-analytics">
          <section className="order-trend-panel">
            <div className="order-panel-heading">
              <div>
                <h2>
                  <ChartNoAxesCombined size={17} /> Aktivitas pesanan
                </h2>
                <p>
                  Berdasarkan tanggal pesanan /{' '}
                  {filters.period === 'all' ? 'ringkasan bulanan' : 'ringkasan harian'}
                </p>
              </div>
              <div className="order-chart-legend">
                <span>
                  <i /> Selesai
                </span>
                <span>
                  <i /> Belum selesai
                </span>
              </div>
            </div>
            <OrderStatusChart trend={report?.trend || []} monthly={filters.period === 'all'} />
          </section>
          <section className="order-completion-panel">
            <div
              className="order-completion-donut"
              role="img"
              aria-label={`${summary.completed} selesai dari ${summary.total} pesanan`}
              style={{
                background: `conic-gradient(#328eaa 0% ${completion}%,#e6b673 ${completion}% 100%)`,
              }}
            >
              <div>
                <strong>{completion}%</strong>
                <small>selesai</small>
              </div>
            </div>
            <div>
              <h2>Status pesanan</h2>
              <p>
                <i className="done" />
                <span>Selesai</span>
                <strong>{summary.completed}</strong>
              </p>
              <p>
                <i />
                <span>Belum selesai</span>
                <strong>{summary.pending}</strong>
              </p>
              <small>Mengikuti hasil filter</small>
            </div>
          </section>
        </div>
        <div className="order-priority-strip">
          <span>
            <CalendarDays size={15} /> Prioritas pengiriman
          </span>
          <button
            className={filters.due === 'today' ? 'selected' : ''}
            onClick={() => priority('today')}
          >
            Hari ini <strong>{summary.due_today}</strong>
          </button>
          <button
            className={'order-overdue-shortcut ' + (filters.due === 'overdue' ? 'selected' : '')}
            onClick={() => priority('overdue')}
          >
            Terlambat <strong>{summary.overdue}</strong>
          </button>
          {loading && (
            <span className="orders-loading">
              <LoaderCircle size={14} className="spin" /> Memuat
            </span>
          )}
        </div>
        <div className="orders-management-layout">
          <section className="orders-table-panel">
            <div className="orders-table-toolbar">
              <div className="order-status-switch" role="group" aria-label="Status pesanan">
                {[
                  ['all', 'Semua'],
                  ['pending', 'Belum selesai'],
                  ['completed', 'Selesai'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filters.status === value}
                    onClick={() => changeFilter('status', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="search-box order-table-search">
                <Search size={16} />
                <input
                  value={query}
                  maxLength={120}
                  aria-label="Cari pesanan"
                  placeholder="Nama, nomor, kode atau produk"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
            {loadError ? (
              <Empty text={loadError}>
                <button className="btn outline" onClick={() => setRetry((value) => value + 1)}>
                  Coba lagi
                </button>
              </Empty>
            ) : (
              <div className={loading ? 'orders-table-loading' : ''}>
                <OrderTable
                  orders={report?.orders || []}
                  user={user}
                  onDetail={setDetail}
                  onEdit={setEdit}
                  onRemove={setRemove}
                  onStatus={setStatus}
                />
                <OrderPagination
                  page={report?.page || 1}
                  pages={report?.pages || 1}
                  total={report?.total || 0}
                  onChange={setPage}
                />
              </div>
            )}
          </section>
          <aside className="order-filter-panel" aria-label="Filter pesanan">
            <div className="order-filter-heading">
              <h2>
                <Settings size={16} /> Filter pesanan
              </h2>
              <button className="text-btn" onClick={resetFilters}>
                Reset
              </button>
            </div>
            <label>
              Occasion
              <select
                aria-label="Filter occasion pesanan"
                value={filters.category}
                onChange={(event) => changeFilter('category', event.target.value)}
              >
                <option value="">Semua occasion</option>
                {data.categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value="none">Tanpa occasion</option>
              </select>
            </label>
            <label>
              Jenis produk
              <select
                aria-label="Filter jenis pesanan"
                value={filters.type}
                onChange={(event) => changeFilter('type', event.target.value)}
              >
                <option value="">Semua jenis</option>
                {data.productTypes.map((type) => (
                  <option value={type.id} key={type.id}>
                    {type.name}
                  </option>
                ))}
                <option value="none">Belum ditentukan</option>
              </select>
            </label>
            <label>
              Jadwal pengiriman
              <select
                aria-label="Filter jadwal pesanan"
                value={filters.due}
                onChange={(event) => changeFilter('due', event.target.value)}
              >
                <option value="all">Semua jadwal</option>
                <option value="today">Kirim hari ini</option>
                <option value="overdue">Terlambat</option>
              </select>
            </label>
            <label>
              Urutkan
              <select
                aria-label="Urutan pesanan"
                value={filters.sort}
                onChange={(event) => changeFilter('sort', event.target.value)}
              >
                <option value="newest">Pesanan terbaru</option>
                <option value="delivery">Pengiriman terdekat</option>
              </select>
            </label>
          </aside>
        </div>
      </div>
      {edit && (
        <OrderEditor
          order={edit}
          products={data.products
            .filter(
              (p) =>
                p.active || edit.items?.some((item) => String(item.product_id) === String(p.id)),
            )
            .map((p) => {
              const previous = edit.items?.find((item) => String(item.product_id) === String(p.id));
              return !p.active && previous
                ? { ...p, name: previous.product_name, price: previous.price }
                : p;
            })}
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
    order.items?.map((item) => ({
      product_id: String(item.product_id),
      quantity: item.quantity,
    })) || [{ product_id: '', quantity: 1 }],
  );
  const [customerName, setCustomerName] = useState(order.customer_name || ''),
    [phone, setPhone] = useState(order.phone_number || ''),
    [orderDate, setOrderDate] = useState(order.order_date?.slice(0, 10) || today()),
    [deliveryDate, setDeliveryDate] = useState(order.delivery_date?.slice(0, 10) || today()),
    [productSearch, setProductSearch] = useState(''),
    { busy, error, mutate } = useMutation(notify, refresh);
  const total =
    items.reduce(
      (sum, item) =>
        sum +
        Math.round(
          Number(products.find((product) => String(product.id) === item.product_id)?.price || 0) *
            100,
        ) *
          Number(item.quantity || 0),
      0,
    ) / 100;
  const units = items.reduce(
    (sum, item) => sum + (item.product_id ? Number(item.quantity || 0) : 0),
    0,
  );
  function update(index, key, value) {
    setItems((previous) =>
      previous.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }
  function quickDate(offset) {
    if (!orderDate) return;
    const value = new Date(orderDate + 'T12:00:00Z');
    value.setUTCDate(value.getUTCDate() + offset);
    setDeliveryDate(value.toISOString().slice(0, 10));
  }
  function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    body.items = items.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
    }));
    mutate(
      '/orders' + (order.id ? '/' + order.id : ''),
      order.id ? 'PUT' : 'POST',
      body,
      onClose,
      'Pesanan berhasil dicatat.',
    );
  }
  return (
    <Modal
      wide
      title={order.id ? 'Edit ' + orderCode(order.id) : 'Catat pesanan baru'}
      onClose={onClose}
    >
      <form className="editor-form modern-catalog-editor modern-order-editor" onSubmit={submit}>
        <div className="catalog-editor-intro">
          <span className="dimensional-icon">
            <ShoppingBag size={22} />
          </span>
          <div>
            <strong>
              {order.id ? 'Perbarui rincian pesanan' : 'Catat pesanan dengan lebih mudah'}
            </strong>
            <p>Isi nama pemesan, pilih produk, lalu tentukan jadwal pengiriman.</p>
          </div>
        </div>
        <div className="order-editor-layout">
          <div className="order-editor-main">
            <section className="order-editor-section">
              <h3>
                <span>01</span> Pemesan
              </h3>
              <div className="form-grid">
                <label>
                  Pesanan atas nama siapa
                  <input
                    name="customer_name"
                    required
                    maxLength={120}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Nama lengkap"
                  />
                </label>
                <label>
                  Nomor telepon
                  <input
                    name="phone_number"
                    type="tel"
                    aria-describedby="order-phone-hint"
                    required
                    maxLength={24}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </label>
              </div>
              <p className="order-phone-hint" id="order-phone-hint">
                Gunakan nomor WhatsApp aktif agar pemesan mudah dihubungi.
              </p>
            </section>
            <section className="order-editor-section">
              <h3>
                <span>02</span> Jadwal pesanan
              </h3>
              <div className="form-grid">
                <label>
                  Tanggal pesanan
                  <input
                    name="order_date"
                    type="date"
                    required
                    value={orderDate}
                    onChange={(event) => {
                      setOrderDate(event.target.value);
                      if (deliveryDate < event.target.value) setDeliveryDate(event.target.value);
                    }}
                  />
                </label>
                <label>
                  Tanggal pengiriman
                  <input
                    name="delivery_date"
                    type="date"
                    required
                    min={orderDate}
                    value={deliveryDate}
                    onChange={(event) => setDeliveryDate(event.target.value)}
                  />
                </label>
              </div>
              <div className="order-quick-dates">
                <span>Pengiriman cepat</span>
                {[
                  [0, 'Hari yang sama'],
                  [1, '+1 hari'],
                  [3, '+3 hari'],
                ].map(([offset, label]) => (
                  <button key={offset} type="button" onClick={() => quickDate(offset)}>
                    {label}
                  </button>
                ))}
              </div>
            </section>
            <section className="order-editor-section">
              <div className="order-items-header">
                <h3>
                  <span>03</span> Produk pesanan
                </h3>
                <button
                  type="button"
                  className="text-btn"
                  disabled={items.length >= 30 || items.length >= products.length}
                  onClick={() =>
                    setItems((previous) => [...previous, { product_id: '', quantity: 1 }])
                  }
                >
                  <Plus size={15} /> Tambah item
                </button>
              </div>
              <label className="search-box order-product-search">
                <Search size={15} />
                <input
                  aria-label="Cari produk pesanan"
                  placeholder="Cari nama produk sebelum memilih"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                />
              </label>
              <div className="order-editor-items">
                {items.map((item, index) => {
                  const product = products.find((value) => String(value.id) === item.product_id);
                  return (
                    <div className="order-entry-item" key={index}>
                      <div className="order-entry-product">
                        <span className="order-item-number">{index + 1}</span>
                        {product ? (
                          <Photo src={product.photo} alt="" />
                        ) : (
                          <span className="order-item-placeholder">
                            <Package size={20} />
                          </span>
                        )}
                        <label>
                          Produk {index + 1}
                          <select
                            required
                            aria-label={'Produk ' + (index + 1)}
                            value={item.product_id}
                            onChange={(event) => update(index, 'product_id', event.target.value)}
                          >
                            <option value="" disabled>
                              Pilih produk
                            </option>
                            {products
                              .filter(
                                (value) =>
                                  String(value.id) === item.product_id ||
                                  (value.name + ' ' + value.flower_type)
                                    .toLowerCase()
                                    .includes(productSearch.toLowerCase()),
                              )
                              .map((value) => (
                                <option
                                  value={value.id}
                                  key={value.id}
                                  disabled={items.some(
                                    (other, j) =>
                                      j !== index && other.product_id === String(value.id),
                                  )}
                                >
                                  {value.name} - {money(value.price)}
                                  {!value.active ? ' (arsip)' : ''}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="icon-btn danger"
                          disabled={items.length === 1}
                          aria-label={'Hapus item ' + (index + 1)}
                          onClick={() =>
                            setItems((previous) => previous.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="order-entry-bottom">
                        <div className="order-quantity-control">
                          <span>Jumlah</span>
                          <button
                            type="button"
                            disabled={Number(item.quantity) <= 1}
                            aria-label={'Kurangi jumlah ' + (index + 1)}
                            onClick={() =>
                              update(index, 'quantity', Math.max(1, Number(item.quantity) - 1))
                            }
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            required
                            aria-label={'Jumlah ' + (index + 1)}
                            value={item.quantity}
                            onChange={(event) => update(index, 'quantity', event.target.value)}
                          />
                          <button
                            type="button"
                            disabled={Number(item.quantity) >= 100}
                            aria-label={'Tambah jumlah ' + (index + 1)}
                            onClick={() =>
                              update(index, 'quantity', Math.min(100, Number(item.quantity) + 1))
                            }
                          >
                            +
                          </button>
                        </div>
                        <div className="order-item-subtotal">
                          <span>Subtotal</span>
                          <strong>
                            {money(
                              (Math.round(Number(product?.price || 0) * 100) *
                                Number(item.quantity || 0)) /
                                100,
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!products.length && (
                <p className="form-error">Tambahkan produk aktif ke katalog terlebih dahulu.</p>
              )}
            </section>
            <section className="order-editor-section">
              <h3>
                <span>04</span> Catatan pelanggan
              </h3>
              <label>
                Permintaan / kartu ucapan
                <textarea
                  name="request"
                  rows={3}
                  maxLength={3000}
                  defaultValue={order.request}
                  placeholder="Warna rangkaian, isi kartu ucapan, atau permintaan khusus"
                />
              </label>
            </section>
          </div>
          <aside className="order-editor-summary">
            <h3>
              <ShoppingBasket size={18} /> Ringkasan pesanan
            </h3>
            <div className="order-summary-customer">
              <span className="avatar">{customerName.charAt(0).toUpperCase() || '?'}</span>
              <div>
                <strong>{customerName || 'Nama pemesan'}</strong>
                <small>{phone || 'Nomor telepon belum diisi'}</small>
              </div>
            </div>
            <div className="order-summary-schedule">
              <span>
                <CalendarDays size={14} /> Pengiriman
              </span>
              <strong>{deliveryDate ? date(deliveryDate) : '-'}</strong>
            </div>
            <div className="order-summary-selected">
              {items
                .filter((item) => item.product_id)
                .map((item) => {
                  const product = products.find((value) => String(value.id) === item.product_id);
                  return (
                    <div key={item.product_id}>
                      <span>{product?.name}</span>
                      <strong>{item.quantity}x</strong>
                    </div>
                  );
                })}
            </div>
            <div className="order-summary-units">
              <span>Jumlah unit</span>
              <strong>{units}</strong>
            </div>
            <div className="order-total">
              <span>Estimasi total</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="order-summary-help">
              <ShieldCheck size={15} /> Pesanan disimpan sebagai belum selesai. Selesaikan setelah
              transaksi ditangani.
            </p>
          </aside>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <FormActions busy={busy || !products.length} onClose={onClose} />
      </form>
    </Modal>
  );
}
function Reports({ data, notify }) {
  const defaults = {
    period: 'all',
    from: '',
    to: '',
    q: '',
    category: '',
    type: '',
    sort: 'recent',
  };
  const [filters, setFilters] = useState(defaults),
    [page, setPage] = useState(1),
    [result, setResult] = useState(null),
    [from, setFrom] = useState(today().slice(0, 7) + '-01'),
    [to, setTo] = useState(today()),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(''),
    [downloading, setDownloading] = useState(''),
    [retry, setRetry] = useState(0),
    [detail, setDetail] = useState(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        period: filters.period,
        q: filters.q,
        sort: filters.sort,
        page: String(page),
      });
      if (filters.period === 'custom') {
        query.set('from', filters.from);
        query.set('to', filters.to);
      }
      if (filters.category) query.set('category', filters.category);
      if (filters.type) query.set('type', filters.type);
      api('/reports/workspace?' + query, { signal: controller.signal })
        .then((report) => {
          if (active) {
            setResult(report);
            setLoadError('');
          }
        })
        .catch((error) => {
          if (active && error.name !== 'AbortError') setLoadError(error.message);
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
  }, [filters, page, retry]);
  function changeFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
    setPage(1);
  }
  function resetFilters() {
    setFilters(defaults);
    setFrom(today().slice(0, 7) + '-01');
    setTo(today());
    setPage(1);
  }
  function customPeriod(event) {
    event.preventDefault();
    setFilters((previous) => ({ ...previous, period: 'custom', from, to }));
    setPage(1);
  }
  async function download(kind) {
    if (!result || loading || loadError) return;
    setDownloading(kind);
    try {
      const query = new URLSearchParams({
        ...result.query,
        period: 'custom',
        from: result.from,
        to: result.to,
      });
      const response = await fetch(
        '/api/reports/' + (kind === 'xlsx' ? 'excel' : 'pdf') + '?' + query,
        { credentials: 'same-origin' },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Laporan gagal diunduh.');
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bien-vendre-${result.from}-${result.to}.${kind}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Laporan ' + (kind === 'xlsx' ? 'Excel' : 'PDF') + ' berhasil diunduh.');
    } catch (error) {
      notify(error.message, true);
    } finally {
      setDownloading('');
    }
  }
  const busiest = result?.trend
    .filter((day) => Number(day.count) > 0)
    .slice()
    .sort((a, b) => Number(b.count) - Number(a.count) || Number(b.total) - Number(a.total))[0];
  const cards = [
    ['Total penjualan', money(result?.total || 0), ChartNoAxesCombined, 'Dari pesanan selesai'],
    ['Transaksi selesai', result?.count || 0, ShoppingBag, 'Pesanan tercatat sebagai penjualan'],
    [
      'Rata-rata transaksi',
      money(result?.average || 0),
      Sparkles,
      'Nilai rata-rata setiap pesanan',
    ],
    ['Pemesan unik', result?.customers || 0, Users, 'Berdasarkan nomor telepon'],
  ];
  return (
    <>
      <div className="reports-workspace" aria-busy={loading}>
        <div className="reports-command">
          <div className="reports-period-switch" role="group" aria-label="Periode laporan">
            {[
              ['all', 'Semua waktu'],
              ['7', '7 hari terakhir'],
              ['month', 'Bulan ini'],
            ].map(([period, label]) => (
              <button
                key={period}
                aria-pressed={filters.period === period}
                onClick={() => changeFilter('period', period)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="reports-downloads">
            <button
              className="btn report-pdf-button"
              onClick={() => download('pdf')}
              disabled={!result || loading || !!downloading || !!loadError}
            >
              {downloading === 'pdf' ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Download size={16} />
              )}{' '}
              Unduh PDF
            </button>
            <button
              className="btn report-excel-button"
              onClick={() => download('xlsx')}
              disabled={!result || loading || !!downloading || !!loadError}
            >
              {downloading === 'xlsx' ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}{' '}
              Unduh Excel
            </button>
          </div>
        </div>
        <div className="reports-active-period">
          <span>
            <CalendarDays size={14} />
            {result ? `${date(result.from)} - ${date(result.to)}` : 'Memuat periode laporan'}
          </span>
          {result?.filterLabel && (
            <span className="reports-filter-label">{result.filterLabel}</span>
          )}
          {loading && <LoaderCircle size={13} className="spin" />}
        </div>
        {loadError && (
          <div className="form-error" role="alert">
            {loadError}
            <button className="text-btn" onClick={() => setRetry((value) => value + 1)}>
              Coba lagi
            </button>
          </div>
        )}
        <div className="reports-stat-grid">
          {cards.map(([label, value, Icon, hint], index) => (
            <article
              className={'reports-stat-card report-tone-' + index}
              key={label}
              data-report-stat={['total', 'count', 'average', 'customers'][index]}
            >
              <span className="reports-stat-icon">
                <Icon size={19} />
              </span>
              <span>{label}</span>
              <strong>{loading && !result ? '-' : value}</strong>
              <small>{hint}</small>
            </article>
          ))}
        </div>
        <div className="reports-analytics">
          <section className="reports-chart-panel">
            <div className="reports-panel-heading">
              <div>
                <h2>
                  <ChartNoAxesCombined size={17} /> Tren penjualan
                </h2>
                <p>
                  Berdasarkan tanggal penjualan /{' '}
                  {result?.interval === 'month' ? 'ringkasan bulanan' : 'ringkasan harian'}
                </p>
              </div>
              <span className="reports-chart-key">
                <i /> Penjualan selesai
              </span>
            </div>
            {result?.count ? (
              <SalesLineChart
                compact
                monthly={result.interval === 'month'}
                trend={result.trend}
                label="Tren penjualan laporan"
              />
            ) : (
              <div className="reports-chart-empty">
                <Flower2 size={25} />
                <span>{loading ? 'Memuat penjualan' : 'Belum ada penjualan pada filter ini'}</span>
              </div>
            )}
          </section>
          <section className="reports-highlight-panel">
            <h2>
              <Sparkles size={16} /> Highlight periode
            </h2>
            <div className="report-largest-sale">
              <span>Transaksi terbesar</span>
              <strong>{money(result?.highest?.total_sale || 0)}</strong>
              <small>
                {result?.highest
                  ? orderCode(result.highest.order_id) + ' / ' + result.highest.customer_name
                  : 'Belum ada transaksi'}
              </small>
            </div>
            <div className="report-busiest-period">
              <div>
                <span>{result?.interval === 'month' ? 'Bulan teramai' : 'Hari teramai'}</span>
                <strong>
                  {busiest
                    ? new Date(busiest.day + 'T12:00:00+07:00').toLocaleDateString(
                        'id-ID',
                        result?.interval === 'month'
                          ? { month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }
                          : { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' },
                      )
                    : '-'}
                </strong>
              </div>
              <span>{busiest?.count || 0} transaksi</span>
            </div>
          </section>
        </div>
        <div className="reports-management-layout">
          <section className="reports-table-panel">
            <div className="reports-table-toolbar">
              <h2>
                Riwayat penjualan <span>{result?.count || 0}</span>
              </h2>
              <label className="search-box reports-table-search">
                <Search size={16} />
                <input
                  value={filters.q}
                  maxLength={120}
                  onChange={(event) => changeFilter('q', event.target.value)}
                  placeholder="Nama, kode pesanan atau produk"
                  aria-label="Cari riwayat penjualan"
                />
              </label>
            </div>
            <div className={'reports-table-scroll ' + (loading ? 'reports-table-loading' : '')}>
              <table className="sales-history-table" aria-label="Riwayat penjualan">
                <thead>
                  <tr>
                    <th>Pesanan</th>
                    <th>Atas nama</th>
                    <th>Tanggal penjualan</th>
                    <th>Penjualan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.rows.map((row, index) => (
                    <tr key={row.id} data-sale-id={row.id}>
                      <td>
                        <span className="report-row-number">
                          {String((result.page - 1) * 7 + index + 1).padStart(2, '0')}
                        </span>
                        <button
                          className="report-sale-code"
                          aria-label={'Detail penjualan ' + orderCode(row.order_id)}
                          onClick={() => setDetail(row)}
                        >
                          {orderCode(row.order_id)} <ArrowUpRight size={12} />
                        </button>
                        <small>{row.items.length} produk pesanan</small>
                      </td>
                      <td>
                        <strong className="report-customer-name" title={row.customer_name}>
                          {row.customer_name}
                        </strong>
                        <div className="report-customer-phone">
                          <span>{row.phone_number}</span>
                          {whatsappUrl(row.phone_number) && (
                            <a
                              className="order-chat-button"
                              href={whatsappUrl(row.phone_number)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={'Chat WhatsApp ' + orderCode(row.order_id)}
                            >
                              <MessageCircle size={10} /> Chat WA
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="report-sale-date">{date(row.sale_date)}</span>
                      </td>
                      <td>
                        <strong className="report-sale-amount">{money(row.total_sale)}</strong>
                        <small className="report-completed-tag">
                          <Check size={10} /> Selesai
                        </small>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          aria-label={'Lihat transaksi ' + orderCode(row.order_id)}
                          onClick={() => setDetail(row)}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!result?.rows.length && !loading && (
                <Empty text="Tidak ada penjualan yang sesuai dengan filter." />
              )}
              {!result && loading && (
                <div className="reports-first-loading">
                  <LoaderCircle className="spin" size={22} /> Memuat riwayat penjualan
                </div>
              )}
            </div>
            <OrderPagination
              page={result?.page || 1}
              pages={result?.pages || 1}
              total={result?.count || 0}
              onChange={setPage}
              label="transaksi"
            />
          </section>
          <aside className="reports-filter-panel" aria-label="Filter laporan">
            <div className="reports-filter-heading">
              <h2>
                <Settings size={16} /> Filter laporan
              </h2>
              <button className="text-btn" onClick={resetFilters}>
                Reset
              </button>
            </div>
            <label>
              Occasion
              <select
                aria-label="Filter occasion laporan"
                value={filters.category}
                onChange={(event) => changeFilter('category', event.target.value)}
              >
                <option value="">Semua occasion</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value="none">Tanpa occasion</option>
              </select>
            </label>
            <label>
              Jenis produk
              <select
                aria-label="Filter jenis laporan"
                value={filters.type}
                onChange={(event) => changeFilter('type', event.target.value)}
              >
                <option value="">Semua jenis</option>
                {data.productTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
                <option value="none">Belum ditentukan</option>
              </select>
            </label>
            <label>
              Urutan
              <select
                aria-label="Urutan laporan"
                value={filters.sort}
                onChange={(event) => changeFilter('sort', event.target.value)}
              >
                <option value="recent">Transaksi terbaru</option>
                <option value="highest">Penjualan terbesar</option>
                <option value="lowest">Penjualan terkecil</option>
              </select>
            </label>
            <form className="reports-custom-period" onSubmit={customPeriod}>
              <h3>
                <CalendarDays size={14} /> Periode khusus
              </h3>
              <label>
                Dari tanggal
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  required
                />
              </label>
              <label>
                Sampai tanggal
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(event) => setTo(event.target.value)}
                  required
                />
              </label>
              <button className="btn primary" disabled={loading}>
                <Search size={14} /> Tampilkan
              </button>
            </form>
          </aside>
        </div>
      </div>
      {detail && (
        <Modal
          wide
          title={'Transaksi ' + orderCode(detail.order_id)}
          onClose={() => setDetail(null)}
        >
          <div className="order-detail-head">
            <div>
              <h3>{detail.customer_name}</h3>
              <p>{detail.phone_number}</p>
            </div>
            <Badge status="completed" />
          </div>
          <p className="report-detail-date">
            <CalendarDays size={15} /> Tanggal penjualan: {date(detail.sale_date)}
          </p>
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
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="report-detail-product">
                        <Photo src={item.photo} alt="" />
                        <strong>{item.product_name}</strong>
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{money(item.price)}</td>
                    <td>{money(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="order-total report-detail-total">
            <span>Total transaksi</span>
            <strong>{money(detail.total_sale)}</strong>
          </div>
        </Modal>
      )}
    </>
  );
}
function StoreSettings({ user, notify }) {
  const [store, setStore] = useState(null),
    [tab, setTab] = useState(user.role === 'owner' ? 'store' : 'security'),
    [loadError, setLoadError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    api('/store')
      .then((value) => {
        setStore(value);
        setLoadError('');
      })
      .catch((e) => setLoadError(e.message));
  }, [retry]);
  return (
    <div className="owner-settings-workspace">
      <div className="owner-command-bar">
        <div>
          <Settings size={23} />
          <div>
            <h1>Pengaturan</h1>
            <p>Kelola profil toko dan akses akun Anda.</p>
          </div>
        </div>
        <a href="/about" target="_blank" rel="noreferrer" className="btn outline">
          <ExternalLink size={15} />
          Lihat halaman toko
        </a>
      </div>
      <div className="owner-main-tabs" role="tablist" aria-label="Pengaturan">
        {user.role === 'owner' && (
          <button role="tab" aria-selected={tab === 'store'} onClick={() => setTab('store')}>
            <Flower2 size={18} />
            Pengaturan toko
          </button>
        )}
        <button role="tab" aria-selected={tab === 'security'} onClick={() => setTab('security')}>
          <ShieldCheck size={18} />
          Keamanan akun
        </button>
      </div>
      {tab === 'store' &&
        user.role === 'owner' &&
        (loadError ? (
          <div className="owner-surface empty" role="alert">
            {loadError}
            <button className="btn outline" onClick={() => setRetry((v) => v + 1)}>
              Coba lagi
            </button>
          </div>
        ) : store ? (
          <StoreEditor store={store} onSaved={setStore} notify={notify} />
        ) : (
          <div className="empty">
            <LoaderCircle className="spin" />
            Memuat profil toko...
          </div>
        ))}
      {tab === 'security' && (
        <div className="owner-security-layout">
          <AccountSecurity notify={notify} />
          <aside className="owner-surface owner-account-card">
            <ShieldCheck size={30} />
            <h2>Akun Anda</h2>
            <strong>{user.name}</strong>
            <dl>
              <dt>Username</dt>
              <dd>{user.username}</dd>
              <dt>Peran</dt>
              <dd>{user.role === 'owner' ? 'Owner' : 'Admin'}</dd>
            </dl>
            <p>Kelola email pemulihan dan password melalui formulir keamanan akun.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);

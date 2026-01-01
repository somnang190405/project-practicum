
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listenProducts } from '../services/firestoreService';
import { Product } from '../types';
import ProductCard from '../components/customer/ProductCard';
import { useCart } from '../components/customer/CartContext';
import './LandingPage.css';


type Props = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
};

const CustomerHome: React.FC<Props> = ({ wishlist, toggleWishlist }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'WOMEN' | 'MEN' | 'SHOES' | 'BAGS' | 'ACCESSORY' | 'ALL'>('ALL');
  const navigate = useNavigate();
  const location = useLocation();
  const [banner, setBanner] = useState<string | null>(null);
  const { addToCart } = useCart();
  // Hero carousel shows New Arrival products
  const arrivals = useMemo(() => products.filter(p => !!p.isNewArrival), [products]);
  const heroSlides = useMemo(() => {
    if (arrivals.length) {
      return arrivals.map(p => ({ id: p.id, img: p.image, title: p.name, cta: 'Shop Now' }));
    }
    // Fallback slides if no new arrivals yet
    return [
      { id: 'fallback-1', img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80', title: 'Redefine Your Style.', cta: 'Shop Now' },
      { id: 'fallback-2', img: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1500&q=80', title: 'Jackets for the Modern Man', cta: 'Discover Now' },
    ];
  }, [arrivals]);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => { setHeroIndex(0); }, [heroSlides.length]);
  const touchX = useRef<number | null>(null);
  useEffect(() => {
    // Auto-scroll through available slides; if only two slides, it cycles those; if more, cycles all
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [heroSlides.length]);
  const prevHero = () => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const nextHero = () => setHeroIndex((i) => (i + 1) % heroSlides.length);

  useEffect(() => {
    setLoading(true);
    const unsub = listenProducts((data) => {
      // Keep sold-out items so the UI can show a Sold Out badge.
      setProducts(data);
      setLoading(false);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const tabs: Array<typeof activeTab> = ['ALL', 'MEN', 'WOMEN', 'SHOES', 'BAGS', 'ACCESSORY'];

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const canon = (s: string) => {
      let k = s.trim().toLowerCase();
      if (k === 'bag') k = 'bags';
      if (k === 'accessories') k = 'accessory';
      if (k === 'shoe') k = 'shoes';
      return k;
    };
    const byTab = (p: Product) => {
      if (activeTab === 'ALL') return true;
      const catRaw = String((p.category ?? '')).trim().toLowerCase();
      if (!catRaw) return false;
      const cat = canon(catRaw);
      const key = canon(activeTab);
      // Strict match: only show products whose category equals the selected tab
      return cat === key;
    };
    const bySearch = (p: Product) => {
      if (!q) return true;
      return (
        String(p.name ?? '').toLowerCase().includes(q) ||
        String(p.category ?? '').toLowerCase().includes(q)
      );
    };
    return products.filter((p) => byTab(p) && bySearch(p));
  }, [products, activeTab, search]);

  // Show success banner if navigated with added product name
  useEffect(() => {
    const state = location.state as any;
    if (state && state.addedProductName) {
      setBanner('Product added successfully');
      // Clear the navigation state so it doesn't persist on refresh/back
      navigate('.', { replace: true, state: {} });
      const t = setTimeout(() => setBanner(null), 3000);
      return () => clearTimeout(t);
    }
  }, [location.state, navigate]);

  // ProductCard handles navigation to detail on click

  return (
    <div>
      {banner && (
        <div style={{ position: 'fixed', top: 16, right: 16, background: '#111827', color: '#fff', padding: '10px 12px', borderRadius: 10, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          {banner}
        </div>
      )}
      {/* Hero Section (auto-scroll + swipe) */}
      <section
        className="hero-section"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) {
            if (dx > 0) prevHero(); else nextHero();
          }
          touchX.current = null;
        }}
      >
        <img className="hero-bg-img" src={heroSlides[heroIndex].img} alt="hero" 
          onError={(e)=>{
            const img = e.currentTarget as HTMLImageElement;
            const orig = heroSlides[heroIndex].img;
            if (!img.dataset.fallback) { img.dataset.fallback='proxy'; img.src = `https://images.weserv.nl/?url=${encodeURIComponent(orig)}`; }
          }}
        />
        <div className="hero-content">
          <h1 className="hero-title">{heroSlides[heroIndex].title}</h1>
          <button className="hero-btn" onClick={() => {
            const slide = heroSlides[heroIndex];
            if (slide.id && slide.id.startsWith('fallback')) navigate('/shop');
            else navigate(`/product/${slide.id}`);
          }}>{heroSlides[heroIndex].cta}</button>
        </div>
        <button aria-label="Prev" className="hero-arrow left" onClick={prevHero}>‹</button>
        <button aria-label="Next" className="hero-arrow right" onClick={nextHero}>›</button>
        <div className="hero-dots">
          {heroSlides.map((_, i) => (
            <span key={i} className={i === heroIndex ? 'dot active' : 'dot'} onClick={() => setHeroIndex(i)} />
          ))}
        </div>
      </section>
      {/* Product browsing section (tabs + search + grid like the screenshot) */}
      <section>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center justify-center gap-8 flex-wrap text-sm font-medium tracking-wide mb-8">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={
                  t === activeTab
                    ? "px-4 py-2 rounded-full bg-black text-white"
                    : "px-4 py-2 rounded-full text-gray-500 hover:text-gray-900"
                }
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center mb-10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/search?q=${encodeURIComponent(search)}`);
              }}
              className="w-full max-w-xl"
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for products..."
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-black"
                aria-label="Search for products"
              />
            </form>
          </div>

          {loading ? (
            <div className="text-center text-gray-500" style={{ padding: 24, width: '100%' }}>Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-500" style={{ padding: 24, width: '100%' }}>No products available yet.</div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-x-8 gap-y-12">
                {filteredProducts.map((p) => (
                  <div key={p.id}>
                    <ProductCard
                      product={p}
                      onAdd={(prod) => addToCart(prod)}
                      isWishlisted={wishlist.includes(p.id)}
                      onToggleWishlist={toggleWishlist}
                      variant="newArrivals"
                    />
                  </div>
                ))}
              </div>
              {!loading && filteredProducts.length === 0 && (
                <div className="text-center text-gray-500" style={{ padding: 24, width: '100%' }}>No products found.</div>
              )}
            </>
          )}
        </div>
      </section>
      {/* Promo Section removed per request */}
    </div>
  );
};

export default CustomerHome;

const NewArrivalsCarousel: React.FC<{
  products: Product[];
  search: string;
  onAdd: (p: Product) => void;
  onView: (id: string) => void;
  wishlist?: string[];
  toggleWishlist?: (id: string) => void;
}> = ({ products, search, onAdd, onView, wishlist = [], toggleWishlist }) => {
  const [loading, setLoading] = useState(false); // uses outer state already, keep simple
  const [activeTab, setActiveTab] = useState<string>('WOMEN');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: any) => setActiveTab(e?.detail?.active || 'WOMEN');
    window.addEventListener('home-tab-change', handler as any);
    return () => window.removeEventListener('home-tab-change', handler as any);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const id = setInterval(() => {
      const step = 320;
      if (el.scrollLeft + el.clientWidth + step >= el.scrollWidth) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const mapTabToCategory = (t: string) => t === 'ALL' ? '' : (t || '').toString().toLowerCase();

  const arrivals = products.filter(p => !!p.isNewArrival);
  const cat = mapTabToCategory(activeTab);
  const filtered = arrivals.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.category || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !cat || (p.category || '').toLowerCase() === cat;
    return matchSearch && (activeTab === 'ALL' ? true : matchCat);
  });

  if (loading) return <div className="col-span-full text-center text-gray-500">Loading products...</div>;
  if (products.length === 0) return <div className="col-span-full text-center text-gray-500">No products available yet.</div>;
  if (filtered.length === 0) return <div className="col-span-full text-center text-gray-500">No new arrivals found.</div>;

  return (
    <div className="arrivals-carousel-wrapper">
      <button aria-label="Prev" className="carousel-arrow left" onClick={() => scrollerRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}>‹</button>
      <div
        className="arrivals-carousel"
        ref={scrollerRef}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 36) {
            scrollerRef.current?.scrollBy({ left: dx > 0 ? -360 : 360, behavior: 'smooth' });
          }
          touchX.current = null;
        }}
      >
        {filtered.map((p) => (
          <div key={p.id} className="carousel-item">
            <ProductCard
              product={p}
              onAdd={() => onAdd(p)}
              isWishlisted={wishlist.includes(p.id)}
              onToggleWishlist={toggleWishlist}
            />
          </div>
        ))}
      </div>
      <button aria-label="Next" className="carousel-arrow right" onClick={() => scrollerRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}>›</button>
    </div>
  );
};
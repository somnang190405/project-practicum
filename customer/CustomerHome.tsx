
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listenProducts } from '../services/firestoreService';
import { Product } from '../types';
import ProductCard from '../components/customer/ProductCard';
import { useCart } from '../components/customer/CartContext';
import './LandingPage.css';
import { listenCategories } from '../services/firestoreService';


const CustomerHome: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);
  const prevHero = () => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  const nextHero = () => setHeroIndex((i) => (i + 1) % heroSlides.length);

  useEffect(() => {
    setLoading(true);
    const unsub = listenProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => { if (unsub) unsub(); };
  }, []);

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

  const handleViewProduct = (id: string) => {
    navigate(`/product/${id}`);
  };

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
      {/* Arrivals Section - Category tabs + full catalog under search */}
      <section className="arrivals-section">
        {/* Section header like mock with View All */}
        <div style={{ maxWidth: 1200, margin: '0 auto 12px auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              <h2 className="arrivals-title" style={{ textAlign: 'left', marginBottom: 6 }}>New Arrivals</h2>
              <p style={{ color: '#586271', maxWidth: 640 }}>Discover the latest trends picked exclusively for the season. Quality materials, modern cuts.</p>
            </div>
            <button className="hero-btn" onClick={() => navigate('/shop')} style={{ padding: '10px 18px' }}>View All →</button>
          </div>
        </div>
        {/** Tabs filter **/}
        <Tabs />
        {/* Search Bar */}
        <div style={{ margin: '24px 0', textAlign: 'center' }}>
          <input
            type="text"
            placeholder="Search for products..."
            value={search}
            autoFocus
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                // Optionally, you could trigger a search or blur
                (e.target as HTMLInputElement).blur();
              }
            }}
            style={{ padding: 8, width: 300, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </div>
        {/* Removed separate New Arrivals carousel to show them in the hero instead */}

        {/* Full catalog under search: show all products (includes new arrivals) */}
        <div className="catalog-grid">
          {loading ? (
            <div className="col-span-full text-center text-gray-500">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="col-span-full text-center text-gray-500">No products available yet.</div>
          ) : (
            (() => {
              const filteredAll = products.filter(product =>
                (product.name || '').toLowerCase().includes(search.toLowerCase()) ||
                (product.category || '').toLowerCase().includes(search.toLowerCase())
              );
              if (filteredAll.length === 0) {
                return <div className="col-span-full text-center text-gray-500">No products found.</div>;
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mt-8">
                  {filteredAll.map((p) => (
                    <div key={p.id}>
                      <ProductCard
                        product={p}
                        onAdd={(prod)=> addToCart({ id: prod.id, name: prod.name, price: prod.price, image: prod.image, category: prod.category })}
                        isWishlisted={false}
                        onToggleWishlist={() => {}}
                      />
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </section>
      {/* Promo Section removed per request */}
    </div>
  );
};

export default CustomerHome;

// ----------------- Local components -----------------
type TabLabel = 'ALL' | 'WOMEN' | 'MEN' | 'SHOES' | 'BAGS' | 'ACCESSORIES' | string;

const Tabs: React.FC = () => {
  const [active, setActive] = useState<TabLabel>('WOMEN');
  const [cats, setCats] = useState<string[]>(['Women','Men','Shoes','Bags','Accessory']);
  useEffect(() => {
    const unsub = listenCategories((list) => {
      const names = list.map(c => (c.name || '').toString()).filter(Boolean);
      if (names.length) setCats(names);
    });
    return () => { unsub && unsub(); };
  }, []);
  const uniqueCats = useMemo(() => {
    const normalize = (s:string) => s.trim().toLowerCase();
    const preferred = ['Women','Men','Shoes','Bags','Accessory'];
    const merged = [...preferred, ...cats];
    const map = new Map<string,string>();
    for (const c of merged) {
      const key = normalize(c);
      if (!key) continue;
      if (!map.has(key)) map.set(key, c.charAt(0).toUpperCase() + c.slice(1).toLowerCase());
    }
    // Output in preferred order first, then alphabetic of the rest
    const out: string[] = [];
    for (const p of preferred) {
      const key = normalize(p);
      if (map.has(key)) out.push(map.get(key)!);
    }
    const rest = Array.from(map.values()).filter(v => !out.includes(v)).sort((a,b)=>a.localeCompare(b));
    return [...out, ...rest];
  }, [cats]);
  useEffect(() => {
    const ev = new CustomEvent('home-tab-change', { detail: { active } });
    window.dispatchEvent(ev);
  }, [active]);
  return (
    <div className="arrivals-tabs">
      {uniqueCats.map((c) => {
        const label = c.toUpperCase();
        return (
          <button
            key={label}
            className={`arrivals-tab ${active === label ? 'active' : ''}`}
            onClick={() => setActive(label)}
          >
            {label}
          </button>
        );
      })}
      <button className={`arrivals-tab ${active === 'ALL' ? 'active' : ''}`} onClick={()=>setActive('ALL')}>ALL</button>
    </div>
  );
};

const NewArrivalsCarousel: React.FC<{
  products: Product[];
  search: string;
  onAdd: (p: Product) => void;
  onView: (id: string) => void;
}> = ({ products, search, onAdd, onView }) => {
  const [loading, setLoading] = useState(false); // uses outer state already, keep simple
  const [activeTab, setActiveTab] = useState<TabLabel>('WOMEN');
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

  const mapTabToCategory = (t: TabLabel) => t === 'ALL' ? '' : (t || '').toString().toLowerCase();

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
              isWishlisted={false}
              onToggleWishlist={() => {}}
            />
          </div>
        ))}
      </div>
      <button aria-label="Next" className="carousel-arrow right" onClick={() => scrollerRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}>›</button>
    </div>
  );
};
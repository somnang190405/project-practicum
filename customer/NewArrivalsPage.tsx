import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listenProducts } from '../services/firestoreService';
import { Product } from '../types';
import ProductCard from '../components/customer/ProductCard';
import './LandingPage.css';
import { useCart } from '../components/customer/CartContext';

const NewArrivalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const touchX = useRef<number | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const unsub = listenProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => { unsub && unsub(); };
  }, []);

  const arrivals = useMemo(() => products.filter(p => !!p.isNewArrival), [products]);

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
  }, [scrollerRef]);

  return (
    <div>
      {/* Full-screen hero like the mock */}
      <section className="hero-section">
        <img
          className="hero-bg-img"
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80"
          alt="Season Hero"
        />
        <div className="hero-content">
          <h1 className="hero-title">Redefine Your Style.</h1>
          <button className="hero-btn" onClick={() => navigate('/shop')}>Shop Now</button>
        </div>
      </section>

      {/* Page header */}
      <div style={{ maxWidth: 1200, margin: '24px auto 12px auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 className="arrivals-title" style={{ textAlign: 'left', marginBottom: 6 }}>New Arrivals</h2>
            <p style={{ color: '#586271', maxWidth: 640 }}>Discover the latest trends picked exclusively for the season. Quality materials, modern cuts.</p>
          </div>
          <button className="hero-btn" onClick={() => navigate('/shop')} style={{ padding: '10px 18px' }}>View All →</button>
        </div>
      </div>

      {/* Carousel of new arrivals */}
      <div className="arrivals-carousel-wrapper" style={{ marginTop: 12 }}>
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
          {arrivals.map((p) => (
            <div key={p.id} className="carousel-item">
              <ProductCard 
                product={p}
                onAdd={(prod) => addToCart({ id: prod.id, name: prod.name, price: prod.price, image: prod.image, category: prod.category })}
                isWishlisted={false}
                onToggleWishlist={()=>{}}
              />
            </div>
          ))}
          {(!loading && arrivals.length === 0) && (
            <div className="col-span-full text-center text-gray-500" style={{ padding: 24, width: '100%' }}>No new arrivals found.</div>
          )}
        </div>
        <button aria-label="Next" className="carousel-arrow right" onClick={() => scrollerRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}>›</button>
      </div>

      {/* Grid of new arrivals only */}
      <div style={{ maxWidth: 1200, margin: '24px auto' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {arrivals
            .filter(p => (p.name||'').toLowerCase().includes(search.toLowerCase()) || (p.category||'').toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
            <div key={p.id}>
              <ProductCard 
                product={p} 
                onAdd={(prod) => addToCart({ id: prod.id, name: prod.name, price: prod.price, image: prod.image, category: prod.category })}
                isWishlisted={false} 
                onToggleWishlist={()=>{}} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewArrivalsPage;
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listenProducts } from '../services/firestoreService';
import { Product } from '../types';
import ProductCard from '../components/customer/ProductCard';
import { useCart } from '../components/customer/CartContext';

type Props = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
};

const NewArrivalsPage: React.FC<Props> = ({ wishlist, toggleWishlist }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'WOMEN' | 'MEN' | 'SHOES' | 'BAGS' | 'ACCESSORY' | 'ALL'>('ALL');
  const { addToCart } = useCart();

  useEffect(() => {
    const unsub = listenProducts((data) => {
      // Keep sold out items so we can render a Sold Out badge like the design.
      setProducts(data);
      setLoading(false);
    });
    return () => { unsub && unsub(); };
  }, []);

  const arrivals = useMemo(() => products.filter(p => !!p.isNewArrival), [products]);

  const tabs: Array<typeof activeTab> = ['WOMEN', 'MEN', 'SHOES', 'BAGS', 'ACCESSORY', 'ALL'];

  const filteredArrivals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byTab = (p: Product) => {
      if (activeTab === 'ALL') return true;
      const cat = String((p.category ?? '')).toLowerCase();
      if (!cat) return false;
      const key = activeTab.toLowerCase();
      if (key === 'accessory') return cat.includes('accessor');
      return cat.includes(key);
    };
    const bySearch = (p: Product) => {
      if (!q) return true;
      return (
        String(p.name ?? '').toLowerCase().includes(q) ||
        String(p.category ?? '').toLowerCase().includes(q)
      );
    };
    return arrivals.filter((p) => byTab(p) && bySearch(p));
  }, [arrivals, activeTab, search]);

  return (
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for products..."
          className="w-full max-w-xl border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-black"
          aria-label="Search new arrivals"
        />
      </div>

      <div className="grid grid-cols-4 gap-x-8 gap-y-12">
        {filteredArrivals.map((p) => (
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

      {!loading && filteredArrivals.length === 0 && (
        <div className="text-center text-gray-500" style={{ padding: 24, width: '100%' }}>
          No new arrivals found.
        </div>
      )}

      <div className="flex justify-center mt-12">
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:opacity-90"
        >
          Shop Now
        </button>
      </div>
    </div>
  );
};

export default NewArrivalsPage;
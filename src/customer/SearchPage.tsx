import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getProducts, searchProductsByNameOnly } from '../services/firestoreService';
import { Product } from '../types';
import ProductCard from '../components/customer/ProductCard';
import { useCart } from '../components/customer/CartContext';
import { Search } from 'lucide-react';

type Props = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
};

const SearchPage: React.FC<Props> = ({ wishlist, toggleWishlist }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const { addToCart } = useCart();
  const location = useLocation();

  // pick initial query from URL (?q=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setQuery(q);
  }, [location.search]);

  // Load from Firebase. If query is empty, show all products; otherwise, do a Firebase-backed name search.
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      const q = query.trim();
      setLoading(true);
      try {
        const data = q ? await searchProductsByNameOnly(q, 60) : await getProducts();
        const inStock = data.filter((p) => (p?.stock ?? 0) > 0);
        if (alive) setProducts(inStock);
      } catch {
        if (alive) setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 180);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query]);

  const categories = useMemo(() => {
    const normalize = (s: string) => s.trim();
    const banned = new Set(['boys', 'girls']);
    const map = new Map<string, string>();
    for (const p of products) {
      const raw = normalize(p.category || '');
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (banned.has(key)) continue;
      if (!map.has(key)) map.set(key, raw);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    if (activeCategory === 'ALL') return products;
    const selected = activeCategory.toLowerCase();
    return products.filter((p) => (p.category || '').toLowerCase() === selected);
  }, [products, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <form
        className="mb-4"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCategory('ALL');
            }}
            placeholder="Search products…"
            className="w-full bg-transparent border-0 border-b border-gray-300 py-3 pr-10 text-base focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black"
          >
            <Search size={20} />
          </button>
        </div>
      </form>

      {categories.length > 0 && (
        <div className="arrivals-tabs mb-6">
          <button
            className={`arrivals-tab ${activeCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ALL')}
            type="button"
          >
            ALL
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`arrivals-tab ${activeCategory === c ? 'active' : ''}`}
              onClick={() => setActiveCategory(c)}
              type="button"
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-8">
        {filtered.map(p => (
          <div key={p.id}>
            <ProductCard
              product={p}
              onAdd={(prod) => addToCart(prod)}
              isWishlisted={wishlist.includes(p.id)}
              onToggleWishlist={toggleWishlist}
            />
          </div>
        ))}
      </div>
      {loading && (
        <div className="text-gray-500">Searching…</div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-gray-500">No results. Try a different search.</div>
      )}
    </div>
  );
};

export default SearchPage;

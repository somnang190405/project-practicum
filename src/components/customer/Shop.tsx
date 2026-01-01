import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from './CartContext';
import { Product } from '../../types';
import ProductCard from './ProductCard';
import { listenProducts } from '../../services/firestoreService';
import { Search as SearchIcon } from 'lucide-react';
import { calcDiscountedUnitPrice, normalizePromotionPercent } from '../../services/pricing';

type Props = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  notify?: (msg: string, type: 'success' | 'error') => void;
};

type CategoryKey = 'ALL' | string;

const canonCategory = (raw: string): string => {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return '';
  // normalize common variations
  if (s === 'bag') return 'bags';
  if (s === 'bags') return 'bags';
  if (s === 'accessories') return 'accessory';
  if (s === 'accessory') return 'accessory';
  if (s === 'shoe') return 'shoes';
  if (s === 'shoes') return 'shoes';
  return s;
};

const Shop = ({ wishlist, toggleWishlist }: Props) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('ALL');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const location = useLocation();

  useEffect(() => {
    const unsub = listenProducts((data) => {
      // Keep sold-out items so the UI can show a Sold Out badge.
      setProducts(data);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // Read category from URL (?category=bags) to preselect filter when navigating from navbar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = canonCategory(params.get('category') || '');
    if (!cat) return;
    setActiveCategory(cat);
  }, [location.search]);

  const categories: Array<{ key: CategoryKey; label: string }> = useMemo(() => {
    const title = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (m) => m.toUpperCase());
    const prefOrder = ['women', 'men', 'shoes', 'bags', 'accessory'];
    const set = new Map<string, string>();
    for (const p of products) {
      const raw = String(p.category || '').trim();
      if (!raw) continue;
      const key = canonCategory(raw);
      if (!key) continue;
      set.set(key, title(key));
    }
    const ordered = Array.from(set.entries())
      .sort((a, b) => {
        const ia = prefOrder.indexOf(a[0]);
        const ib = prefOrder.indexOf(b[0]);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a[1].localeCompare(b[1]);
      })
      .map(([key, label]) => ({ key, label }));
    return [{ key: 'ALL', label: 'All' }, ...ordered];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minPrice.trim() === '' ? null : Number(minPrice);
    const max = maxPrice.trim() === '' ? null : Number(maxPrice);

    const byCategory = (p: Product) => {
      if (activeCategory === 'ALL') return true;
      const cat = canonCategory(String(p.category ?? ''));
      const active = canonCategory(String(activeCategory));
      if (!cat || !active) return false;
      // Strict category matching (MEN shows only MEN, etc.)
      return cat === active;
    };

    const bySearch = (p: Product) => {
      if (!q) return true;
      return (
        String(p.name ?? '').toLowerCase().includes(q) ||
        String(p.category ?? '').toLowerCase().includes(q)
      );
    };

    const byPrice = (p: Product) => {
      if (min === null && max === null) return true;
      if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) return true;
      const promo = normalizePromotionPercent((p as any).promotionPercent);
      const effective = calcDiscountedUnitPrice(p.price, promo);
      if (min !== null && effective < min) return false;
      if (max !== null && effective > max) return false;
      return true;
    };

    return products.filter((p) => byCategory(p) && bySearch(p) && byPrice(p));
  }, [products, activeCategory, search, minPrice, maxPrice]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Shop Collection</h1>
      {/* Top category pills for quick access */}
      {categories.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap mb-8">
          {categories.map((c) => (
            <button
              key={`pill-${c.key}`}
              type="button"
              onClick={() => setActiveCategory(c.key)}
              className={c.key === activeCategory ? 'px-4 py-1.5 rounded-full bg-black text-white text-sm' : 'px-4 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-700'}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[288px_minmax(0,1fr)] gap-10 overflow-x-auto">
        {/* Sidebar */}
        <aside className="w-72 shrink-0">
          <div className="bg-gray-50 rounded-2xl px-5 py-6">
            <div className="mb-6">
              <div className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase mb-3">Search</div>
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-3 pr-10 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gray-300"
                  aria-label="Search products"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                  <SearchIcon size={16} />
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase mb-3">Price Range</div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  inputMode="decimal"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Min"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gray-300"
                  aria-label="Minimum price"
                />
                <input
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  inputMode="decimal"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Max"
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-gray-300"
                  aria-label="Maximum price"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase mb-3">Categories</div>
              <div className="space-y-2">
                {categories.map((c) => {
                  const active = c.key === activeCategory;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setActiveCategory(c.key)}
                      className="w-full flex items-center justify-between text-left py-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0"
                    >
                      <span className={active ? 'text-sm font-semibold text-gray-900' : 'text-sm text-gray-600 hover:text-gray-900'}>
                        {c.label}
                      </span>
                      <span className={active ? 'w-1.5 h-1.5 rounded-full bg-gray-900' : 'w-1.5 h-1.5'} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Products */}
        <main className="min-w-[900px]">
          <div className="grid grid-cols-3 gap-x-10 gap-y-14">
            {filtered.map((p) => (
              <div key={p.id}>
                <ProductCard
                  product={p}
                  onAdd={(prod) => addToCart(prod)}
                  isWishlisted={wishlist.includes(p.id)}
                  onToggleWishlist={toggleWishlist}
                  variant="newArrivals"
                  showWishlistButton={false}
                  showAddToCart={false}
                  textAlign="left"
                  pricePrefix="$"
                  elevated={false}
                />
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-gray-500" style={{ padding: 24, width: '100%' }}>
              No products found.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Shop;

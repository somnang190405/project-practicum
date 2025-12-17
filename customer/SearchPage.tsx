import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listenProducts } from '../services/firestoreService';
import { Product } from '../types';
import ProductCard from '../components/customer/ProductCard';

const SearchPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const location = useLocation();

  useEffect(() => {
    const unsub = listenProducts(setProducts);
    return () => { if (unsub) unsub(); };
  }, []);

  // pick initial query from URL (?q=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setQuery(q);
  }, [location.search]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-6">
        <input
          autoFocus
          value={query}
          onChange={(e)=> setQuery(e.target.value)}
          placeholder="Search products, categories, descriptions…"
          className="w-full bg-white border border-gray-300 rounded-2xl py-3 px-4 text-sm focus:border-black focus:ring-0 outline-none transition-colors"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(p => (
          <div key={p.id}><ProductCard product={p} onAdd={()=>{}} isWishlisted={false} onToggleWishlist={()=>{}} /></div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-gray-500">No results. Try a different search.</div>
      )}
    </div>
  );
};

export default SearchPage;

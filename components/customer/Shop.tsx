import React, { useEffect, useState } from 'react';
import { useCart } from './CartContext';
import { Product } from '../../types';
import ProductCard from './ProductCard';
import { listenProducts } from '../../services/firestoreService';
import { Filter, Search } from 'lucide-react';

type Props = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  notify?: (msg: string, type: 'success' | 'error') => void;
};

const Shop = ({ wishlist, toggleWishlist }: Props) => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const unsub = listenProducts((data) => {
      setProducts(data);
      setFiltered(data);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    let res = products;
    if (category !== 'All') {
      res = res.filter(p => p.category === category);
    }
    if (search) {
      res = res.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (minPrice !== '') {
        res = res.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice !== '') {
        res = res.filter(p => p.price <= Number(maxPrice));
    }
    setFiltered(res);
  }, [category, search, products, minPrice, maxPrice]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-4xl font-serif font-bold">Shop Collection</h1>
          <button onClick={() => setShowFilters(!showFilters)} className="md:hidden flex items-center gap-2 border px-4 py-2 rounded-lg">
              <Filter size={16}/> Filters
          </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-12">
        <aside className={`w-full md:w-64 space-y-8 ${showFilters ? 'block' : 'hidden md:block'}`}>
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="mb-8">
                <h3 className="font-bold mb-4 text-xs uppercase tracking-wider text-gray-500">Search</h3>
                <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-4 text-sm focus:border-black focus:ring-0 outline-none transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                </div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold mb-4 text-xs uppercase tracking-wider text-gray-500">Price Range</h3>
                <div className="flex gap-2 items-center">
                    <input 
                    type="number" 
                    placeholder="Min" 
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm focus:border-black outline-none"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                    type="number" 
                    placeholder="Max" 
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm focus:border-black outline-none"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min="0"
                    />
                </div>
            </div>

            <div>
                <h3 className="font-bold mb-4 text-xs uppercase tracking-wider text-gray-500">Categories</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                {categories.map(c => (
                    <li key={c} 
                    className={`cursor-pointer hover:text-black transition-colors flex items-center justify-between ${category === c ? 'text-black font-bold' : ''}`}
                    onClick={() => setCategory(c)}
                    >
                    {c}
                    {category === c && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                    </li>
                ))}
                </ul>
            </div>
          </div>
        </aside>

        <div className="flex-1">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {filtered.map(p => (
              <div key={p.id}>
                <ProductCard 
                  product={p} 
                  onAdd={addToCart}
                  isWishlisted={wishlist.includes(p.id)}
                  onToggleWishlist={toggleWishlist}
                />
              </div>
            ))}
           </div>
           {filtered.length === 0 && (
             <div className="text-center py-20 text-gray-500">
                 <Search size={48} className="mx-auto mb-4 text-gray-300"/>
                 <p className="text-lg">No products found matching your criteria.</p>
                 <button onClick={() => {setSearch(''); setCategory('All'); setMinPrice(''); setMaxPrice('')}} className="mt-4 text-black underline">Clear Filters</button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Shop;

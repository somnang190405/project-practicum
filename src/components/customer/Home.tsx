import React, { useEffect, useState } from 'react';
import { useCart } from './CartContext';
import { Product } from '../../types';
import ProductCard from './ProductCard';
import { ArrowLeft } from 'lucide-react';
import { listenProducts } from '../../services/firestoreService';

type HomeProps = {
  setView: (view: string) => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
};

const Home = ({ setView, wishlist, toggleWishlist }: HomeProps) => {
  const { addToCart } = useCart();
  const [featured, setFeatured] = useState<Product[]>([]);
  
  useEffect(() => {
    const unsub = listenProducts((products) => setFeatured(products.filter((p) => (p?.stock ?? 0) > 0).slice(0, 4)));
    return () => { if (unsub) unsub(); };
  }, []);

  return (
    <>
      <div className="relative h-[650px] w-full bg-slate-900 text-white overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover opacity-70 scale-105 animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-center items-start">
          <span className="text-sm font-bold uppercase tracking-[0.3em] mb-4 text-blue-200 animate-fade-in-up">Summer Collection 2024</span>
          <h1 className="text-5xl md:text-8xl font-serif font-bold mb-8 max-w-3xl leading-tight animate-fade-in-up delay-100">
            Redefine <br/>Your Style.
          </h1>
          <button 
            onClick={() => setView('shop')} 
            className="bg-white text-black px-10 py-4 font-bold text-sm uppercase tracking-widest hover:bg-gray-200 transition-all transform hover:-translate-y-1 animate-fade-in-up delay-200"
          >
            Shop Now
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
                <h2 className="text-4xl font-serif font-bold mb-4">New Arrivals</h2>
                <p className="text-gray-500 max-w-md">Discover the latest trends picked exclusively for the season. Quality materials, modern cuts.</p>
            </div>
            <button onClick={() => setView('shop')} className="hidden md:flex items-center gap-2 font-medium hover:gap-3 transition-all">View All <ArrowLeft className="rotate-180" size={16}/></button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          {featured.map(p => (
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
        
        <button onClick={() => setView('shop')} className="md:hidden w-full mt-8 border border-black py-4 font-medium uppercase tracking-wide">View All Products</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 h-[500px]">
         <div className="relative bg-gray-100 flex items-center justify-center p-12 group overflow-hidden">
           <div className="z-10 text-center relative transform transition-transform duration-500 group-hover:-translate-y-2">
             <h3 className="text-3xl font-serif font-bold mb-4">Ethereal Elegance</h3>
             <p className="mb-8 text-gray-600">Where Dreams Meet Couture</p>
             <button onClick={() => setView('shop')} className="bg-white px-8 py-3 text-sm font-bold uppercase tracking-wide shadow-lg hover:bg-black hover:text-white transition-colors">Shop Women</button>
           </div>
           <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover opacity-5 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-10" />
         </div>
         <div className="relative bg-slate-100 flex items-center justify-center p-12 group overflow-hidden">
           <div className="z-10 text-center relative transform transition-transform duration-500 group-hover:-translate-y-2">
             <h3 className="text-3xl font-serif font-bold mb-4">Urban Strides</h3>
             <p className="mb-8 text-gray-600">Chic Footwear for City Living</p>
             <button onClick={() => setView('shop')} className="bg-white px-8 py-3 text-sm font-bold uppercase tracking-wide shadow-lg hover:bg-black hover:text-white transition-colors">Shop Shoes</button>
           </div>
           <img src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover opacity-5 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-10" />
         </div>
      </div>
    </>
  );
};

export default Home;

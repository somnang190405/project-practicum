import React, { useEffect, useMemo, useState } from 'react';
import { useCart } from './CartContext';
import { listenProducts } from '../../services/firestoreService';
import { Product } from '../../types';
import ProductCard from './ProductCard';
import { Heart } from 'lucide-react';

type Props = {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  setView: (view: string) => void;
};

const Wishlist = ({ wishlist, toggleWishlist, setView }: Props) => {
  const { addToCart } = useCart();
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    const unsub = listenProducts((all) => setAllProducts(all));
    return () => { if (unsub) unsub(); };
  }, []);

  const products = useMemo(() => allProducts.filter(p => wishlist.includes(p.id)), [allProducts, wishlist]);

  if (wishlist.length === 0) {
     return (
    <>
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Heart size={32} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-serif font-bold mb-2">Your wishlist is empty</h2>
      <p className="text-gray-500 mb-8">Save items you love to track them.</p>
      <button onClick={() => setView('shop')} className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all hover:scale-105">Start Shopping</button>
    </div>
    </>
  );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-serif font-bold mb-10">My Wishlist ({products.length})</h1>
      <div className="grid grid-cols-4 gap-x-8 gap-y-12">
        {products.map(p => (
          <div key={p.id}>
            <ProductCard 
              product={p} 
              onAdd={addToCart} 
              isWishlisted={true}
              onToggleWishlist={toggleWishlist}
              variant="newArrivals"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;

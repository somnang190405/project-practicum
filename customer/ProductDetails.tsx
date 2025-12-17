import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import * as Types from '../types';
import { useCart } from '../components/customer/CartContext';
import { Heart } from 'lucide-react';

type Props = { wishlist?: string[]; toggleWishlist?: (id: string) => void };

const ProductDetails: React.FC<Props> = ({ wishlist, toggleWishlist }) => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Types.Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [wishlisted, setWishlisted] = useState<boolean>(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      if (id) {
        const productDoc = doc(db, 'products', id);
        const productSnapshot = await getDoc(productDoc);
        if (productSnapshot.exists()) {
          setProduct({ id: productSnapshot.id, ...productSnapshot.data() } as Types.Product);
        }
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product && wishlist) {
      setWishlisted(wishlist.includes(product.id));
    }
  }, [product, wishlist]);

  if (!product) return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <p className="text-gray-500">Loading product…</p>
    </div>
  );

  const sizes = ['S','M','L','XL','XXL'];
  const handleAdd = () => {
    addToCart({
      id: product.id,
      name: `${product.name} — ${selectedSize}`,
      price: product.price,
      image: product.image,
      category: product.category
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="w-full bg-gray-100 rounded-xl overflow-hidden">
          <img
            src={product.image}
            data-src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e)=>{
              const img = e.currentTarget as HTMLImageElement;
              const orig = img.getAttribute('data-src') || img.src;
              if (!img.dataset.fallback) { img.dataset.fallback='proxy'; img.src = `https://images.weserv.nl/?url=${encodeURIComponent(orig)}`; }
              else { img.src = 'https://via.placeholder.com/800x1000?text=No+Image'; }
            }}
          />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">{product.name}</h1>
          <div className="text-2xl font-semibold mb-6">${product.price.toFixed(2)}</div>

          {/* Size Selector */}
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">Select Size</div>
            <div className="flex gap-3 flex-wrap">
              {sizes.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`px-5 py-3 rounded-full border ${selectedSize===s ? 'bg-black text-white border-black' : 'bg-white text-gray-900 border-gray-200 hover:border-black'} transition`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={handleAdd}
              className="flex-1 bg-black text-white py-4 rounded-full font-bold uppercase tracking-wide hover:opacity-90 transition"
            >
              Add to Cart
            </button>
            <button
              aria-label="wishlist"
              onClick={() => {
                if (toggleWishlist && product) toggleWishlist(product.id);
                setWishlisted(w => !w);
              }}
              className={`w-12 h-12 rounded-full border flex items-center justify-center ${wishlisted ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-900 border-gray-200 hover:border-black'}`}
            >
              <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="font-semibold mb-2">Description & Fit</div>
            <p className="text-gray-600 text-sm leading-6">{product.description || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
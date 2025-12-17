import React from 'react';
import { Product } from '../../types';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
}

const ProductCard = ({ product, onAdd, isWishlisted, onToggleWishlist }: ProductCardProps) => {
  const navigate = useNavigate();
  return (
  <div
    role="button"
    className="group relative bg-white pb-4 rounded-lg transition-all duration-300 hover:shadow-xl cursor-pointer"
    onClick={() => navigate(`/product/${product.id}`)}
  >
    <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4 rounded-t-lg">
      <img 
        src={product.image || "https://via.placeholder.com/300x400?text=No+Image"} 
        data-src={product.image || "https://via.placeholder.com/300x400?text=No+Image"}
        alt={product.name} 
        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          const orig = img.getAttribute('data-src') || img.src;
          if (!img.dataset.fallback) {
            img.dataset.fallback = 'proxy';
            img.src = `https://images.weserv.nl/?url=${encodeURIComponent(orig)}`;
          } else {
            img.src = "https://via.placeholder.com/300x400?text=No+Image";
          }
        }}
      />
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }} 
          className={`p-2.5 rounded-full shadow-lg transition-colors ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
        >
          <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>
      {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
              <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">Sold Out</span>
          </div>
      )}
      <button 
        onClick={(e) => { e.stopPropagation(); if (product.stock > 0) onAdd(product); }}
        disabled={product.stock === 0}
        className={`absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm text-black py-4 font-bold text-sm uppercase tracking-wide translate-y-full group-hover:translate-y-0 transition-transform duration-300 border-t border-gray-100 hover:bg-black hover:text-white ${product.stock === 0 ? 'hidden' : ''}`}
      >
        Add to Cart
      </button>
    </div>
    <div className="px-3">
      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium">{product.category}</p>
      <h3 className="text-base font-medium text-gray-900 line-clamp-1 mb-1">{product.name}</h3>
      <p className="text-sm font-semibold text-gray-900">${product.price.toFixed(2)}</p>
    </div>
  </div>
);
};

export default ProductCard;

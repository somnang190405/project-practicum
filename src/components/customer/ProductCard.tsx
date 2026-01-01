import React from 'react';
import { Product } from '../../types';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent } from '../../services/pricing';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist?: (id: string) => void;
  variant?: 'default' | 'newArrivals';
  showWishlistButton?: boolean;
  showAddToCart?: boolean;
  textAlign?: 'center' | 'left';
  pricePrefix?: string;
  elevated?: boolean;
}

const ProductCard = ({
  product,
  onAdd,
  isWishlisted,
  onToggleWishlist,
  variant = 'default',
  showWishlistButton = true,
  showAddToCart = true,
  textAlign,
  pricePrefix = 'US $',
  elevated = true,
}: ProductCardProps) => {
  const navigate = useNavigate();
  const [added, setAdded] = React.useState(false);
  const promo = normalizePromotionPercent((product as any).promotionPercent);
  const hasPromo = promo > 0;
  const discountedPrice = calcDiscountedUnitPrice(product.price, promo);
  const colors = Array.isArray((product as any).colors) ? ((product as any).colors as string[]).filter(Boolean) : [];

  const isNewArrivalsVariant = variant === 'newArrivals';
  const isSoldOut = (product.stock ?? 0) <= 0;
  const effectiveTextAlign: 'center' | 'left' = textAlign ?? (isNewArrivalsVariant ? 'center' : 'left');

  const containerClassName = isNewArrivalsVariant
    ? (elevated
        ? "group relative bg-white rounded-xl transition-shadow duration-300 hover:shadow-xl cursor-pointer"
        : "group relative bg-white rounded-xl cursor-pointer")
    : (elevated
        ? "group relative bg-white pb-4 rounded-lg transition-all duration-300 hover:shadow-xl cursor-pointer"
        : "group relative bg-white pb-4 rounded-lg cursor-pointer");

  return (
  <div
    role="button"
    className={containerClassName}
    onClick={() => {
      if (isNewArrivalsVariant && isSoldOut) return;
      navigate(`/product/${product.id}`);
    }}
  >
    <div className={
      isNewArrivalsVariant
        ? "relative aspect-square overflow-hidden bg-gray-100 rounded-xl"
        : "relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4 rounded-t-lg"
    }>
      {hasPromo && (
        <div className="absolute top-3 left-3 z-20 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">
          -{formatPromotionPercentBadge(promo)}%
        </div>
      )}
      <img 
        src={product.image || "https://via.placeholder.com/300x400?text=No+Image"} 
        data-src={product.image || "https://via.placeholder.com/300x400?text=No+Image"}
        alt={product.name} 
        loading="lazy"
        decoding="async"
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
      {showWishlistButton && (
        <div className="absolute top-3 right-3 z-20 opacity-100 transition-opacity duration-300 transform translate-y-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleWishlist) {
                onToggleWishlist(product.id);
              } else {
                // Fallback: emit global event so App can handle wishlist updates
                window.dispatchEvent(new CustomEvent('wishlist:toggle', { detail: { id: product.id } }));
              }
            }}
            className={`p-2.5 rounded-full shadow-lg transition-colors ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>
      )}
      {isSoldOut && (
        <>
          <div className={
            isNewArrivalsVariant
              ? "absolute inset-0 z-10 bg-white/40 pointer-events-none"
              : "absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center pointer-events-none"
          }>
            {!isNewArrivalsVariant && (
              <span className="bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">Sold Out</span>
            )}
          </div>
          {isNewArrivalsVariant && (
            <span className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider pointer-events-none">
              Sold Out
            </span>
          )}
        </>
      )}
      {showAddToCart && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isSoldOut) {
              onAdd(product);
              setAdded(true);
              setTimeout(() => setAdded(false), 1200);
            }
          }}
          disabled={isSoldOut}
          className={
            isSoldOut
              ? "hidden"
              : (
                isNewArrivalsVariant
                  ? "absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm text-black py-4 font-bold text-sm uppercase tracking-wide translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300 border-t border-gray-100 hover:bg-black hover:text-white"
                  : "absolute bottom-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm text-black py-4 font-bold text-sm uppercase tracking-wide translate-y-0 transition-transform duration-300 border-t border-gray-100 hover:bg-black hover:text-white"
              )
          }
        >
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
      )}
    </div>
    <div
      className={
        isNewArrivalsVariant
          ? (effectiveTextAlign === 'center' ? "px-3 py-4 text-center" : "px-0 py-4 text-left")
          : "px-3"
      }
    >
      {product.category && product.category.trim().toLowerCase() !== 'ten11' && (
        <p className={isNewArrivalsVariant ? "text-[11px] text-gray-500 mb-1 uppercase tracking-wider font-medium" : "text-xs text-gray-500 mb-1 uppercase tracking-wider font-medium"}>
          {product.category}
        </p>
      )}
      <h3 className={isNewArrivalsVariant ? "text-sm font-semibold text-gray-900 line-clamp-1 mb-1" : "text-base font-medium text-gray-900 line-clamp-1 mb-1"}>
        {product.name}
      </h3>
      <div
        className={
          isNewArrivalsVariant
            ? (effectiveTextAlign === 'center' ? "flex items-baseline justify-center gap-2" : "flex items-baseline gap-2")
            : "flex items-baseline gap-2"
        }
      >
        <p className={`text-sm font-semibold ${hasPromo ? 'text-red-600' : 'text-gray-900'}`}>{pricePrefix}{discountedPrice.toFixed(2)}</p>
        {hasPromo && (
          <p className="text-sm text-gray-500 line-through">{pricePrefix}{product.price.toFixed(2)}</p>
        )}
      </div>
      {!isNewArrivalsVariant && colors.length > 0 && (
        <div className="flex gap-2 mt-2">
          {colors.slice(0, 5).map((c, idx) => (
            <span
              key={`${c}-${idx}`}
              className="w-4 h-4 rounded-sm border border-gray-300"
              style={{ backgroundColor: c }}
              aria-label={`color-${c}`}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  </div>
);
};

export default ProductCard;

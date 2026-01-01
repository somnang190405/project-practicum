import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import * as Types from '../types';
import { useCart } from '../components/customer/CartContext';
import { CheckCircle2, ChevronDown, Heart } from 'lucide-react';
import { calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent } from '../services/pricing';

type Props = { wishlist?: string[]; toggleWishlist?: (id: string) => void };

const ProductDetails: React.FC<Props> = ({ wishlist, toggleWishlist }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Types.Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('S');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [wishlisted, setWishlisted] = useState<boolean>(false);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(true);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!id) return;
    const productDoc = doc(db, 'products', id);
    const unsub = onSnapshot(
      productDoc,
      (snap) => {
        if (!snap.exists()) {
          setProduct(null);
          navigate('/shop', { replace: true });
          return;
        }
        const p = { id: snap.id, ...(snap.data() as any) } as Types.Product;
        // If stock becomes 0, remove from product page to match list behavior.
        if ((p?.stock ?? 0) <= 0) {
          setProduct(p);
          navigate('/shop', { replace: true });
          return;
        }
        setProduct(p);
      },
      () => {
        setProduct(null);
        navigate('/shop', { replace: true });
      }
    );
    return () => {
      try { unsub(); } catch {}
    };
  }, [id, navigate]);

  useEffect(() => {
    if (product && wishlist) {
      setWishlisted(wishlist.includes(product.id));
    }
  }, [product, wishlist]);

  useEffect(() => {
    if (product?.colors?.length) {
      setSelectedColor((prev) => prev || product.colors![0]);
    }
  }, [product?.id]);

  if (!product) return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <p className="text-gray-500">Loading product…</p>
    </div>
  );

  const sizes = ['S','M','L','XL','XXL'];
  const rawPrice = Number((product as any).price);
  const hasValidPrice = Number.isFinite(rawPrice);
  const basePrice = hasValidPrice ? rawPrice : 0;
  const rawStock = Number((product as any).stock);
  const stock = Number.isFinite(rawStock) ? rawStock : 0;
  const promo = normalizePromotionPercent((product as any).promotionPercent);
  const hasPromo = hasValidPrice && promo > 0;
  const discountedPrice = calcDiscountedUnitPrice(basePrice, promo);
  const imageSrc = (product as any).image || 'https://via.placeholder.com/800x1000?text=No+Image';

  const handleAdd = () => {
    if (!product || stock <= 0) return;
    addToCart({
      ...product,
      name: `${product.name} — ${selectedSize}${selectedColor ? ` — ${selectedColor}` : ''}`
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-[minmax(420px,1fr)_minmax(380px,520px)] gap-10 overflow-x-auto">
        {/* Left: Image */}
        <div className="w-full bg-gray-100 rounded-2xl overflow-hidden relative">
          {hasPromo && (
            <div className="absolute top-4 left-4 z-20 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-md">
              -{formatPromotionPercentBadge(promo)}%
            </div>
          )}
          <div className="aspect-[4/5] w-full">
            <img
              src={imageSrc}
              data-src={imageSrc}
              alt={product.name}
              decoding="async"
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                const orig = img.getAttribute('data-src') || img.src;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = 'proxy';
                  img.src = `https://images.weserv.nl/?url=${encodeURIComponent(orig)}`;
                } else {
                  img.src = 'https://via.placeholder.com/800x1000?text=No+Image';
                }
              }}
            />
          </div>
        </div>

        {/* Right: Details */}
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">{product.name}</h1>
          <div className="mt-2 mb-4">
            {hasValidPrice ? (
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-semibold text-gray-900">${(hasPromo ? discountedPrice : basePrice).toFixed(2)}</span>
                {hasPromo && (
                  <>
                    <span className="text-base text-gray-500 line-through font-normal">${basePrice.toFixed(2)}</span>
                    <span className="text-xs bg-red-600 text-white font-bold px-2 py-1 rounded-md">-{formatPromotionPercentBadge(promo)}%</span>
                  </>
                )}
              </div>
            ) : (
              <div className="text-2xl font-semibold text-gray-900">$—</div>
            )}
          </div>

          {/* Delivery info bar */}
          <div className="mb-6">
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <CheckCircle2 size={18} className="text-green-600" />
              <span>Orders over $50 get next‑day delivery.</span>
            </div>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-3">Select Size</div>
            <div className="flex gap-3 flex-wrap">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={
                    selectedSize === s
                      ? 'px-8 py-4 rounded-full bg-black text-white text-sm font-semibold border border-black'
                      : 'px-8 py-4 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold border border-transparent hover:bg-gray-200'
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector (only if product has colors) */}
          {Array.isArray(product.colors) && product.colors.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-700 mb-3">Select Color</div>
              <div className="flex gap-3 flex-wrap">
                {product.colors.map((c, idx) => (
                  <button
                    key={`${c}-${idx}`}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    aria-label={`color-${c}`}
                    title={c}
                    className={
                      selectedColor === c
                        ? 'w-11 h-11 rounded-full border border-black ring-2 ring-black/10'
                        : 'w-11 h-11 rounded-full border border-gray-200 hover:border-gray-400'
                    }
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleAdd}
              disabled={stock <= 0}
              className={
                stock <= 0
                  ? 'flex-1 bg-black text-white py-4 rounded-full font-semibold opacity-50 cursor-not-allowed'
                  : 'flex-1 bg-black text-white py-4 rounded-full font-semibold hover:opacity-90 transition'
              }
            >
              Add to Cart
            </button>
            <button
              aria-label="wishlist"
              type="button"
              onClick={() => {
                if (toggleWishlist && product) toggleWishlist(product.id);
                setWishlisted((w) => !w);
              }}
              className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-gray-300"
            >
              <Heart size={18} className={wishlisted ? 'text-gray-900' : 'text-gray-600'} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Description & Fit (accordion) */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <span className="text-base font-semibold text-gray-900">Description &amp; Fit</span>
              <ChevronDown size={18} className={detailsOpen ? 'text-gray-600 rotate-180 transition-transform' : 'text-gray-600 transition-transform'} />
            </button>
            {detailsOpen && (
              <div className="px-5 pb-5">
                <p className="text-gray-600 text-sm leading-6">{product.description || '—'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
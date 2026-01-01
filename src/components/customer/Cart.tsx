import React from 'react';
import { CartItem, User } from '../../types';
import { ShoppingBag, CheckCircle, Trash2, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calcCartTotals, calcDiscountedUnitPrice, formatPromotionPercentBadge, normalizePromotionPercent } from '../../services/pricing';

type Props = {
  cart: CartItem[];
  updateCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  user: User | null;
  setView: (view: string) => void;
  notify?: (msg: string, type: 'success' | 'error') => void;
};

const Cart = ({ cart, updateCartQty, removeFromCart, user, setView, notify }: Props) => {
  const navigate = useNavigate();
  const { originalSubtotal, discountedSubtotal, discountTotal } = calcCartTotals(cart);

  const handleCheckout = async () => {
    if (!user) {
      if(notify) notify("Please login to checkout", "error");
      return; 
    }

    // Show payment screen (QR + summary). The payment screen finalizes the order in Firestore.
    navigate('/payment');
  };

  if (cart.length === 0) return (
    <>
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
         <ShoppingBag size={32} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-serif font-bold mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
      <button onClick={() => setView('shop')} className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all hover:scale-105">Start Shopping</button>
    </div>
    </>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-serif font-bold mb-10">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-8">
          {cart.map(item => (
            <div key={item.id} className="py-8 border-b border-gray-100 last:border-0">
              <div className="flex items-start justify-between gap-8">
                <div className="flex items-start gap-6 min-w-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.category}</p>

                    <div className="mt-4 inline-flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <button
                        onClick={() => updateCartQty(item.id, item.quantity - 1)}
                        className="px-3 py-2 hover:bg-gray-50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-4 text-sm font-medium w-10 text-center select-none">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, item.quantity + 1)}
                        className="px-3 py-2 hover:bg-gray-50 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {(() => {
                    const promo = normalizePromotionPercent((item as any).promotionPercent);
                    const hasPromo = promo > 0;
                    const unit = calcDiscountedUnitPrice(item.price, promo);
                    const line = unit * item.quantity;
                    const originalLine = item.price * item.quantity;
                    return (
                      <>
                        <p className="font-semibold text-lg text-gray-900">${line.toFixed(2)}</p>
                        {hasPromo && (
                          <div className="mt-1 flex items-center justify-end gap-2">
                            <span className="text-xs bg-red-600 text-white font-bold px-2 py-0.5 rounded-md">-{formatPromotionPercentBadge(promo)}%</span>
                            <span className="text-xs text-gray-500 line-through">${originalLine.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="mt-6 inline-flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="lg:col-span-4">
            <div className="bg-gray-50 p-8 rounded-2xl sticky top-24">
                <h3 className="text-xl font-bold mb-6 font-serif">Order Summary</h3>
                <div className="space-y-4 text-sm mb-6 border-b border-gray-200 pb-6">
                    <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${originalSubtotal.toFixed(2)}</span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Promotion</span>
                        <span className="font-medium text-red-600">-${discountTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600 font-medium">Free</span>
                    </div>
                </div>
                <div className="flex justify-between font-bold text-xl mb-8">
                    <span>Total</span>
                    <span>${discountedSubtotal.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-black text-white py-4 rounded-xl font-bold tracking-wide hover:bg-gray-800 transition-all hover:shadow-lg transform hover:-translate-y-1">
                    Proceed to Checkout
                </button>
                <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-2">
                    <CheckCircle size={12}/> Secure Checkout
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

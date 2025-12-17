import React from 'react';
import { CartItem, User } from '../../types';
import { api } from '../../services/mockBackend';
import { ShoppingBag, CheckCircle, Trash2, Minus, Plus } from 'lucide-react';

type Props = {
  cart: CartItem[];
  updateCartQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  user: User | null;
  setView: (view: string) => void;
  notify?: (msg: string, type: 'success' | 'error') => void;
};

const Cart = ({ cart, updateCartQty, removeFromCart, user, setView, notify }: Props) => {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!user) {
      if(notify) notify("Please login to checkout", "error");
      return; 
    }
    
    if(notify) notify("Processing payment...", "success");
    
    setTimeout(async () => {
        await api.createOrder(user.id, cart.map(i => ({
        productId: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image
        })), total);
        
        if(notify) notify("Order placed successfully! Redirecting...", "success");
        
        setTimeout(() => window.location.reload(), 1500);
    }, 1000);
  };

  if (cart.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
         <ShoppingBag size={32} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-serif font-bold mb-2">Your cart is empty</h2>
      <p className="text-gray-500 mb-8">Looks like you haven't added anything yet.</p>
      <button onClick={() => setView('shop')} className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all hover:scale-105">Start Shopping</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-serif font-bold mb-8">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-6">
          {cart.map(item => (
            <div key={item.id} className="flex gap-6 py-6 border-b border-gray-100 last:border-0">
              <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{item.category}</p>
                    </div>
                    <p className="font-bold text-lg">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-gray-200 rounded-lg">
                    <button onClick={() => updateCartQty(item.id, item.quantity - 1)} className="p-2 hover:bg-gray-50 transition-colors"><Minus size={14} /></button>
                    <span className="px-4 text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateCartQty(item.id, item.quantity + 1)} className="p-2 hover:bg-gray-50 transition-colors"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="flex items-center gap-1 text-red-500 text-sm font-medium hover:text-red-600 transition-colors">
                      <Trash2 size={16}/> Remove
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
                    <span className="font-medium">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600 font-medium">Free</span>
                    </div>
                </div>
                <div className="flex justify-between font-bold text-xl mb-8">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
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

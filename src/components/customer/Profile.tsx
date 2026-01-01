import React, { useEffect, useState } from 'react';
import { api } from '../../services/mockBackend';
import { Order, User } from '../../types';
import { Package, CheckCircle, Truck, Clock, User as UserIcon } from 'lucide-react';

const Profile = ({ user }: { user: User }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if(user) {
      api.getUserOrders(user.id).then(setOrders);
    }
  }, [user]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Delivered': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle size={14} /> };
      case 'Shipped': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Truck size={14} /> };
      default: return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={14} /> };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row items-center gap-8 mb-16 bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-100">
        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
          {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserIcon size={48} className="text-gray-300" />}
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-serif font-bold mb-2">{user.name}</h1>
          <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mb-4">
            <UserIcon size={16} /> {user.email}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider">
              {user.role} Account
          </div>
        </div>
        <div className="md:ml-auto flex gap-6">
           <div className="text-center px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100">
             <span className="block text-3xl font-bold text-black">{orders.length}</span>
             <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Total Orders</span>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-serif font-bold flex items-center gap-3 mb-8">
          <Package size={24} /> Order History
        </h2>
        
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
             <Package size={48} className="mx-auto text-gray-300 mb-4" />
             <p className="text-gray-500 font-medium text-lg">No orders placed yet.</p>
             <p className="text-sm text-gray-400">Your fashion journey begins here.</p>
          </div>
        ) : (
          orders.map(order => {
             const statusStyle = getStatusStyle(order.status);
             return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="bg-gray-50/50 px-6 py-4 flex flex-wrap gap-6 justify-between items-center border-b border-gray-100">
                  <div className="flex gap-8 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Order Date</p>
                      <p className="font-bold text-gray-900">{order.date}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Amount</p>
                      <p className="font-bold text-gray-900">${order.total.toFixed(2)}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Order ID</p>
                      <p className="font-mono text-gray-600">#{order.id}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.icon}
                    {order.status}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="space-y-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 md:items-center">
                        <div className="w-20 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20}/></div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                           <div>
                             <h4 className="font-bold text-gray-900">{item.name}</h4>
                             <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                           </div>
                           <p className="font-bold text-gray-900">${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Profile;

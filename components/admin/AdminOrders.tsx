import React, { useEffect, useState } from 'react';
import { api } from '../../services/mockBackend';
import { Order, OrderStatus } from '../../types';
import { X, Check, Truck } from 'lucide-react';

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => api.getOrders().then(setOrders);

  const updateStatus = async (id: string, status: OrderStatus) => {
    await api.updateOrderStatus(id, status);
    loadOrders();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Order ID</th>
              <th className="p-4 font-semibold text-gray-600">Date</th>
              <th className="p-4 font-semibold text-gray-600">Customer</th>
              <th className="p-4 font-semibold text-gray-600">Total</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b border-gray-50">
                <td className="p-4 font-mono text-sm">{o.id}</td>
                <td className="p-4 text-gray-600">{o.date}</td>
                <td className="p-4 text-gray-900 font-medium">{o.userId}</td>
                <td className="p-4">${o.total.toFixed(2)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium 
                    ${o.status === OrderStatus.DELIVERED ? 'bg-green-100 text-green-700' : 
                      o.status === OrderStatus.SHIPPED ? 'bg-blue-100 text-blue-700' : 
                      o.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'}`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  {o.status === OrderStatus.PENDING && (
                    <>
                      <button onClick={() => updateStatus(o.id, OrderStatus.SHIPPED)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors">
                        <Truck size={12} /> Mark Shipped
                      </button>
                      <button onClick={() => updateStatus(o.id, OrderStatus.CANCELLED)} className="flex items-center gap-1 border border-red-200 text-red-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-red-50 transition-colors">
                        <X size={12} /> Cancel
                      </button>
                    </>
                  )}
                  {o.status === OrderStatus.SHIPPED && (
                    <button onClick={() => updateStatus(o.id, OrderStatus.DELIVERED)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700 transition-colors">
                      <Check size={12} /> Mark Delivered
                    </button>
                  )}
                  {(o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED) && (
                    <span className="text-xs text-gray-400 italic py-1.5">No actions available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listenOrdersByUser } from '../services/firestoreService';
import { Order, User } from '../types';

type Props = {
  user: User | null;
  onRequireAuth?: (redirectTo: string) => void;
};

const formatDate = (raw: any) => {
  if (!raw) return '';
  const s = String(raw);
  // If already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // ISO date
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  return s;
};

const OrdersPage: React.FC<Props> = ({ user, onRequireAuth }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'orders' | 'return'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenOrdersByUser(user.id, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => {
      try { unsub && unsub(); } catch {}
    };
  }, [user?.id]);

  const rows = useMemo(() => {
    if (tab === 'return') {
      return [] as Order[];
    }
    return orders;
  }, [orders, tab]);

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-center text-2xl font-semibold mb-6">My orders</h1>
        <p className="text-center text-gray-600 mb-6">You need to sign in to view your order history.</p>
        <div className="flex justify-center gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-black text-white"
            onClick={() => {
              if (onRequireAuth) onRequireAuth('/orders');
              else navigate('/');
            }}
          >
            Sign In
          </button>
          <Link className="px-4 py-2 rounded-lg border border-gray-200" to="/">Back Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-center text-2xl font-semibold mb-6">My orders</h1>

      <div className="flex justify-center gap-10 text-sm mb-10">
        <button
          className={`${tab === 'orders' ? 'font-semibold underline underline-offset-8' : 'text-gray-600'}`}
          onClick={() => setTab('orders')}
        >
          My orders
        </button>
        <button
          className={`${tab === 'return' ? 'font-semibold underline underline-offset-8' : 'text-gray-600'}`}
          onClick={() => setTab('return')}
        >
          Return
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600">Loading…</div>
      ) : tab === 'return' ? (
        <div className="text-center text-gray-500">No return requests yet.</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">No orders yet.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.map((o) => {
            const qty = (o.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
            const first = (o.items || [])[0];
            const name = first?.name || 'Order';
            const img = first?.image || '';
            const paid = String((o as any).paymentStatus || '').toUpperCase() === 'PAID' || !!(o as any).paidAt;
            const fulfillment = String(o.status || 'Pending');
            const status = paid ? `Paid • ${fulfillment}` : `Unpaid • ${fulfillment}`;
            const date = formatDate((o as any).date || (o as any).createdAt || '');
            const total = Number(o.total || 0);
            const orderNo = `#${String(o.id).slice(0, 10)}`;

            return (
              <div key={o.id} className="py-8 flex items-start justify-between gap-8">
                <div className="min-w-0">
                  <div className="text-gray-500 text-sm mb-2">{orderNo}</div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{status}</span>
                    <span>{date}</span>
                    <span>Quantity {qty || 0}</span>
                  </div>
                  <div className="mt-10 text-gray-900 font-medium">{name}</div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="text-right min-w-[120px]">
                    <div className="font-semibold">US ${total.toFixed(2)} <span className="text-gray-500">›</span></div>
                  </div>
                  <div className="w-24 h-24 bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                    {img ? (
                      <img src={img} alt={name} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.visibility='hidden';}} />
                    ) : (
                      <div className="text-gray-300 text-sm">No image</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

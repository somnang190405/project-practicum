import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { getUserFromFirestore, listenOrders } from '../services/firestoreService';
import { Order, User as TUser, UserRole } from '../types';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<TUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      setLoading(false);
      return;
    }
    getUserFromFirestore(fbUser.uid).then((u) => {
      setUser(u);
      setLoading(false);
    });
    const unsub = listenOrders((all) => {
      if (!fbUser) return;
      setOrders(all.filter((o) => o.userId === fbUser.uid));
    });
    return () => { unsub && unsub(); };
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-gray-600">Loading your profile…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-4">Profile</h1>
        <p className="text-gray-600 mb-6">You need to sign in to view your profile.</p>
        <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={() => navigate('/login')}>Sign In</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-bold">
            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-semibold">{user.name || 'Unnamed User'}</div>
            <div className="text-sm text-gray-600">{user.email}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase">{user.role}</div>
          </div>
        </div>
        {user.role === UserRole.ADMIN && (
          <button className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50" onClick={()=>navigate('/admin')}>Open Admin Dashboard</button>
        )}
      </div>

      {/* Details cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <div className="text-sm text-gray-500 mb-1">Name</div>
          <div className="font-medium">{user.name || '-'}</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <div className="text-sm text-gray-500 mb-1">Email</div>
          <div className="font-medium">{user.email}</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-5 bg-white">
          <div className="text-sm text-gray-500 mb-1">Role</div>
          <div className="font-medium">{user.role}</div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Orders</h2>
        <div className="text-sm text-gray-500">{orders.length} total</div>
      </div>
      {orders.length === 0 ? (
        <div className="text-gray-600">You have no orders yet.</div>
      ) : (
        <div className="overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice().sort((a,b)=> (new Date(b.date).getTime()) - (new Date(a.date).getTime())).map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="py-3 px-4 font-mono">{o.id}</td>
                  <td className="py-3 px-4">{new Date(o.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-gray-300">{o.status}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold">${(o.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

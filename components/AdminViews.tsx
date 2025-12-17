import React, { useState } from 'react';
import AdminDashboardHome from './admin/AdminDashboardHome';
import AdminProducts from './admin/AdminProducts';
import AdminOrders from './admin/AdminOrders';
import AdminUsers from './admin/AdminUsers';

export const AdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users'>('dashboard');

  return (
    <div className="admin-dashboard-root light">
      <aside className="admin-sidebar light">
        <div className="brand">
          <span className="brand-icon">🛡️</span>
          <span className="brand-name">TinhMe Admin Console</span>
        </div>
        <nav className="side-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="nav-icon">🏠</span>
            <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <span className="nav-icon">📦</span>
            <span>Products</span>
          </button>
          <button className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <span className="nav-icon">🛒</span>
            <span>Orders</span>
          </button>
          <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <span className="nav-icon">👥</span>
            <span>Users</span>
          </button>
        </nav>
      </aside>
      <main className="admin-main light">
        <header className="topbar">
          <h1 className="page-title">
            {activeTab === 'dashboard' && 'Overview'}
            {activeTab === 'products' && 'Products'}
            {activeTab === 'orders' && 'Order Management'}
            {activeTab === 'users' && 'User Management'}
          </h1>
          <button className="logout-btn">Logout</button>
        </header>
        {activeTab === 'dashboard' && <AdminDashboardHome />}
        {activeTab === 'products' && <AdminProducts />}
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};
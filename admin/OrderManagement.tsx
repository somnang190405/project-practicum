import React, { useState, useEffect } from "react";
import { getAllOrders, updateOrderStatus } from "../services/firestoreService";
import { Order, OrderStatus } from "../types";
import './OrderManagement.css';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const fetchedOrders = await getAllOrders();
      setOrders(fetchedOrders);
    };
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  return (
    <div className="order-management-container">
      <h2 className="om-title">Order Management</h2>
      <div className="om-table card">
        <div className="om-row om-header">
          <span>Order ID</span>
          <span>Date</span>
          <span>Customer</span>
          <span>Total</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {orders.map((order) => {
          const canShip = order.status === OrderStatus.PENDING;
          const canDeliver = order.status === OrderStatus.SHIPPED;
          const canCancel = order.status === OrderStatus.PENDING;
          const totalText = typeof (order as any).total === 'number' ? `$${(order as any).total.toFixed(2)}` : '$0.00';
          return (
            <div className="om-row" key={order.id}>
              <span className="om-cell id">{order.id}</span>
              <span className="om-cell date">{order.date}</span>
              <span className="om-cell customer">{order.userId || 'guest'}</span>
              <span className="om-cell total">{totalText}</span>
              <span className="om-cell status">
                <span className={`status-badge ${String(order.status).toLowerCase()}`}>{order.status}</span>
              </span>
              <span className="om-cell actions">
                {canDeliver && (
                  <button className="btn success" onClick={() => handleUpdateStatus(order.id, OrderStatus.DELIVERED)}>✓ Mark Delivered</button>
                )}
                {canShip && (
                  <button className="btn primary" onClick={() => handleUpdateStatus(order.id, OrderStatus.SHIPPED)}>📦 Mark Shipped</button>
                )}
                {canCancel && (
                  <button className="btn danger" onClick={() => handleUpdateStatus(order.id, OrderStatus.CANCELLED)}>✕ Cancel</button>
                )}
                {!canShip && !canDeliver && !canCancel && (
                  <span className="om-muted">No actions available</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderManagement;

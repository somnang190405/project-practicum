import React, { useMemo, useState, useEffect } from "react";
import { getSalesReports } from "../services/firestoreService";
import { Order, OrderStatus } from "../types";

const SalesReports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [fromISO, setFromISO] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [toISO, setToISO] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetched = await getSalesReports();
        // getSalesReports currently returns all orders
        setOrders((Array.isArray(fetched) ? fetched : []) as Order[]);
      } catch (e: any) {
        setError(e?.message || 'Failed to load sales reports');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const parseOrderDate = (o: Order): number | null => {
    const raw = (o.paidAt || o.date || '').toString();
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : null;
  };

  const range = useMemo(() => {
    const from = Date.parse(`${fromISO}T00:00:00`);
    const to = Date.parse(`${toISO}T23:59:59`);
    return {
      from: Number.isFinite(from) ? from : null,
      to: Number.isFinite(to) ? to : null,
    };
  }, [fromISO, toISO]);

  const filteredOrders = useMemo(() => {
    return orders
      .map((o) => ({ o, t: parseOrderDate(o) }))
      .filter(({ t }) => {
        if (t == null) return false;
        if (range.from != null && t < range.from) return false;
        if (range.to != null && t > range.to) return false;
        return true;
      })
      .map(({ o }) => o)
      .sort((a, b) => {
        const ta = parseOrderDate(a) ?? 0;
        const tb = parseOrderDate(b) ?? 0;
        return tb - ta;
      });
  }, [orders, range]);

  const stats = useMemo(() => {
    const nonCancelled = filteredOrders.filter((o) => o.status !== OrderStatus.CANCELLED);
    const paid = filteredOrders.filter((o) => (o.paymentStatus ? o.paymentStatus === 'PAID' : o.status !== OrderStatus.CANCELLED));
    const sum = (arr: Order[]) => arr.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const items = (arr: Order[]) => arr.reduce((acc, o) => acc + (Array.isArray(o.items) ? o.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0), 0);
    return {
      totalOrders: filteredOrders.length,
      totalItems: items(filteredOrders),
      grossRevenue: sum(nonCancelled),
      paidRevenue: sum(paid),
      paidOrders: paid.length,
      cancelledOrders: filteredOrders.length - nonCancelled.length,
    };
  }, [filteredOrders]);

  const money = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    return `$${v.toFixed(2)}`;
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div className="topbar">
        <div>
          <div className="page-title">Sales Reports</div>
          <div className="metric-label" style={{ marginTop: 4 }}>
            Showing orders by paid date (fallback: order date)
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>From</span>
            <input className="input" type="date" value={fromISO} max={toISO || todayISO} onChange={(e) => setFromISO(e.target.value)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>To</span>
            <input className="input" type="date" value={toISO} min={fromISO} max={todayISO} onChange={(e) => setToISO(e.target.value)} />
          </label>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load reports</div>
          <div className="field-error" style={{ margin: 0 }}>{error}</div>
        </div>
      )}

      <div className="overview-grid" style={{ marginBottom: 16 }}>
        <div className="card metric">
          <div>
            <div className="metric-label">Orders</div>
            <div className="metric-value">{stats.totalOrders}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">Items Sold</div>
            <div className="metric-value">{stats.totalItems}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">Gross Revenue (non-cancelled)</div>
            <div className="metric-value">{money(stats.grossRevenue)}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">Paid Revenue</div>
            <div className="metric-value">{money(stats.paidRevenue)}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">Paid Orders</div>
            <div className="metric-value">{stats.paidOrders}</div>
          </div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">Cancelled Orders</div>
            <div className="metric-value">{stats.cancelledOrders}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Orders</div>
        {loading ? (
          <div className="metric-label">Loading…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="metric-label">No orders in the selected date range.</div>
        ) : (
          <div className="product-table">
            <div className="product-row header" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr' }}>
              <span>Order</span>
              <span>Date</span>
              <span>Customer</span>
              <span>Status</span>
              <span>Total</span>
            </div>
            {filteredOrders.slice(0, 50).map((o) => {
              const dt = parseOrderDate(o);
              const dateText = dt ? new Date(dt).toLocaleString() : (o.date || '—');
              return (
                <div key={o.id} className="product-row" style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr' }}>
                  <span className="product-cell name">
                    <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12 }}>{o.id}</span>
                  </span>
                  <span>{dateText}</span>
                  <span>{o.userId || 'guest'}</span>
                  <span>{o.status}{o.paymentStatus ? ` / ${o.paymentStatus}` : ''}</span>
                  <span style={{ fontWeight: 700 }}>{money(Number(o.total) || 0)}</span>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredOrders.length > 50 && (
          <div className="metric-label" style={{ marginTop: 10 }}>
            Showing latest 50 orders (filtered).
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReports;

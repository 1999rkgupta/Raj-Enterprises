import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createApiClient } from '@raj-enterprises/api-client';
import { auth } from '../../../../apps/web/src/firebase';
import './Dashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    const user = auth.currentUser;
    return user ? user.getIdToken(true) : localStorage.getItem('dev_mock_token');
  },
});

interface Stats {
  total_sales: number;
  total_dues: number;
  total_orders: number;
  active_orders: number;
  low_stock_count: number;
}

interface TrendItem {
  month: string;
  sales: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const summaryRes = await api.raw.get('/api/admin/reports/dashboard');
      setStats(summaryRes.data);

      const trendsRes = await api.raw.get('/api/admin/reports/sales-trends');
      setTrends(trendsRes.data.series);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute SVG Line coordinates
  const maxSales = trends.length > 0 ? Math.max(...trends.map(t => t.sales), 1000) : 1000;
  const chartHeight = 200;
  const chartWidth = 500;
  const padding = 20;

  const points = trends.map((t, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (trends.length - 1 || 1);
    const y = chartHeight - padding - (t.sales * (chartHeight - padding * 2)) / maxSales;
    return { x, y, month: t.month, sales: t.sales };
  });

  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
    : '';

  return (
    <div className="dashboard-container container animate-fade-in" id="admin-dashboard">
      <div className="header-section">
        <h1 className="text-gradient">Console Dashboard</h1>
        <p className="text-secondary" style={{ marginTop: '4px' }}>Overview of Raj Enterprises retail sales operations</p>
      </div>

      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>Loading overview metrics...</p>
      ) : (
        <div className="flex flex-col gap-6" style={{ marginTop: 'var(--space-6)' }}>
          {/* Summary Cards */}
          {stats && (
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
              <div className="card">
                <h3>Total Sales</h3>
                <p className="text-gradient font-display" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>
                  ₹{stats.total_sales.toFixed(2)}
                </p>
              </div>
              <div className="card">
                <h3>Outstanding Dues</h3>
                <p className="text-gradient font-display" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>
                  ₹{stats.total_dues.toFixed(2)}
                </p>
              </div>
              <div className="card">
                <h3>Active Orders</h3>
                <Link to="/orders?status=active" style={{ textDecoration: 'none' }}>
                  <p className="text-gradient font-display" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>
                    {stats.active_orders}
                  </p>
                </Link>
              </div>
              <div className="card" style={{ border: stats.low_stock_count > 0 ? '1px solid var(--color-error)' : '1px solid var(--border-default)' }}>
                <h3>Low Stock Alerts</h3>
                <Link to="/products?filter=low-stock" style={{ textDecoration: 'none' }}>
                  <p className={`${stats.low_stock_count > 0 ? 'text-danger' : 'text-gradient'} font-display`} style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-1)' }}>
                    {stats.low_stock_count}
                  </p>
                </Link>
              </div>
            </div>
          )}

          {/* Sales Trend Chart */}
          <div className="card sales-trends-chart-card">
            <h2>Monthly Sales Trends</h2>
            <div className="flex justify-center" style={{ marginTop: 'var(--space-4)' }}>
              {trends.length > 0 ? (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="trends-svg" style={{ width: '100%', maxWidth: '700px', height: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Fill Area */}
                  {areaD && <path d={areaD} fill="url(#chartGradient)" />}
                  
                  {/* Line */}
                  {pathD && <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="3" />}
                  
                  {/* Grid Lines & Labels */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary-light)" />
                      {/* X label */}
                      {idx % 2 === 0 && (
                        <text x={p.x} y={chartHeight - 4} fontSize="8" fill="var(--text-tertiary)" textAnchor="middle">
                          {p.month}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              ) : (
                <p className="text-secondary">No data logged for sales trends yet.</p>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="card">
            <h2>Quick Actions</h2>
            <div className="flex gap-4" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              <Link to="/users" className="btn btn-primary">👥 Customer Directory</Link>
              <Link to="/products" className="btn btn-primary">📦 Product Catalog</Link>
              <Link to="/orders" className="btn btn-primary">🛒 Order Pipeline</Link>
              <Link to="/reports" className="btn btn-secondary">📈 Sales & Dues Reports</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Dashboard;

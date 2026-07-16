import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createApiClient } from '@raj-enterprises/api-client';
import { auth } from '../../../../apps/web/src/firebase';
import { showToast } from '@raj-enterprises/shared-redux';
import './Reports.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    const user = auth.currentUser;
    return user ? user.getIdToken(true) : localStorage.getItem('dev_mock_token');
  },
});

interface TopProduct {
  product_id: string;
  sku: string;
  title: string;
  units_sold: number;
  revenue: number;
}

interface DueCustomer {
  user_id: string;
  user_name: string;
  user_mobile?: string;
  total_amount: number;
  total_received: number;
  total_due: number;
  order_count: number;
}

export function Reports() {
  const dispatch = useDispatch();

  // Tab selections: 'products' | 'dues'
  const [tab, setTab] = useState<'products' | 'dues'>('products');

  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [dueCustomers, setDueCustomers] = useState<DueCustomer[]>([]);
  const [duesSummary, setDuesSummary] = useState<any>(null);
  const [loadingDues, setLoadingDues] = useState(false);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState<string[]>([]);

  // Reset columns when tab changes
  useEffect(() => {
    if (tab === 'products') {
      setExportColumns(['product_id', 'sku', 'title', 'units_sold', 'revenue']);
    } else {
      setExportColumns(['user_id', 'user_name', 'user_mobile', 'total_amount', 'total_received', 'total_due', 'order_count']);
    }
  }, [tab]);

  const handleExportExcel = () => {
    try {
      if (tab === 'products') {
        if (topProducts.length === 0) {
          dispatch(showToast({ message: 'No records available to export.', type: 'warning' }));
          return;
        }

        const headersMap: Record<string, string> = {
          product_id: 'Product ID',
          sku: 'SKU',
          title: 'Title',
          units_sold: 'Units Sold',
          revenue: 'Revenue (₹)',
        };

        const selectedHeaders = exportColumns.map(col => headersMap[col]);
        const rows = topProducts.map((p: any) => {
          return exportColumns.map(col => {
            if (col === 'revenue') return p.revenue.toFixed(2);
            return (p as any)[col] || '';
          });
        });

        const csvContent = "\uFEFF" + [
          selectedHeaders.join(","),
          ...rows.map((row: string[]) => row.map((val: string) => {
            const cell = val === null || val === undefined ? '' : String(val);
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          }).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `top_products_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        if (dueCustomers.length === 0) {
          dispatch(showToast({ message: 'No records available to export.', type: 'warning' }));
          return;
        }

        const headersMap: Record<string, string> = {
          user_id: 'Customer ID',
          user_name: 'Customer Name',
          user_mobile: 'Mobile',
          total_amount: 'Total Orders Amount (₹)',
          total_received: 'Total Paid (₹)',
          total_due: 'Total Balance Due (₹)',
          order_count: 'Outstanding Orders Count',
        };

        const selectedHeaders = exportColumns.map(col => headersMap[col]);
        const rows = dueCustomers.map((c: any) => {
          return exportColumns.map(col => {
            if (col === 'total_amount' || col === 'total_received' || col === 'total_due') return c[col]?.toFixed(2) || '0.00';
            return (c as any)[col] || '';
          });
        });

        const csvContent = "\uFEFF" + [
          selectedHeaders.join(","),
          ...rows.map((row: string[]) => row.map((val: string) => {
            const cell = val === null || val === undefined ? '' : String(val);
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          }).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `outstanding_dues_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      dispatch(showToast({ message: 'Export completed successfully!', type: 'success' }));
      setShowExportModal(false);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to export reports.', type: 'error' }));
    }
  };

  const fetchTopProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.raw.get('/api/admin/reports/top-products');
      setTopProducts(res.data.products);
    } catch {
      dispatch(showToast({ message: 'Failed to load top products report.', type: 'error' }));
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchDuesReport = async () => {
    setLoadingDues(true);
    try {
      const res = await api.raw.get('/api/admin/orders/dues');
      setDueCustomers(res.data.customers_with_dues);
      setDuesSummary(res.data.summary);
    } catch {
      dispatch(showToast({ message: 'Failed to load customer dues report.', type: 'error' }));
    } finally {
      setLoadingDues(false);
    }
  };

  useEffect(() => {
    if (tab === 'products') {
      fetchTopProducts();
    } else {
      fetchDuesReport();
    }
  }, [tab]);

  const handleSendReminder = (customer: DueCustomer) => {
    if (!customer.user_mobile) {
      dispatch(showToast({ message: 'No mobile number recorded for this customer.', type: 'warning' }));
      return;
    }

    const cleanMobile = customer.user_mobile.replace('+', '');
    const message = `Hello ${customer.user_name}, this is a reminder regarding your outstanding balance of ₹${customer.total_due.toFixed(2)} with Raj Enterprises. Please settle your dues at your earliest convenience. Thank you!`;
    const waUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="reports-page container animate-fade-in" id="admin-reports">
      <div className="flex justify-between items-center header-section">
        <div>
          <h1 className="text-gradient">Catalog & Dues Reports</h1>
          <p className="text-secondary" style={{ marginTop: '4px' }}>Business intelligence, top sellers, and aging dues summaries</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
          📥 Export Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex tab-container" style={{ margin: 'var(--space-6) 0' }}>
        <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          Top Selling Coatings
        </button>
        <button className={`tab-btn ${tab === 'dues' ? 'active' : ''}`} onClick={() => setTab('dues')}>
          Outstanding Customer Dues
        </button>
      </div>

      {tab === 'products' ? (
        <div className="top-products-section card animate-fade-in" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Description</th>
                <th style={{ textAlign: 'right' }}>Units Sold</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {loadingProducts ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Calculating metrics...</td></tr>
              ) : topProducts.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>No order items logged yet.</td></tr>
              ) : (
                topProducts.map((p) => (
                  <tr key={p.product_id}>
                    <td><code>{p.sku}</code></td>
                    <td><strong>{p.title}</strong></td>
                    <td style={{ textAlign: 'right' }}>{p.units_sold}</td>
                    <td style={{ textAlign: 'right' }}>₹{p.revenue.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Summary Cards */}
          {duesSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
              <div className="card">
                <h3>Total Outstanding Dues</h3>
                <p className="text-gradient" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-2)' }}>
                  ₹{duesSummary.total_due.toFixed(2)}
                </p>
              </div>
              <div className="card">
                <h3>Unpaid Orders Count</h3>
                <p className="text-gradient" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-2)' }}>
                  {duesSummary.unpaid_orders}
                </p>
              </div>
              <div className="card">
                <h3>Partial Orders Count</h3>
                <p className="text-gradient" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-2)' }}>
                  {duesSummary.partial_orders}
                </p>
              </div>
            </div>
          )}

          {/* Dues aging list */}
          <div className="card" style={{ padding: 0 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th style={{ textAlign: 'right' }}>Total Ordered</th>
                  <th style={{ textAlign: 'right' }}>Total Paid</th>
                  <th style={{ textAlign: 'right' }}>Total Due</th>
                  <th style={{ textAlign: 'right' }}>Orders</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingDues ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Calculating dues ledger...</td></tr>
                ) : dueCustomers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>No outstanding dues found! All customers fully paid.</td></tr>
                ) : (
                  dueCustomers.map((c) => (
                    <tr key={c.user_id}>
                      <td><strong>{c.user_name}</strong></td>
                      <td>{c.user_mobile || '—'}</td>
                      <td style={{ textAlign: 'right' }}>₹{c.total_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{c.total_received.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="text-gradient">₹{c.total_due.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{c.order_count}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSendReminder(c)}
                          disabled={!c.user_mobile}
                        >
                          💬 Send Reminder
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Excel Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
            <button className="modal-close" onClick={() => setShowExportModal(false)}>&times;</button>
            <h2>Export Report to Excel</h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
              Configure columns to generate your spreadsheet.
            </p>

            <div className="flex flex-col gap-5">
              {/* Columns Selector Checklist */}
              <div className="input-group">
                <label>Select Columns to Include</label>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  {tab === 'products' ? (
                    [
                      { id: 'product_id', label: 'Product ID' },
                      { id: 'sku', label: 'SKU' },
                      { id: 'title', label: 'Title' },
                      { id: 'units_sold', label: 'Units Sold' },
                      { id: 'revenue', label: 'Revenue (₹)' },
                    ].map(col => (
                      <label key={col.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={exportColumns.includes(col.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setExportColumns([...exportColumns, col.id]);
                            } else {
                              setExportColumns(exportColumns.filter(c => c !== col.id));
                            }
                          }}
                        />
                        {col.label}
                      </label>
                    ))
                  ) : (
                    [
                      { id: 'user_id', label: 'Customer ID' },
                      { id: 'user_name', label: 'Customer Name' },
                      { id: 'user_mobile', label: 'Mobile' },
                      { id: 'total_amount', label: 'Total Orders (₹)' },
                      { id: 'total_received', label: 'Total Paid (₹)' },
                      { id: 'total_due', label: 'Total Due (₹)' },
                      { id: 'order_count', label: 'Outstanding Orders Count' },
                    ].map(col => (
                      <label key={col.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={exportColumns.includes(col.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setExportColumns([...exportColumns, col.id]);
                            } else {
                              setExportColumns(exportColumns.filter(c => c !== col.id));
                            }
                          }}
                        />
                        {col.label}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4" style={{ marginTop: 'var(--space-4)' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExportExcel} disabled={exportColumns.length === 0}>
                  📥 Download Report
                </button>
                <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Reports;

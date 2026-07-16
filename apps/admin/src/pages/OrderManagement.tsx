import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { createApiClient } from '@raj-enterprises/api-client';
import { auth } from '../../../../apps/web/src/firebase';
import { showToast } from '@raj-enterprises/shared-redux';
import './OrderManagement.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    const user = auth.currentUser;
    return user ? user.getIdToken(true) : localStorage.getItem('dev_mock_token');
  },
});

interface OrderAdmin {
  id: string;
  order_number: string;
  user_id: string;
  user_name: string;
  user_mobile?: string;
  items: any[];
  delivery_address: any;
  order_status: string;
  payment_status: string;
  amount_total: number;
  amount_received: number;
  amount_due: number;
  payment_history: any[];
  expected_delivery_date?: string;
  invoice_generated: boolean;
  created_at: string;
  status_history: any[];
}

export function OrderManagement() {
  const dispatch = useDispatch();

  const [searchParams] = useSearchParams();
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    if (searchParams.get('status') === 'active') {
      setShowActiveOnly(true);
    }
  }, [searchParams]);

  // List States
  const [orders, setOrders] = useState<OrderAdmin[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Detailed Drawer State
  const [selectedOrder, setSelectedOrder] = useState<OrderAdmin | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  // Payment Recording State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Status Change State
  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportColumns, setExportColumns] = useState<string[]>([
    'order_number', 'user_name', 'user_mobile', 'created_at', 'amount_total', 'amount_received', 'amount_due', 'order_status', 'payment_status'
  ]);

  const handleExportExcel = async () => {
    try {
      const res = await api.admin.listOrders({
        page: 1,
        page_size: 1000,
        search: search || undefined,
        order_status: selectedStatusFilter || undefined,
        payment_status: selectedPaymentFilter || undefined,
      });

      let dataToExport = res.orders;

      const now = new Date();
      dataToExport = dataToExport.filter((o: OrderAdmin) => {
        if (!o.created_at) return true;
        const createdDate = new Date(o.created_at);
        if (exportDateRange === 'week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return createdDate >= oneWeekAgo;
        } else if (exportDateRange === 'month') {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(now.getMonth() - 1);
          return createdDate >= oneMonthAgo;
        } else if (exportDateRange === 'year') {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(now.getFullYear() - 1);
          return createdDate >= oneYearAgo;
        } else if (exportDateRange === 'custom') {
          const start = exportStartDate ? new Date(exportStartDate) : null;
          const end = exportEndDate ? new Date(exportEndDate) : null;
          if (start && createdDate < start) return false;
          if (end && createdDate > end) return false;
        }
        return true;
      });

      if (dataToExport.length === 0) {
        dispatch(showToast({ message: 'No records found for the selected date range.', type: 'warning' }));
        return;
      }

      const headersMap: Record<string, string> = {
        order_number: 'Order Number',
        user_name: 'Customer Name',
        user_mobile: 'Mobile',
        created_at: 'Date',
        amount_total: 'Total Amount (₹)',
        amount_received: 'Amount Received (₹)',
        amount_due: 'Balance Due (₹)',
        order_status: 'Order Status',
        payment_status: 'Payment Status',
      };

      const selectedHeaders = exportColumns.map(col => headersMap[col]);
      const rows = dataToExport.map((o: any) => {
        return exportColumns.map(col => {
          if (col === 'created_at') return new Date(o.created_at).toLocaleDateString();
          if (col === 'amount_total' || col === 'amount_received' || col === 'amount_due') return o[col]?.toFixed(2) || '0.00';
          return o[col] || '';
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
      const filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      dispatch(showToast({ message: 'Export completed successfully!', type: 'success' }));
      setShowExportModal(false);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to export orders.', type: 'error' }));
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.admin.listOrders({
        page,
        page_size: 10,
        search: search || undefined,
        order_status: selectedStatusFilter || undefined,
        payment_status: selectedPaymentFilter || undefined,
      });
      setOrders(res.orders);
      setTotalOrders(res.total);
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to load orders', type: 'error' }));
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, selectedStatusFilter, selectedPaymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleDownloadInvoice = async (orderId: string, orderNumber: string) => {
    setDownloadingInvoice(orderId);
    try {
      const response = await api.raw.get(`/api/orders/${orderId}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      dispatch(showToast({ message: 'Invoice downloaded successfully.', type: 'success' }));
    } catch {
      dispatch(showToast({ message: 'Failed to download invoice.', type: 'error' }));
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !paymentAmount) return;
    setRecordingPayment(true);

    try {
      const res = await api.admin.recordPayment(selectedOrder.id, {
        amount: parseFloat(paymentAmount),
        note: paymentNote || undefined,
      });
      dispatch(showToast({ message: 'Payment recorded successfully!', type: 'success' }));
      
      // Update selected order details inline
      setSelectedOrder({
        ...selectedOrder,
        amount_received: res.amount_received,
        amount_due: res.amount_due,
        payment_status: res.payment_status,
        payment_history: [...selectedOrder.payment_history, {
          amount: parseFloat(paymentAmount),
          date: new Date().toISOString(),
          note: paymentNote,
        }],
      });

      setPaymentAmount('');
      setPaymentNote('');
      fetchOrders();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to record payment', type: 'error' }));
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !nextStatus) return;
    setUpdatingStatus(true);

    try {
      await api.admin.updateOrderStatus(selectedOrder.id, {
        status: nextStatus as any,
        note: statusNote || undefined,
      });
      dispatch(showToast({ message: 'Order status updated successfully!', type: 'success' }));
      
      // Refresh detailed view & list
      const updatedOrderList = await api.admin.listOrders({ page, page_size: 10, search });
      const freshOrder = updatedOrderList.orders.find((o: any) => o.id === selectedOrder.id);
      if (freshOrder) setSelectedOrder(freshOrder);

      setNextStatus('');
      setStatusNote('');
      fetchOrders();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to update order status.', type: 'error' }));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get available next transitions
  const getNextTransitions = (status: string): string[] => {
    switch (status) {
      case 'placed':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['packed', 'cancelled'];
      case 'packed':
        return ['dispatched', 'cancelled'];
      case 'dispatched':
        return ['delivered', 'cancelled'];
      default:
        return [];
    }
  };

  const displayedOrders = showActiveOnly
    ? orders.filter(o => ['placed', 'confirmed', 'packed', 'dispatched'].includes(o.order_status))
    : orders;

  const activeOrder: OrderAdmin = selectedOrder || {
    id: '',
    order_number: '',
    user_id: '',
    user_name: '',
    items: [],
    delivery_address: {},
    order_status: '',
    payment_status: '',
    amount_total: 0,
    amount_received: 0,
    amount_due: 0,
    payment_history: [],
    invoice_generated: false,
    created_at: '',
    status_history: []
  };

  return (
    <div className="order-management-page container animate-fade-in" id="admin-order-management">
      <div className="flex justify-between items-center header-section">
        <h1 className="text-gradient">Orders Lifecycle Management</h1>
        <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
          📥 Export Excel
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearchSubmit} className="flex gap-4 filters-form card-glass" style={{ padding: 'var(--space-4)', margin: 'var(--space-6) 0' }}>
        <input
          type="text"
          className="input"
          placeholder="Search by order number or customer name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 2 }}
        />
        <select
          className="input"
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
          style={{ flex: 1, background: 'var(--bg-secondary)' }}
        >
          <option value="">All Statuses</option>
          <option value="placed">Placed</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          className="input"
          value={selectedPaymentFilter}
          onChange={e => setSelectedPaymentFilter(e.target.value)}
          style={{ flex: 1, background: 'var(--bg-secondary)' }}
        >
          <option value="">All Payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <button type="submit" className="btn btn-secondary">Filter</button>
      </form>

      {showActiveOnly && (
        <div className="card-glass flex justify-between items-center animate-fade-in" style={{ padding: 'var(--space-3)', margin: '0 0 var(--space-4) 0', borderRadius: 'var(--radius-md)', borderColor: 'var(--color-warning)' }}>
          <span className="text-secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>⚠️ Showing Active Orders Only</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowActiveOnly(false)}>Show All Orders</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="card table-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer Name</th>
              <th>Order Date</th>
              <th>Total Amount</th>
              <th>Balance Due</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingOrders ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Loading order files...</td></tr>
            ) : displayedOrders.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>No matching orders found.</td></tr>
            ) : (
              displayedOrders.map(o => (
                <tr key={o.id}>
                  <td className="clickable-name" onClick={() => setSelectedOrder(o)}>
                    <strong>{o.order_number}</strong>
                  </td>
                  <td>{o.user_name}</td>
                  <td className="text-secondary">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>₹{o.amount_total.toFixed(2)}</td>
                  <td>₹{o.amount_due.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${o.order_status === 'delivered' ? 'badge-success' : o.order_status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                      {o.order_status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${o.payment_status === 'paid' ? 'badge-success' : o.payment_status === 'unpaid' ? 'badge-danger' : 'badge-warning'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedOrder(o)}>Manage</button>
                      {o.order_status !== 'cancelled' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownloadInvoice(o.id, o.order_number)}
                          disabled={downloadingInvoice === o.id}
                        >
                          📄 {downloadingInvoice === o.id ? '...' : 'PDF'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center pagination-row" style={{ marginTop: 'var(--space-6)' }}>
        <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
          Showing {displayedOrders.length} of {totalOrders} orders
        </span>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <button className="btn btn-secondary btn-sm" disabled={page * 10 >= totalOrders} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </div>

      {/* Detailed Order Lifecycle Drawer */}
      {selectedOrder && (
        <div className="drawer-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="drawer-content card animate-slide-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <button className="drawer-close" onClick={() => setSelectedOrder(null)}>&times;</button>
            
            <div className="drawer-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-4)' }}>
              <h2>Manage Order</h2>
              <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{activeOrder.order_number}</span>
            </div>

            <div className="drawer-body flex flex-col gap-6" style={{ marginTop: 'var(--space-6)' }}>
              
              {/* Order Status Transition Controller */}
              <div className="drawer-section">
                <h3>Update Order Status</h3>
                {getNextTransitions(activeOrder.order_status).length === 0 ? (
                  <p className="text-tertiary" style={{ fontSize: 'var(--text-xs)' }}>
                    Order is in a final state ({activeOrder.order_status}) and cannot be transitioned further.
                  </p>
                ) : (
                  <form onSubmit={handleUpdateStatus} className="flex flex-col gap-3" style={{ marginTop: 'var(--space-2)' }}>
                    <div className="input-group">
                      <label htmlFor="next-st">Next Status Transition</label>
                      <select
                        id="next-st"
                        className="input"
                        value={nextStatus}
                        onChange={e => setNextStatus(e.target.value)}
                        required
                        style={{ background: 'var(--bg-secondary)' }}
                      >
                        <option value="">Select Next Status</option>
                        {getNextTransitions(activeOrder.order_status).map(s => (
                          <option key={s} value={s}>{s.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label htmlFor="st-note">Transition Notes (Optional)</label>
                      <input
                        type="text"
                        id="st-note"
                        className="input"
                        placeholder="e.g. Dispatched via Express Logistics"
                        value={statusNote}
                        onChange={e => setStatusNote(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={updatingStatus} style={{ alignSelf: 'flex-start' }}>
                      {updatingStatus ? 'Transitioning...' : 'Update Status'}
                    </button>
                  </form>
                )}
              </div>

              {/* Record Payment Logger */}
              {activeOrder.order_status !== 'cancelled' && (
                <div className="drawer-section">
                  <h3>Record Cash Collection</h3>
                  <div className="flex justify-between" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                    <span>Amount Paid: <strong>₹{activeOrder.amount_received.toFixed(2)}</strong></span>
                    <span>Due Balance: <strong className="text-gradient">₹{activeOrder.amount_due.toFixed(2)}</strong></span>
                  </div>

                  {activeOrder.payment_status === 'paid' ? (
                    <span className="badge badge-success" style={{ display: 'block', textAlign: 'center' }}>Fully Paid</span>
                  ) : (
                    <form onSubmit={handleRecordPayment} className="flex flex-col gap-3">
                      <div className="input-group">
                        <label htmlFor="pay-amt">Collection Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          id="pay-amt"
                          className="input"
                          placeholder="e.g. 500"
                          max={activeOrder.amount_due}
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label htmlFor="pay-note">Collection Note</label>
                        <input
                          type="text"
                          id="pay-note"
                          className="input"
                          placeholder="e.g. Cash collected by driver"
                          value={paymentNote}
                          onChange={e => setPaymentNote(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn btn-secondary" disabled={recordingPayment} style={{ alignSelf: 'flex-start' }}>
                        {recordingPayment ? 'Logging...' : 'Log Payment'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Items details */}
              <div className="drawer-section">
                <h3>Purchased Items Snapshot</h3>
                <div className="flex flex-col gap-2" style={{ marginTop: 'var(--space-2)' }}>
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center card-glass" style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                      <div>
                        <strong>{item.title_snapshot}</strong>
                        <p className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                          ₹{item.price_snapshot.toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <span>₹{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address details */}
              <div className="drawer-section">
                <h3>Delivery Address</h3>
                <div className="card-glass" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                  <strong>{activeOrder.delivery_address?.full_name}</strong>
                  <p className="text-secondary" style={{ marginTop: '4px' }}>
                    {activeOrder.delivery_address?.address_line_1}
                    {activeOrder.delivery_address?.address_line_2 ? `, ${activeOrder.delivery_address.address_line_2}` : ''}, {activeOrder.delivery_address?.city}, {activeOrder.delivery_address?.state} - {activeOrder.delivery_address?.pincode}
                  </p>
                  <p className="text-secondary" style={{ marginTop: '4px' }}>📞 {activeOrder.delivery_address?.phone}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Export Excel Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
            <button className="modal-close" onClick={() => setShowExportModal(false)}>&times;</button>
            <h2>Export Orders to Excel</h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
              Configure columns and date filters to generate your spreadsheet.
            </p>

            <div className="flex flex-col gap-5">
              {/* Date Filter Group */}
              <div className="input-group">
                <label>Date Filter Range</label>
                <select
                  className="input"
                  value={exportDateRange}
                  onChange={e => setExportDateRange(e.target.value)}
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <option value="all">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {exportDateRange === 'custom' && (
                <div className="grid animate-fade-in" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="input-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      className="input"
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      className="input"
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Columns Selector Checklist */}
              <div className="input-group">
                <label>Select Columns to Include</label>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  {[
                    { id: 'order_number', label: 'Order Number' },
                    { id: 'user_name', label: 'Customer Name' },
                    { id: 'user_mobile', label: 'Mobile' },
                    { id: 'created_at', label: 'Date' },
                    { id: 'amount_total', label: 'Total Amount (₹)' },
                    { id: 'amount_received', label: 'Amount Received (₹)' },
                    { id: 'amount_due', label: 'Balance Due (₹)' },
                    { id: 'order_status', label: 'Order Status' },
                    { id: 'payment_status', label: 'Payment Status' },
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
                  ))}
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
export default OrderManagement;

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../utils/api';
import { showToast } from '@raj-enterprises/shared-redux';
import './OrderHistory.css';

interface OrderItem {
  product_id: string;
  title_snapshot: string;
  price_snapshot: number;
  quantity: number;
  subtotal: number;
}

interface StatusHistory {
  status: string;
  changed_by: string;
  timestamp: string;
  note: string;
}

interface Order {
  id: string;
  order_number: string;
  items: OrderItem[];
  delivery_address: {
    full_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  order_status: string;
  payment_status: string;
  amount_total: number;
  amount_received: number;
  amount_due: number;
  expected_delivery_date?: string;
  created_at: string;
  status_history: StatusHistory[];
}

export function OrderHistory() {
  const dispatch = useDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.list();
      setOrders(res.orders);
    } catch (err: any) {
      dispatch(showToast({ message: 'Failed to load order history.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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

  return (
    <div className="container order-history-page animate-fade-in" id="order-history-page">
      <h1 className="page-title text-gradient">Your Order History</h1>

      {loading ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="flex justify-center items-center flex-col card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <span style={{ fontSize: '3rem' }}>📦</span>
          <h2 style={{ marginTop: 'var(--space-4)' }}>No orders placed yet</h2>
          <p className="text-secondary" style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            Once you check out items from your cart, your order lifecycle status tracking details will appear here.
          </p>
        </div>
      ) : (
        <div className="orders-history-grid" style={{ marginTop: 'var(--space-6)' }}>
          {/* Left: Orders List */}
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`order-list-item card-glass flex justify-between items-center ${selectedOrder?.id === order.id ? 'active-order' : ''}`}
                onClick={() => setSelectedOrder(order)}
                style={{ cursor: 'pointer', padding: 'var(--space-5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
              >
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{order.order_number}</h3>
                  <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
                    Placed on: {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: '4px', fontWeight: 600 }}>
                    ₹{order.amount_total.toFixed(2)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${order.order_status === 'delivered' ? 'badge-success' : order.order_status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                    {order.order_status}
                  </span>
                  <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                    <span className={`badge ${order.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Order Details Timeline Panel */}
          <div className="card order-details-panel">
            {selectedOrder ? (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-4)' }}>
                  <div>
                    <h2>Order Details</h2>
                    <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.order_number}</span>
                  </div>
                  
                  {/* Download invoice button */}
                  {selectedOrder.order_status !== 'cancelled' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownloadInvoice(selectedOrder.id, selectedOrder.order_number)}
                      disabled={downloadingInvoice === selectedOrder.id}
                    >
                      {downloadingInvoice === selectedOrder.id ? 'Downloading...' : '📄 Download Invoice'}
                    </button>
                  )}
                </div>

                {/* Items snapshot */}
                <div className="details-section">
                  <h3>Purchased Items</h3>
                  <div className="flex flex-col gap-3" style={{ marginTop: 'var(--space-2)' }}>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center card-glass" style={{ padding: 'var(--space-3)' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{item.title_snapshot}</p>
                          <p className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>
                            ₹{item.price_snapshot.toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <span style={{ fontWeight: 600 }}>₹{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping address */}
                <div className="details-section">
                  <h3>Delivery Address</h3>
                  <div className="card-glass" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                    <strong>{selectedOrder.delivery_address.full_name}</strong>
                    <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                      {selectedOrder.delivery_address.address_line_1}
                      {selectedOrder.delivery_address.address_line_2 ? `, ${selectedOrder.delivery_address.address_line_2}` : ''}, {selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.state} - {selectedOrder.delivery_address.pincode}
                    </p>
                    {selectedOrder.delivery_address.landmark && (
                      <p className="text-tertiary" style={{ fontSize: 'var(--text-xs)' }}>Landmark: {selectedOrder.delivery_address.landmark}</p>
                    )}
                    <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>📞 {selectedOrder.delivery_address.phone}</p>
                  </div>
                </div>

                {/* Status history timeline */}
                <div className="details-section">
                  <h3>Timeline & Status History</h3>
                  <div className="timeline-container flex flex-col gap-4" style={{ marginTop: 'var(--space-4)', paddingLeft: 'var(--space-2)' }}>
                    {selectedOrder.status_history.map((h, idx) => (
                      <div key={idx} className="timeline-item flex gap-4" style={{ position: 'relative' }}>
                        {/* Dot indicator */}
                        <div className="timeline-dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '6px', zIndex: 2 }} />
                        
                        <div>
                          <strong style={{ fontSize: 'var(--text-sm)', textTransform: 'capitalize' }}>
                            {h.status}
                          </strong>
                          <span className="text-tertiary" style={{ fontSize: '10px', marginLeft: 'var(--space-2)' }}>
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                          {h.note && (
                            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: '2px', background: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                              Note: {h.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center text-secondary" style={{ minHeight: '300px' }}>
                <p>Select an order from the list to view delivery timeline details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderHistory;

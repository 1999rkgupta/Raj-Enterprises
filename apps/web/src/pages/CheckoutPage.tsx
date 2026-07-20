import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../utils/api';
import type { RootState } from '../store/store';
import { clearCart, setCart, showToast, setUser } from '@raj-enterprises/shared-redux';
import type { DeliveryAddress } from '@raj-enterprises/shared-types';
import PageTransition from '../components/ui/PageTransition';
import './CheckoutPage.css';

export function CheckoutPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state: RootState) => state.auth);
  const { cart } = useSelector((state: RootState) => state.cart);

  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Inline Add Address Form State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrName, setAddrName] = useState(user?.name || '');
  const [addrPhone, setAddrPhone] = useState(user?.mobile || '');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  // Auto-select default address on mount
  useEffect(() => {
    if (user && user.addresses && user.addresses.length > 0) {
      const defaultIdx = user.addresses.findIndex(a => a.is_default);
      setSelectedAddressIndex(defaultIdx !== -1 ? defaultIdx : 0);
    }
  }, [user]);

  if (!user || !cart) return null;

  // Selected checkout items
  const checkoutItems = cart.items.filter(i => i.selected);

  if (checkoutItems.length === 0) {
    return (
      <div className="container flex justify-center items-center flex-col" style={{ minHeight: '60vh' }}>
        <h2>No items selected for checkout</h2>
        <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => navigate('/cart')}>
          Back to Cart
        </button>
      </div>
    );
  }

  const handleSaveInlineAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    const newAddress = {
      label: addrLabel,
      full_name: addrName,
      phone: addrPhone,
      address_line_1: addrLine1,
      address_line_2: addrLine2 || undefined,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
      landmark: addrLandmark || undefined,
      is_default: user.addresses.length === 0,
    };

    try {
      await api.users.addAddress(newAddress);
      
      // Fetch fresh profile details
      const freshUser = await api.auth.getMe();
      dispatch(setUser(freshUser));
      
      // Auto-select the newly added address
      setSelectedAddressIndex(freshUser.addresses.length - 1);
      setShowAddAddress(false);
      
      dispatch(showToast({ message: 'Address saved successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to add address.', type: 'error' }));
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (selectedAddressIndex === null) {
      dispatch(showToast({ message: 'Please select a delivery address.', type: 'warning' }));
      return;
    }

    setSubmittingOrder(true);
    try {
      // Place the COD order
      await api.orders.place({
        address_index: selectedAddressIndex,
        note: deliveryNote || undefined,
      });

      dispatch(showToast({ message: 'Order placed successfully!', type: 'success' }));
      
      // Clear the local Redux cart
      dispatch(clearCart());
      
      // Redirect to orders history page
      navigate('/orders');
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to place order. Out of stock?', type: 'error' }));
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <PageTransition className="container checkout-page animate-fade-in" id="checkout-page">
      <h1 className="page-title text-gradient">Checkout</h1>

      <div className="checkout-grid" style={{ marginTop: 'var(--space-6)' }}>
        {/* Left: Shipping Address & Delivery instructions */}
        <div className="flex flex-col gap-6">
          
          {/* Address book selector */}
          <div className="card checkout-section">
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-3)' }}>
              <h2>Shipping Address</h2>
              {!showAddAddress && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddAddress(true)}>
                  + New Address
                </button>
              )}
            </div>

            {showAddAddress ? (
              <form onSubmit={handleSaveInlineAddress} className="address-form flex flex-col gap-4 animate-fade-in" style={{ marginTop: 'var(--space-4)' }}>
                <h3>Add New Shipping Address</h3>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="input-group">
                    <label htmlFor="ch-label">Label</label>
                    <select id="ch-label" className="input" value={addrLabel} onChange={e => setAddrLabel(e.target.value)} style={{ background: 'var(--bg-secondary)' }}>
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Shop">Shop</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label htmlFor="ch-name">Recipient Name</label>
                    <input type="text" id="ch-name" className="input" value={addrName} onChange={e => setAddrName(e.target.value)} required />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="ch-phone">Phone Number</label>
                  <input type="tel" id="ch-phone" className="input" value={addrPhone} onChange={e => setAddrPhone(e.target.value)} required />
                </div>

                <div className="input-group">
                  <label htmlFor="ch-line1">Address Line 1</label>
                  <input type="text" id="ch-line1" className="input" placeholder="Street, block, building" value={addrLine1} onChange={e => setAddrLine1(e.target.value)} required />
                </div>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                  <input type="text" className="input" placeholder="City" value={addrCity} onChange={e => setAddrCity(e.target.value)} required />
                  <input type="text" className="input" placeholder="State" value={addrState} onChange={e => setAddrState(e.target.value)} required />
                  <input type="text" className="input" placeholder="Pincode" value={addrPincode} onChange={e => setAddrPincode(e.target.value)} required />
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingAddress}>
                    {savingAddress ? 'Saving...' : 'Save & Select'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddAddress(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="addresses-selector-list flex flex-col gap-3" style={{ marginTop: 'var(--space-4)' }}>
                {user.addresses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <p className="text-secondary" style={{ marginBottom: 'var(--space-4)' }}>No shipping address found.</p>
                    <button className="btn btn-primary" onClick={() => setShowAddAddress(true)}>
                      Add Shipping Address
                    </button>
                  </div>
                ) : (
                  user.addresses.map((addr, idx) => (
                    <div
                      key={idx}
                      className={`address-selector-item card-glass flex items-start gap-4 ${selectedAddressIndex === idx ? 'selected-address' : ''}`}
                      onClick={() => setSelectedAddressIndex(idx)}
                      style={{ cursor: 'pointer', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}
                    >
                      <input
                        type="radio"
                        name="checkout_address"
                        checked={selectedAddressIndex === idx}
                        onChange={() => setSelectedAddressIndex(idx)}
                        style={{ marginTop: '4px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <strong style={{ fontSize: 'var(--text-sm)' }}>{addr.full_name}</strong>
                          <span className="badge badge-primary" style={{ fontSize: '9px', padding: '0 6px' }}>{addr.label}</span>
                          {addr.is_default && <span className="badge badge-success" style={{ fontSize: '9px', padding: '0 6px' }}>Default</span>}
                        </div>
                        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                          {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}, {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: '2px' }}>📞 {addr.phone}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Delivery instruction */}
          <div className="card checkout-section flex flex-col gap-3">
            <h2>Delivery Instructions</h2>
            <div className="input-group">
              <label htmlFor="ch-note">Instructions note for delivery staff (Optional)</label>
              <textarea
                id="ch-note"
                className="input"
                rows={3}
                placeholder="e.g. Leave it with security guard, Call before delivery..."
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right: Selected Items Preview & Totals Block */}
        <div className="flex flex-col gap-6">
          
          {/* Items Summary */}
          <div className="card checkout-section flex flex-col gap-4">
            <h2>Order Details</h2>
            <div className="checkout-items-preview flex flex-col gap-3" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {checkoutItems.map(item => (
                <div key={item.product_id} className="flex justify-between items-center" style={{ fontSize: 'var(--text-sm)' }}>
                  <span className="text-secondary" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product_title} <strong className="text-primary">x{item.quantity}</strong>
                  </span>
                  <span>₹{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="profile-dropdown-divider" style={{ background: 'var(--border-subtle)', height: '1px' }} />
            
            <div className="flex justify-between" style={{ fontWeight: 600 }}>
              <span className="text-secondary">Subtotal</span>
              <span>₹{cart.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ fontWeight: 600 }}>
              <span className="text-secondary">Shipping</span>
              <span className="text-success">Free Delivery</span>
            </div>
            <div className="profile-dropdown-divider" style={{ background: 'var(--border-strong)', height: '1px' }} />
            
            <div className="flex justify-between" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              <span>Total Price</span>
              <span className="text-gradient">₹{cart.subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method COD */}
          <div className="card checkout-section flex flex-col gap-4">
            <h2>Payment Method</h2>
            <div className="cod-selection-box flex items-center gap-3 card-glass" style={{ border: '2px solid var(--color-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '1.5rem' }}>💵</span>
              <div>
                <strong>Cash on Delivery (COD)</strong>
                <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>Pay cash upon delivery. COD option is free.</p>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={handlePlaceOrder}
              disabled={submittingOrder || selectedAddressIndex === null}
              style={{ width: '100%' }}
            >
              {submittingOrder ? 'Placing Order...' : 'Confirm & Place COD Order'}
            </button>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
export default CheckoutPage;

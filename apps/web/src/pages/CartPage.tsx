import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../utils/api';
import { guestCartDB } from '../utils/indexeddb';
import type { RootState } from '../store/store';
import {
  setCart,
  clearCart,
  showToast,
  updateGuestItem,
  removeGuestItem,
} from '@raj-enterprises/shared-redux';
import PageTransition from '../components/ui/PageTransition';
import './CartPage.css';

interface CartPageProps {
  onOpenLogin: () => void;
}

export function CartPage({ onOpenLogin }: CartPageProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { cart, guestItems } = useSelector((state: RootState) => state.cart);
  const [guestCartDetailed, setGuestCartDetailed] = useState<any[]>([]);
  const [loadingGuest, setLoadingGuest] = useState(false);

  // Fetch detailed product info for guest cart items (since Dexie only stores product_id and qty)
  const fetchGuestCartDetails = async () => {
    if (isAuthenticated || guestItems.length === 0) return;
    setLoadingGuest(true);
    try {
      const detailedItems = [];
      for (const item of guestItems) {
        try {
          const product = await api.products.get(item.product_id);
          detailedItems.push({
            product_id: product.id,
            product_title: product.title,
            product_image: product.images && product.images.length > 0 ? product.images[0] : undefined,
            price: product.price,
            quantity: item.quantity,
            selected: item.selected,
            in_stock: product.in_stock,
            max_quantity: 10, // Stock cap or custom limit
            subtotal: product.price * item.quantity,
          });
        } catch {
          // If product not found/inactive, clean it up
          await guestCartDB.removeItem(item.product_id);
          dispatch(removeGuestItem(item.product_id));
        }
      }
      setGuestCartDetailed(detailedItems);
    } catch {
      dispatch(showToast({ message: 'Failed to load guest cart details', type: 'error' }));
    } finally {
      setLoadingGuest(false);
    }
  };

  useEffect(() => {
    fetchGuestCartDetails();
  }, [guestItems, isAuthenticated]);

  const items = isAuthenticated ? cart?.items || [] : guestCartDetailed;

  // Selected summaries
  const selectedItems = items.filter(i => i.selected);
  const selectedCount = selectedItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = selectedItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleUpdateQuantity = async (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }

    if (isAuthenticated) {
      try {
        const res = await api.cart.updateItem(productId, { quantity: newQty });
        dispatch(setCart(res));
      } catch (err: any) {
        dispatch(showToast({ message: err.detail || 'Failed to update quantity', type: 'error' }));
      }
    } else {
      try {
        await guestCartDB.updateItem(productId, { quantity: newQty });
        dispatch(updateGuestItem({ product_id: productId, quantity: newQty }));
      } catch {
        dispatch(showToast({ message: 'Failed to update guest cart', type: 'error' }));
      }
    }
  };

  const handleToggleSelect = async (productId: string, currentSelected: boolean) => {
    const newSelected = !currentSelected;

    if (isAuthenticated) {
      try {
        const res = await api.cart.updateItem(productId, { selected: newSelected });
        dispatch(setCart(res));
      } catch (err: any) {
        dispatch(showToast({ message: 'Failed to toggle selection', type: 'error' }));
      }
    } else {
      try {
        await guestCartDB.updateItem(productId, { selected: newSelected });
        dispatch(updateGuestItem({ product_id: productId, selected: newSelected }));
      } catch {
        dispatch(showToast({ message: 'Failed to toggle guest cart selection', type: 'error' }));
      }
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this item from your cart?')) return;

    if (isAuthenticated) {
      try {
        const res = await api.cart.removeItem(productId);
        dispatch(setCart(res));
        dispatch(showToast({ message: 'Item removed from cart.', type: 'success' }));
      } catch (err: any) {
        dispatch(showToast({ message: 'Failed to remove item', type: 'error' }));
      }
    } else {
      try {
        await guestCartDB.removeItem(productId);
        dispatch(removeGuestItem(productId));
        dispatch(showToast({ message: 'Item removed from guest cart.', type: 'success' }));
      } catch {
        dispatch(showToast({ message: 'Failed to remove guest item', type: 'error' }));
      }
    }
  };

  const handleClearCart = async () => {
    if (!confirm('Are you sure you want to clear your entire cart?')) return;

    if (isAuthenticated) {
      try {
        await api.cart.clear();
        dispatch(clearCart());
        dispatch(showToast({ message: 'Cart cleared successfully.', type: 'success' }));
      } catch {
        dispatch(showToast({ message: 'Failed to clear cart.', type: 'error' }));
      }
    } else {
      try {
        await guestCartDB.clear();
        dispatch(clearCart());
        dispatch(showToast({ message: 'Guest cart cleared.', type: 'success' }));
      } catch {
        dispatch(showToast({ message: 'Failed to clear guest cart.', type: 'error' }));
      }
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      dispatch(showToast({ message: 'Please Sign In to proceed with your checkout.', type: 'info' }));
      onOpenLogin();
      return;
    }
    navigate('/checkout');
  };

  return (
    <PageTransition className="container cart-page" id="cart-page">
      <h1 className="page-title text-gradient">Your Shopping Cart</h1>

      {loadingGuest ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>Loading cart contents...</p>
      ) : items.length === 0 ? (
        <div className="flex justify-center items-center flex-col card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <span style={{ fontSize: '3rem' }}>🛒</span>
          <h2 style={{ marginTop: 'var(--space-4)' }}>Your cart is empty</h2>
          <p className="text-secondary" style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            Looks like you haven't added any industrial products, hardware, or chemicals to your cart yet.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => navigate('/')}>
            Explore Products
          </button>
        </div>
      ) : (
        <div className="cart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
          {/* Items List */}
          <div className="cart-items flex flex-col gap-4">
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
              <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                Showing {items.length} item{items.length > 1 ? 's' : ''}
              </span>
              <button
                className="btn btn-tertiary btn-sm"
                onClick={handleClearCart}
                style={{ color: 'var(--color-error)', border: 'none', background: 'transparent' }}
              >
                Clear Cart
              </button>
            </div>

            {items.map((item: any) => (
              <div
                key={item.product_id}
                className="cart-item card flex items-center gap-4"
                style={{ padding: 'var(--space-4)', background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}
              >
                {/* Image */}
                <div style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-glass-hover)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_title} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>📦</span>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.product_title}
                  </h4>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary-light)', fontWeight: 700, marginTop: 'var(--space-1)' }}>
                    ₹{item.price ? item.price.toFixed(2) : '0.00'}
                  </p>
                </div>

                {/* Stepper */}
                <div className="quantity-stepper" style={{ flexShrink: 0, display: 'flex', gap: '8px' }}>
                  <button className="stepper-btn" onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}>-</button>
                  <span className="stepper-qty">{item.quantity}</span>
                  <button className="stepper-btn" onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}>+</button>
                </div>

                {/* Item Total & Remove */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                    ₹{((item.price || 0) * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item.product_id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 'var(--text-xs)' }}
                    title="Remove item"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="cart-summary card-glass" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)', height: 'fit-content', position: 'sticky', top: '100px' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-3)' }}>
              Order Summary
            </h3>

            <div className="flex flex-col gap-3" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <div className="flex justify-between">
                <span>Subtotal ({selectedCount} items)</span>
                <span className="text-primary font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Freight & Shipping</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Calculated at Checkout</span>
              </div>

              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />

              <div className="flex justify-between" style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                <span>Total Amount</span>
                <span className="text-gradient" style={{ fontSize: 'var(--text-xl)' }}>₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 'var(--space-6)', justifyContent: 'center' }}
              onClick={handleCheckout}
            >
              {isAuthenticated ? 'Proceed to Checkout' : 'Sign In & Checkout'}
            </button>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
export default CartPage;

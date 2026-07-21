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

  // Fetch detailed product info for guest cart items
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
            category_name: product.category_name,
            price: product.price,
            quantity: item.quantity,
            selected: item.selected !== false,
            in_stock: product.in_stock,
            max_quantity: 10,
            subtotal: product.price * item.quantity,
          });
        } catch {
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

  // Selected items calculation
  const selectedItems = items.filter(i => i.selected !== false);
  const selectedCount = selectedItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = selectedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const allSelected = items.length > 0 && items.every(i => i.selected !== false);

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

    if (isAuthenticated && cart) {
      const updatedItems = cart.items.map(i =>
        i.product_id === productId ? { ...i, selected: newSelected } : i
      );
      const selected_items = updatedItems.filter(i => i.selected);
      const updatedCart = {
        ...cart,
        items: updatedItems,
        selected_items_count: selected_items.length,
        subtotal: selected_items.reduce((acc, curr) => acc + curr.subtotal, 0),
      };
      // Instant optimistic UI update
      dispatch(setCart(updatedCart));

      try {
        const res = await api.cart.updateItem(productId, { selected: newSelected });
        dispatch(setCart(res));
      } catch (err: any) {
        dispatch(showToast({ message: 'Failed to toggle selection', type: 'error' }));
      }
    } else {
      setGuestCartDetailed(prev =>
        prev.map(i => (i.product_id === productId ? { ...i, selected: newSelected } : i))
      );
      dispatch(updateGuestItem({ product_id: productId, selected: newSelected }));
      guestCartDB.updateItem(productId, { selected: newSelected }).catch(() => {});
    }
  };

  const handleToggleSelectAll = async () => {
    const targetState = !allSelected;

    if (isAuthenticated && cart) {
      const updatedItems = cart.items.map(i => ({ ...i, selected: targetState }));
      const selected_items = updatedItems.filter(i => i.selected);
      const updatedCart = {
        ...cart,
        items: updatedItems,
        selected_items_count: selected_items.length,
        subtotal: selected_items.reduce((acc, curr) => acc + curr.subtotal, 0),
      };
      // Instant optimistic UI update
      dispatch(setCart(updatedCart));

      try {
        await Promise.all(
          items.map(item => api.cart.updateItem(item.product_id, { selected: targetState }))
        );
      } catch {
        dispatch(showToast({ message: 'Failed to update selection', type: 'error' }));
      }
    } else {
      setGuestCartDetailed(prev => prev.map(i => ({ ...i, selected: targetState })));
      for (const item of items) {
        dispatch(updateGuestItem({ product_id: item.product_id, selected: targetState }));
        guestCartDB.updateItem(item.product_id, { selected: targetState }).catch(() => {});
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
    if (selectedCount === 0) {
      dispatch(showToast({ message: 'Please select at least one item to proceed to checkout.', type: 'warning' }));
      return;
    }
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
        <div className="flex justify-center items-center flex-col card-glass empty-cart-box" style={{ padding: 'var(--space-12)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <span style={{ fontSize: '3rem' }}>🛒</span>
          <h2 style={{ marginTop: 'var(--space-4)' }}>Your cart is empty</h2>
          <p className="text-secondary" style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            Looks like you haven't added any paints, hardware parts, or chemical solutions to your cart yet.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => navigate('/')}>
            Explore Products
          </button>
        </div>
      ) : (
        <div className="cart-grid">
          {/* Left Column: Cart Items List */}
          <div className="cart-items-container">
            {/* Action Bar / Select All */}
            <div className="cart-header-actions card-glass flex justify-between items-center">
              <label className="select-all-label flex items-center gap-3">
                <input
                  type="checkbox"
                  className="cart-checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                />
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  Select All ({items.length} item{items.length > 1 ? 's' : ''})
                </span>
              </label>

              <button className="clear-cart-btn" onClick={handleClearCart}>
                Clear All
              </button>
            </div>

            {/* Item Rows */}
            <div className="cart-items-list flex flex-col gap-4" style={{ marginTop: 'var(--space-4)' }}>
              {items.map((item: any) => {
                const isSelected = item.selected !== false;

                return (
                  <div
                    key={item.product_id}
                    className={`cart-item card-glass ${isSelected ? 'item-selected' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className="cart-item-checkbox">
                      <input
                        type="checkbox"
                        className="cart-checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.product_id, isSelected)}
                      />
                    </div>

                    {/* Image */}
                    <div className="cart-item-img-box">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_title}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.5rem' }}>📦</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="cart-item-info">
                      <h4 className="cart-item-title">{item.product_title}</h4>
                      {item.category_name && (
                        <span className="cart-item-category">{item.category_name}</span>
                      )}
                      <div className="cart-item-unit-price">₹{(item.price || 0).toFixed(2)}</div>
                    </div>

                    {/* Stepper */}
                    <div className="cart-item-stepper">
                      <div className="quantity-stepper flex items-center gap-2 card-glass" style={{ padding: '2px 4px' }}>
                        <button className="stepper-btn" onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}>-</button>
                        <span className="stepper-qty">{item.quantity}</span>
                        <button className="stepper-btn" onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}>+</button>
                      </div>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="cart-item-subtotal-column">
                      <span className="cart-item-subtotal-price">
                        ₹{((item.price || 0) * item.quantity).toFixed(2)}
                      </span>
                      <button
                        className="remove-item-btn"
                        onClick={() => handleRemoveItem(item.product_id)}
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="cart-summary-card card-glass">
            <h3 className="summary-title">Order Summary</h3>

            <div className="summary-details flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-secondary">Selected Items</span>
                <span className="font-semibold text-primary">{selectedCount} item{selectedCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Subtotal</span>
                <span className="font-semibold text-primary">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Estimated Freight</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Calculated at Checkout</span>
              </div>

              <div className="summary-divider" />

              <div className="flex justify-between items-baseline">
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Total Payable</span>
                <span className="text-gradient" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg checkout-btn"
              onClick={handleCheckout}
              disabled={selectedCount === 0}
            >
              {isAuthenticated ? 'Proceed to Checkout' : 'Sign In & Checkout'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Mobile Checkout Sticky Bar */}
      {items.length > 0 && (
        <div className="mobile-cart-sticky-bar card-glass">
          <div className="mobile-sticky-info">
            <span className="text-tertiary" style={{ fontSize: '0.75rem' }}>Total ({selectedCount} selected)</span>
            <span className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              ₹{subtotal.toFixed(2)}
            </span>
          </div>
          <button
            className="btn btn-primary mobile-sticky-checkout-btn"
            onClick={handleCheckout}
            disabled={selectedCount === 0}
          >
            {isAuthenticated ? 'Checkout' : 'Sign In & Checkout'}
          </button>
        </div>
      )}
    </PageTransition>
  );
}

export default CartPage;

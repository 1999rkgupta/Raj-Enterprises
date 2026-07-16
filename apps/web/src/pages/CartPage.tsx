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
    <div className="container cart-page animate-fade-in" id="cart-page">
      <h1 className="page-title text-gradient">Your Shopping Cart</h1>

      {loadingGuest ? (
        <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>Loading cart contents...</p>
      ) : items.length === 0 ? (
        <div className="flex justify-center items-center flex-col card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <span style={{ fontSize: '3rem' }}>🛒</span>
          <h2 style={{ marginTop: 'var(--space-4)' }}>Your cart is empty</h2>
          <p className="text-secondary" style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            Looks like you haven't added anything to your cart yet. Head back to our shop to explore our premium coatings.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-6)' }} onClick={() => navigate('/')}>
            Browse Shop
          </button>
        </div>
      ) : (
        <div className="cart-grid" style={{ marginTop: 'var(--space-6)' }}>
          {/* Left: Items List */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                {items.length} unique products in cart
              </span>
              <button className="btn btn-secondary btn-sm" onClick={handleClearCart}>
                Clear Cart
              </button>
            </div>

            <div className="cart-items-list flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.product_id} className="cart-item card-glass flex items-center justify-between gap-4">
                  {/* Select Checkbox */}
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => handleToggleSelect(item.product_id, item.selected)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />

                  {/* Image */}
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_title} className="cart-item-image" />
                  ) : (
                    <div className="cart-item-placeholder flex justify-center items-center">🎨</div>
                  )}

                  {/* Title & Price */}
                  <div className="cart-item-details" style={{ flex: 1 }}>
                    <h3 className="cart-item-title">{item.product_title}</h3>
                    <span className="cart-item-price text-secondary">₹{item.price.toFixed(2)}</span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="quantity-stepper flex items-center gap-2 card-glass" style={{ padding: '2px' }}>
                    <button className="stepper-btn" onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}>-</button>
                    <span className="stepper-qty">{item.quantity}</span>
                    <button className="stepper-btn" onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}>+</button>
                  </div>

                  {/* Item Subtotal */}
                  <span className="cart-item-subtotal">₹{item.subtotal.toFixed(2)}</span>

                  {/* Delete Button */}
                  <button className="btn btn-secondary btn-icon btn-sm remove-item-btn" onClick={() => handleRemoveItem(item.product_id)} title="Remove Item">
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Summary Box */}
          <div className="card cart-summary-card flex flex-col gap-6">
            <h2>Order Summary</h2>
            
            <div className="summary-details flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-secondary">Selected Items ({selectedCount})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Shipping</span>
                <span className="badge badge-success">Free Delivery</span>
              </div>
              <div className="profile-dropdown-divider" style={{ background: 'var(--border-strong)', height: '1px' }} />
              <div className="flex justify-between" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                <span>Subtotal</span>
                <span className="text-gradient">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {!isAuthenticated && (
              <p className="text-warning" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
                ⚠️ You are in Guest Mode. Please Sign In to complete checkout.
              </p>
            )}

            <button
              className="btn btn-primary btn-lg"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
              style={{ width: '100%' }}
            >
              {isAuthenticated ? 'Proceed to Checkout' : 'Sign In & Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default CartPage;

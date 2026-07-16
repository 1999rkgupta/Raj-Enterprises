import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { Product } from '@raj-enterprises/shared-types';
import type { RootState } from '../../store/store';
import {
  toggleWishlistItem,
  showToast,
  setCart,
  addGuestItem,
  updateGuestItem,
} from '@raj-enterprises/shared-redux';
import { api } from '../../utils/api';
import { guestCartDB } from '../../utils/indexeddb';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onOpenLogin?: () => void;
}

export function ProductCard({ product, onOpenLogin }: ProductCardProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { productIds: wishlistedIds } = useSelector((state: RootState) => state.wishlist);
  const { cart, guestItems } = useSelector((state: RootState) => state.cart);

  const isWishlisted = wishlistedIds.includes(product.id);

  // Check if item is already in cart
  const cartItem = isAuthenticated
    ? cart?.items.find(i => i.product_id === product.id)
    : guestItems.find(i => i.product_id === product.id);

  const cartQuantity = cartItem?.quantity || 0;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      if (onOpenLogin) onOpenLogin();
      return;
    }

    try {
      const res = await api.wishlist.toggle(product.id);
      dispatch(toggleWishlistItem(product.id));
      dispatch(showToast({
        message: res.action === 'added' ? 'Added to wishlist!' : 'Removed from wishlist.',
        type: 'success',
      }));
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to toggle wishlist', type: 'error' }));
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product.in_stock) {
      dispatch(showToast({ message: 'Product is out of stock.', type: 'warning' }));
      return;
    }

    if (isAuthenticated) {
      try {
        const res = await api.cart.addItem({ product_id: product.id, quantity: 1 });
        dispatch(setCart(res));
        dispatch(showToast({ message: 'Added to cart!', type: 'success' }));
      } catch (err: any) {
        dispatch(showToast({ message: err.detail || 'Failed to add to cart', type: 'error' }));
      }
    } else {
      // Guest IndexedDB cart
      try {
        await guestCartDB.addItem(product.id, 1);
        dispatch(addGuestItem({ product_id: product.id, quantity: 1 }));
        dispatch(showToast({ message: 'Added to guest cart!', type: 'success' }));
      } catch (err: any) {
        dispatch(showToast({ message: err.message || 'Cart is full.', type: 'error' }));
      }
    }
  };

  const handleUpdateQuantity = async (e: React.MouseEvent, newQty: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (newQty < 0) return;

    if (isAuthenticated) {
      try {
        const res = await api.cart.updateItem(product.id, { quantity: newQty });
        dispatch(setCart(res));
      } catch (err: any) {
        dispatch(showToast({ message: err.detail || 'Failed to update quantity', type: 'error' }));
      }
    } else {
      try {
        await guestCartDB.updateItem(product.id, { quantity: newQty });
        dispatch(updateGuestItem({ product_id: product.id, quantity: newQty }));
      } catch (err: any) {
        dispatch(showToast({ message: 'Failed to update guest cart', type: 'error' }));
      }
    }
  };

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product.in_stock) return;

    // Add to cart if not present
    if (cartQuantity === 0) {
      if (isAuthenticated) {
        try {
          const res = await api.cart.addItem({ product_id: product.id, quantity: 1 });
          dispatch(setCart(res));
        } catch (err: any) {
          dispatch(showToast({ message: err.detail || 'Checkout failed', type: 'error' }));
          return;
        }
      } else {
        try {
          await guestCartDB.addItem(product.id, 1);
          dispatch(addGuestItem({ product_id: product.id, quantity: 1 }));
        } catch (err: any) {
          dispatch(showToast({ message: err.message || 'Cart is full', type: 'error' }));
          return;
        }
      }
    }

    navigate('/cart');
  };

  return (
    <Link to={`/product/${product.id}`} className="product-card card animate-fade-in">
      <div className="product-card-image-wrapper">
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.title} className="product-card-image" loading="lazy" />
        ) : (
          <div className="product-card-placeholder flex justify-center items-center">🎨</div>
        )}
        
        {/* Wishlist Toggle Button */}
        <button
          className={`wishlist-toggle-btn ${isWishlisted ? 'wishlisted' : ''}`}
          onClick={handleWishlistToggle}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill={isWishlisted ? 'var(--color-secondary)' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Stock Status Badges */}
        <div className="product-card-badges">
          {!product.in_stock ? (
            <span className="badge badge-danger">Out of Stock</span>
          ) : product.is_low_stock ? (
            <span className="badge badge-warning">Few Left</span>
          ) : null}
        </div>
      </div>

      <div className="product-card-info flex flex-col gap-2">
        <h3 className="product-card-title">{product.title}</h3>
        <p className="product-card-desc text-secondary">{product.description}</p>
        
        <div className="product-card-footer flex justify-between items-center" style={{ marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
          <span className="product-card-price">₹{product.price.toFixed(2)}</span>

          {product.in_stock ? (
            <div className="product-card-actions flex gap-2" onClick={e => e.preventDefault()}>
              {cartQuantity > 0 ? (
                <div className="quantity-stepper flex items-center gap-2 card-glass">
                  <button className="stepper-btn" onClick={e => handleUpdateQuantity(e, cartQuantity - 1)}>-</button>
                  <span className="stepper-qty">{cartQuantity}</span>
                  <button className="stepper-btn" onClick={e => handleUpdateQuantity(e, cartQuantity + 1)}>+</button>
                </div>
              ) : (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={handleAddToCart}>
                    Add to Cart
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleBuyNow}>
                    Buy Now
                  </button>
                </>
              )}
            </div>
          ) : (
            <span className="text-tertiary" style={{ fontSize: 'var(--text-xs)' }}>Unavailable</span>
          )}
        </div>
      </div>
    </Link>
  );
}
export default ProductCard;

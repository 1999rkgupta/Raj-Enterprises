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
  removeGuestItem,
} from '@raj-enterprises/shared-redux';
import { api } from '../../utils/api';
import { guestCartDB } from '../../utils/indexeddb';
import { motion } from 'framer-motion';
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
      if (cart) {
        const existingItem = cart.items.find(i => i.product_id === product.id);
        let updatedItems;
        if (existingItem) {
          updatedItems = cart.items.map(i =>
            i.product_id === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i
          );
        } else {
          updatedItems = [
            ...cart.items,
            {
              product_id: product.id,
              product_title: product.title,
              product_image: product.images && product.images.length > 0 ? product.images[0] : undefined,
              price: product.price,
              quantity: 1,
              selected: true,
              in_stock: true,
              max_quantity: 10,
              subtotal: product.price,
            },
          ];
        }
        const selected_items = updatedItems.filter(i => i.selected);
        dispatch(setCart({
          ...cart,
          items: updatedItems,
          total_items: updatedItems.length,
          selected_items_count: selected_items.length,
          subtotal: selected_items.reduce((acc, curr) => acc + curr.subtotal, 0),
        }));
      }
      dispatch(showToast({ message: 'Added to cart!', type: 'success' }));

      try {
        const res = await api.cart.addItem({ product_id: product.id, quantity: 1 });
        dispatch(setCart(res));
      } catch (err: any) {
        dispatch(showToast({ message: err.detail || 'Failed to add to cart', type: 'error' }));
      }
    } else {
      dispatch(addGuestItem({ product_id: product.id, quantity: 1 }));
      dispatch(showToast({ message: 'Added to guest cart!', type: 'success' }));
      guestCartDB.addItem(product.id, 1).catch(() => {});
    }
  };

  const handleUpdateQuantity = async (e: React.MouseEvent, newQty: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (newQty < 0) return;

    if (isAuthenticated) {
      if (cart) {
        let updatedItems;
        if (newQty === 0) {
          updatedItems = cart.items.filter(i => i.product_id !== product.id);
        } else {
          updatedItems = cart.items.map(i =>
            i.product_id === product.id ? { ...i, quantity: newQty, subtotal: newQty * i.price } : i
          );
        }
        const selected_items = updatedItems.filter(i => i.selected);
        dispatch(setCart({
          ...cart,
          items: updatedItems,
          total_items: updatedItems.length,
          selected_items_count: selected_items.length,
          subtotal: selected_items.reduce((acc, curr) => acc + curr.subtotal, 0),
        }));
      }

      try {
        const res = await api.cart.updateItem(product.id, { quantity: newQty });
        dispatch(setCart(res));
      } catch (err: any) {
        dispatch(showToast({ message: err.detail || 'Failed to update quantity', type: 'error' }));
      }
    } else {
      if (newQty === 0) {
        dispatch(removeGuestItem(product.id));
        guestCartDB.removeItem(product.id).catch(() => {});
      } else {
        dispatch(updateGuestItem({ product_id: product.id, quantity: newQty }));
        guestCartDB.updateItem(product.id, { quantity: newQty }).catch(() => {});
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
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ height: '100%', width: '100%', display: 'flex' }}
    >
      <Link to={`/product/${product.id}`} className="product-card card" style={{ width: '100%' }}>
        <div className="product-card-image-wrapper">
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.title} className="product-card-image" loading="lazy" />
          ) : (
            <div className="product-card-placeholder flex justify-center items-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
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

        <div className="product-card-info">
          <h3 className="product-card-title">{product.title}</h3>
          <p className="product-card-desc">{product.description}</p>
          
          <div className="product-card-footer">
            <div className="product-card-price-row">
              <span className="product-card-price">₹{product.price.toFixed(2)}</span>
              {cartQuantity > 0 && (
                <span className="cart-badge-qty">{cartQuantity} in cart</span>
              )}
            </div>

            {product.in_stock ? (
              <div className="product-card-actions" onClick={e => e.preventDefault()}>
                {cartQuantity > 0 ? (
                  <div className="quantity-stepper">
                    <button className="stepper-btn" onClick={e => handleUpdateQuantity(e, cartQuantity - 1)} aria-label="Decrease quantity">-</button>
                    <span className="stepper-qty">{cartQuantity}</span>
                    <button className="stepper-btn" onClick={e => handleUpdateQuantity(e, cartQuantity + 1)} aria-label="Increase quantity">+</button>
                  </div>
                ) : (
                  <div className="product-card-btn-group">
                    <button className="btn btn-secondary btn-sm btn-add-cart" onClick={handleAddToCart}>
                      Add to Cart
                    </button>
                    <button className="btn btn-primary btn-sm btn-buy-now" onClick={handleBuyNow}>
                      Buy Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-tertiary out-of-stock-text">Unavailable</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
export default ProductCard;

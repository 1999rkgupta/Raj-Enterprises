import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../utils/api';
import { guestCartDB } from '../utils/indexeddb';
import type { Product } from '@raj-enterprises/shared-types';
import type { RootState } from '../store/store';
import {
  toggleWishlistItem,
  showToast,
  setCart,
  addGuestItem,
  updateGuestItem,
} from '@raj-enterprises/shared-redux';
import './ProductPage.css';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { productIds: wishlistedIds } = useSelector((state: RootState) => state.wishlist);
  const { cart, guestItems } = useSelector((state: RootState) => state.cart);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const isWishlisted = product ? wishlistedIds.includes(product.id) : false;

  // Retrieve item quantity in cart
  const cartItem = product
    ? isAuthenticated
      ? cart?.items.find(i => i.product_id === product.id)
      : guestItems.find(i => i.product_id === product.id)
    : null;

  const currentCartQty = cartItem?.quantity || 0;

  const fetchProduct = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.products.get(id);
      setProduct(res);
      if (res.images && res.images.length > 0) {
        setSelectedImage(res.images[0]);
      }
    } catch (err: any) {
      dispatch(showToast({ message: 'Product not found.', type: 'error' }));
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="container flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <p className="text-secondary">Loading product details...</p>
      </div>
    );
  }

  if (!product) return null;

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      dispatch(showToast({ message: 'Please sign in to manage wishlist.', type: 'info' }));
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
      dispatch(showToast({ message: 'Failed to update wishlist.', type: 'error' }));
    }
  };

  const handleAddToCart = async () => {
    if (!product.in_stock) return;
    setAddingToCart(true);
    
    // Capped by stock constraints
    const targetQty = currentCartQty + qty;

    if (isAuthenticated) {
      try {
        const res = await api.cart.addItem({ product_id: product.id, quantity: qty });
        dispatch(setCart(res));
        dispatch(showToast({ message: 'Added to cart!', type: 'success' }));
      } catch (err: any) {
        dispatch(showToast({ message: err.detail || 'Failed to add to cart', type: 'error' }));
      } finally {
        setAddingToCart(false);
      }
    } else {
      try {
        await guestCartDB.addItem(product.id, qty);
        if (currentCartQty > 0) {
          dispatch(updateGuestItem({ product_id: product.id, quantity: targetQty }));
        } else {
          dispatch(addGuestItem({ product_id: product.id, quantity: qty }));
        }
        dispatch(showToast({ message: 'Added to guest cart!', type: 'success' }));
      } catch (err: any) {
        dispatch(showToast({ message: err.message || 'Cart full.', type: 'error' }));
      } finally {
        setAddingToCart(false);
      }
    }
  };

  const handleBuyNow = async () => {
    if (!product.in_stock) return;
    
    if (currentCartQty === 0) {
      if (isAuthenticated) {
        try {
          const res = await api.cart.addItem({ product_id: product.id, quantity: qty });
          dispatch(setCart(res));
        } catch (err: any) {
          dispatch(showToast({ message: err.detail || 'Add to cart failed', type: 'error' }));
          return;
        }
      } else {
        try {
          await guestCartDB.addItem(product.id, qty);
          dispatch(addGuestItem({ product_id: product.id, quantity: qty }));
        } catch (err: any) {
          dispatch(showToast({ message: err.message || 'Guest cart full', type: 'error' }));
          return;
        }
      }
    }
    navigate('/cart');
  };

  return (
    <div className="container product-detail-page animate-fade-in" id="product-detail-page">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs text-secondary" style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
        <Link to="/">Catalog</Link> &gt; <span>{product.category_name || 'Product'}</span>
      </nav>

      <div className="product-detail-grid">
        {/* Left Side: Images Gallery */}
        <div className="product-images-gallery flex flex-col gap-4">
          <div className="main-image-box card-glass flex justify-center items-center">
            {selectedImage ? (
              <img src={selectedImage} alt={product.title} className="main-product-image" />
            ) : (
              <div className="placeholder-icon">🎨</div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="thumbnails-row flex gap-3" style={{ overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumbnail-btn card-glass ${selectedImage === img ? 'active-thumb' : ''}`}
                  onClick={() => setSelectedImage(img)}
                >
                  <img src={img} alt={`${product.title} thumb ${idx}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details */}
        <div className="product-info-details card flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="badge badge-primary">{product.category_name || 'Paints'}</span>
              <h1 style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-3xl)' }}>{product.title}</h1>
            </div>

            {/* Wishlist toggle */}
            <button
              className={`details-wishlist-btn ${isWishlisted ? 'wishlisted' : ''}`}
              onClick={handleWishlistToggle}
              title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill={isWishlisted ? 'var(--color-secondary)' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          <div className="price-row flex items-baseline gap-2">
            <span className="detail-price">₹{product.price.toFixed(2)}</span>
            <span className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>Inclusive of all taxes</span>
          </div>

          {/* Stock Badging */}
          <div className="stock-status-section">
            {!product.in_stock ? (
              <span className="badge badge-danger" style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>Out of Stock</span>
            ) : product.is_low_stock ? (
              <span className="badge badge-warning" style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>⚠️ Only a few left in stock - Order Soon!</span>
            ) : (
              <span className="badge badge-success" style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>✓ In Stock</span>
            )}
          </div>

          <div className="description-section">
            <h3>Product Overview</h3>
            <p className="text-secondary" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              {product.description}
            </p>
          </div>

          {product.in_stock && (
            <div className="cart-checkout-actions flex flex-col gap-4" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
              <div className="stepper-row flex items-center gap-4">
                <span className="text-secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Quantity:</span>
                <div className="quantity-stepper flex items-center gap-3 card-glass" style={{ padding: '4px' }}>
                  <button className="stepper-btn" onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                  <span className="stepper-qty" style={{ fontSize: 'var(--text-base)', minWidth: '30px' }}>{qty}</span>
                  <button className="stepper-btn" onClick={() => setQty(qty + 1)}>+</button>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="btn btn-secondary" style={{ flex: 1, padding: 'var(--space-4)' }} onClick={handleAddToCart} disabled={addingToCart}>
                  {addingToCart ? 'Adding...' : 'Add to Cart'}
                </button>
                <button className="btn btn-primary" style={{ flex: 1, padding: 'var(--space-4)' }} onClick={handleBuyNow}>
                  Buy Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ProductPage;

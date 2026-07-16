import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../utils/api';
import type { RootState } from '../store/store';
import { showToast, setWishlist } from '@raj-enterprises/shared-redux';
import ProductCard from '../components/product/ProductCard';
import './WishlistPage.css';

interface WishlistItem {
  product_id: string;
  product_title: string;
  product_image?: string;
  price: number;
  in_stock: boolean;
  status: string;
}

export function WishlistPage() {
  const dispatch = useDispatch();
  const { productIds } = useSelector((state: RootState) => state.wishlist);

  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await api.wishlist.get();
      setWishlistItems(res.items);
      
      // Update redux state with latest wishlisted IDs
      const ids = res.items.map(i => i.product_id);
      dispatch(setWishlist(ids));
    } catch (err: any) {
      dispatch(showToast({ message: 'Failed to fetch wishlist.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [productIds.length]); // Refresh if IDs length changes

  return (
    <div className="container wishlist-page animate-fade-in" id="wishlist-page">
      <h1 className="page-title text-gradient" style={{ marginBottom: 'var(--space-6)' }}>Your Wishlist</h1>

      {loading ? (
        <div className="flex justify-center items-center" style={{ minHeight: '40vh' }}>
          <p className="text-secondary">Loading wishlist...</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="flex justify-center items-center flex-col card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>❤️</span>
          <h3 style={{ marginTop: 'var(--space-4)' }}>Your wishlist is empty</h3>
          <p className="text-secondary" style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            Keep track of coatings, primers, and tools you like by clicking the heart icon on cards.
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {wishlistItems.map((item) => {
            // Map WishlistItem shape back into Product shape for ProductCard compatibility
            const productPlaceholder = {
              id: item.product_id,
              title: item.product_title,
              description: 'Premium quality paint products.',
              category_id: '',
              images: item.product_image ? [item.product_image] : [],
              price: item.price,
              status: item.status,
              is_low_stock: false,
              in_stock: item.in_stock,
              created_at: '',
              updated_at: '',
            };
            return (
              <ProductCard key={item.product_id} product={productPlaceholder} />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;

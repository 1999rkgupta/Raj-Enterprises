import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { toggleWishlistItem, showToast, setCart, addGuestItem } from '@raj-enterprises/shared-redux';
import type { RootState } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80';

export default function WishlistScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const wishlistProductIds = useSelector((state: RootState) => state.wishlist.productIds || []);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlistProducts = async () => {
    if (wishlistProductIds.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const items: any[] = [];
      for (const id of wishlistProductIds) {
        const product = await api.products.get(id);
        if (product) items.push(product);
      }
      setProducts(items);
    } catch {
      console.warn('Failed to resolve wishlist items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistProducts();
  }, [wishlistProductIds.length]);

  const handleRemoveFromWishlist = (productId: string) => {
    dispatch(toggleWishlistItem(productId));
    dispatch(showToast({ message: 'Removed from wishlist', type: 'info' }));
  };

  const handleAddToCart = async (productId: string) => {
    try {
      if (user) {
        const updatedCart = await api.cart.addItem({ product_id: productId, quantity: 1 });
        dispatch(setCart(updatedCart));
      } else {
        dispatch(addGuestItem({ product_id: productId, quantity: 1 }));
      }
      dispatch(showToast({ message: 'Moved to shopping cart!', type: 'success' }));
      navigation.navigate('Cart');
    } catch {
      dispatch(showToast({ message: 'Failed to update cart.', type: 'error' }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCentering}>
        <LoadingSpinner message="Fetching saved wishlist..." size="large" color="#EC4899" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 48 }}>💖</Text>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtitle}>Explore wholesale products and save your favorites here.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseBtnText}>Explore Storefront</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const imageUrl = item.images && item.images.length > 0 ? item.images[0] : DEFAULT_IMAGE;
            const isOutOfStock = item.stock_count <= 0;

            return (
              <View style={styles.card}>
                <Image source={{ uri: imageUrl }} style={styles.thumbImage} resizeMode="cover" />
                <View style={styles.detailsCol}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.sku}>SKU: {item.sku}</Text>
                  <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.cartBtn, isOutOfStock && styles.disabledBtn]}
                      disabled={isOutOfStock}
                      onPress={() => handleAddToCart(item.id)}
                    >
                      <Text style={styles.cartBtnText}>{isOutOfStock ? 'Sold Out' : '+ Move to Cart'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveFromWishlist(item.id)}
                    >
                      <Text style={styles.removeBtnText}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingCentering: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  browseBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  thumbImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    marginRight: 12,
  },
  detailsCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sku: {
    color: '#64748B',
    fontSize: 11,
  },
  price: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  cartBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disabledBtn: {
    backgroundColor: '#334155',
  },
  cartBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

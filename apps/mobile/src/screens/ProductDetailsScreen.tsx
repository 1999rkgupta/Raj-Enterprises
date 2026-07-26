import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { showToast, setCart, addGuestItem } from '@raj-enterprises/shared-redux';
import type { RootState } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80';

export default function ProductDetailsScreen({ route, navigation }: any) {
  const { productId } = route.params;
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [product, setProduct] = useState<any | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchProduct = async () => {
    try {
      const res = await api.products.get(productId);
      setProduct(res);
    } catch {
      dispatch(showToast({ message: 'Failed to load product details.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;
    setSubmitting(true);
    try {
      if (user) {
        const updatedCart = await api.cart.addItem({ product_id: productId, quantity: qty });
        dispatch(setCart(updatedCart));
      } else {
        dispatch(addGuestItem({ product_id: productId, quantity: qty }));
      }
      dispatch(showToast({ message: 'Added to cart!', type: 'success' }));
      navigation.navigate('Cart');
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Could not update cart.', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCentering}>
        <LoadingSpinner message="Loading product details..." size="large" color="#6366F1" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingCentering}>
        <Text style={{ color: '#F8FAFC' }}>Product details not found.</Text>
      </View>
    );
  }

  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : DEFAULT_IMAGE;
  const isOutOfStock = product.stock_count <= 0;
  const isLowStock = product.stock_count > 0 && product.stock_count <= product.low_stock_threshold;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* High Resolution Product Header Image */}
        <View style={styles.imageHeaderContainer}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          {isOutOfStock ? (
            <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.badgeText}>OUT OF STOCK</Text>
            </View>
          ) : isLowStock ? (
            <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.badgeText}>LOW STOCK ({product.stock_count} units left)</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.badgeText}>IN STOCK</Text>
            </View>
          )}
        </View>

        {/* Content Box */}
        <View style={styles.infoBlock}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.sku}>SKU: {product.sku}</Text>
          <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Product Details & Specifications</Text>
          <Text style={styles.description}>
            {product.description || 'Premium grade wholesale paint product manufactured with strict quality standards for durable, vibrant finishes.'}
          </Text>

          <View style={styles.divider} />

          {/* Stepper selector */}
          {!isOutOfStock && (
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Order Quantity:</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                  <Text style={styles.stepBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyVal}>{qty}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(qty + 1)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.actionBtn, isOutOfStock ? styles.disabledBtn : styles.primaryBtn]}
          disabled={isOutOfStock || submitting}
          onPress={handleAddToCart}
        >
          <Text style={styles.actionBtnText}>
            {isOutOfStock ? 'SOLD OUT' : `ADD TO CART • ₹${(product.price * qty).toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
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
  scroll: {
    paddingBottom: 100,
  },
  imageHeaderContainer: {
    height: 260,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoBlock: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  sku: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  price: {
    fontSize: 24,
    color: '#6366F1',
    fontWeight: 'bold',
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stepBtnText: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyVal: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E293B',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  actionBtn: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#6366F1',
  },
  disabledBtn: {
    backgroundColor: '#334155',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

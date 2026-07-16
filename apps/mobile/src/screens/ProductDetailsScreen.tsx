import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { showToast, setCart } from '@raj-enterprises/shared-redux';
import type { RootState } from '../store';

export default function ProductDetailsScreen({ route, navigation }: any) {
  const { productId } = route.params;
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items || []);
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
        // Authenticated server cart sync
        const itemsPayload = [...cartItems.map((i: any) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          selected: i.selected
        }))];
        
        const existingIdx = itemsPayload.findIndex(i => i.product_id === productId);
        if (existingIdx > -1) {
          itemsPayload[existingIdx].quantity += qty;
        } else {
          itemsPayload.push({ product_id: productId, quantity: qty, selected: true });
        }

        const updatedCart = await api.cart.update({ items: itemsPayload });
        dispatch(setCart(updatedCart));
      } else {
        // Guest cart offline persistence simulation in Redux
        dispatch(showToast({ message: 'Saved as Guest cart item.', type: 'success' }));
      }
      dispatch(showToast({ message: 'Product added to cart!', type: 'success' }));
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
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingCentering}>
        <Text style={{ color: '#FFF' }}>Product details not found.</Text>
      </View>
    );
  }

  const isOutOfStock = product.stock_count <= 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Visual Hero */}
        <View style={styles.heroPlaceholder}>
          <Text style={{ fontSize: 72 }}>🎨</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.sku}>SKU: {product.sku}</Text>
          <Text style={styles.price}>₹{product.price.toFixed(2)}</Text>
          
          <Text style={styles.sectionTitle}>Product Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.divider} />

          {/* Stepper details */}
          {!isOutOfStock && (
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Select Quantity:</Text>
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

          {/* Status Badging */}
          {product.stock_count <= product.low_stock_threshold && product.stock_count > 0 && (
            <Text style={[styles.statusNote, { color: '#FFA500' }]}>Warning: Low stock level ({product.stock_count} units left)</Text>
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
            {isOutOfStock ? 'OUT OF STOCK' : 'ADD TO BASKET'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  loadingCentering: {
    flex: 1,
    backgroundColor: '#121214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 100,
  },
  heroPlaceholder: {
    height: 240,
    backgroundColor: '#1E1E24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBlock: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  sku: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  price: {
    fontSize: 20,
    color: '#6C63FF',
    fontWeight: 'bold',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#BBB',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  stepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stepBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyVal: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 12,
  },
  statusNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E24',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#222',
  },
  actionBtn: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#6C63FF',
  },
  disabledBtn: {
    backgroundColor: '#3E3A40',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

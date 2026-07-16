import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { clearCart, setCart, showToast } from '@raj-enterprises/shared-redux';
import type { RootState } from '../store';

export default function CartScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items || []);
  const user = useSelector((state: RootState) => state.auth.user);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productsInfo, setProductsInfo] = useState<Record<string, any>>({});

  const resolveCartProducts = async () => {
    setLoading(true);
    try {
      const resolved: Record<string, any> = {};
      for (const item of cartItems) {
        const product = await api.products.get(item.product_id);
        resolved[item.product_id] = product;
      }
      setProductsInfo(resolved);
    } catch {
      console.warn('Failed to resolve cart products details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cartItems.length > 0) {
      resolveCartProducts();
    }
  }, [cartItems.length]);

  const handleUpdateQty = async (productId: string, currentQty: number, change: number) => {
    const nextQty = currentQty + change;
    if (nextQty < 0) return;

    try {
      const itemsPayload = cartItems.map((i: any) => {
        if (i.product_id === productId) {
          return { ...i, quantity: nextQty };
        }
        return { product_id: i.product_id, quantity: i.quantity, selected: i.selected };
      }).filter((i: any) => i.quantity > 0);

      const updated = await api.cart.update({ items: itemsPayload });
      dispatch(setCart(updated));
    } catch {
      dispatch(showToast({ message: 'Failed to update item quantity.', type: 'error' }));
    }
  };

  const handleToggleSelect = async (productId: string, currentSelected: boolean) => {
    try {
      const itemsPayload = cartItems.map((i: any) => {
        if (i.product_id === productId) {
          return { ...i, selected: !currentSelected };
        }
        return { product_id: i.product_id, quantity: i.quantity, selected: i.selected };
      });

      const updated = await api.cart.update({ items: itemsPayload });
      dispatch(setCart(updated));
    } catch {
      dispatch(showToast({ message: 'Failed to toggle item state.', type: 'error' }));
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      dispatch(showToast({ message: 'Please sign in to place wholesale orders.', type: 'warning' }));
      navigation.navigate('Login');
      return;
    }

    setSubmitting(true);
    try {
      // Direct checkout trigger (simulate COD default checkout)
      await api.orders.create({ address_index: 0 });
      dispatch(clearCart());
      dispatch(showToast({ message: 'Order placed successfully via Cash on Delivery!', type: 'success' }));
      navigation.navigate('Home');
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Checkout failed.', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  // Compute subtotal of selected items
  const subtotal = cartItems.reduce((acc, item) => {
    if (!item.selected) return acc;
    const price = productsInfo[item.product_id]?.price || 0;
    return acc + price * item.quantity;
  }, 0);

  if (loading) {
    return (
      <View style={styles.loadingCentering}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is currently empty</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseBtnText}>Browse Storefront</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const product = productsInfo[item.product_id];
              return (
                <View style={styles.cartCard}>
                  {/* Select Checkbox Toggle */}
                  <TouchableOpacity
                    style={[styles.checkbox, item.selected && styles.checkedCheckbox]}
                    onPress={() => handleToggleSelect(item.product_id, item.selected)}
                  >
                    {item.selected && <Text style={{ color: '#FFF', fontSize: 10 }}>✓</Text>}
                  </TouchableOpacity>

                  <View style={styles.detailsCol}>
                    <Text style={styles.title} numberOfLines={1}>
                      {product?.title || 'Loading item info...'}
                    </Text>
                    <Text style={styles.price}>
                      ₹{((product?.price || 0) * item.quantity).toFixed(2)}
                    </Text>
                    
                    {/* Quantity Stepper */}
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => handleUpdateQty(item.product_id, item.quantity, -1)}>
                        <Text style={styles.stepText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => handleUpdateQty(item.product_id, item.quantity, 1)}>
                        <Text style={styles.stepText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          {/* Checkout pricing sum block */}
          <View style={styles.summaryFooter}>
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Selected Subtotal:</Text>
              <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, submitting && styles.disabledBtn]}
              disabled={submitting}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutBtnText}>
                {submitting ? 'PROCESSING ORDER...' : 'CHECKOUT (COD)'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  browseBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  cartCard: {
    backgroundColor: '#1E1E24',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkedCheckbox: {
    backgroundColor: '#6C63FF',
  },
  detailsCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  price: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#121214',
    borderRadius: 6,
    marginTop: 6,
  },
  stepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  qtyText: {
    color: '#FFF',
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  summaryFooter: {
    backgroundColor: '#1E1E24',
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#222',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    color: '#888',
    fontSize: 15,
  },
  totalValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: '#6C63FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#3E3A40',
  },
  checkoutBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

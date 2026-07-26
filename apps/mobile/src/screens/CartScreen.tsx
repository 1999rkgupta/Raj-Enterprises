import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { clearCart, setCart, showToast, updateGuestItem, removeGuestItem } from '@raj-enterprises/shared-redux';
import type { RootState } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80';

export default function CartScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { cart, guestItems } = useSelector((state: RootState) => state.cart);
  const cartItems = user ? (cart?.items || []) : (guestItems || []);

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
      if (user) {
        if (nextQty === 0) {
          const updated = await api.cart.removeItem(productId);
          dispatch(setCart(updated));
        } else {
          const updated = await api.cart.updateItem(productId, { quantity: nextQty });
          dispatch(setCart(updated));
        }
      } else {
        if (nextQty === 0) {
          dispatch(removeGuestItem(productId));
        } else {
          dispatch(updateGuestItem({ product_id: productId, quantity: nextQty }));
        }
      }
    } catch {
      dispatch(showToast({ message: 'Failed to update item quantity.', type: 'error' }));
    }
  };

  const handleToggleSelect = async (productId: string, currentSelected: boolean) => {
    try {
      if (user) {
        const updated = await api.cart.updateItem(productId, { selected: !currentSelected });
        dispatch(setCart(updated));
      } else {
        dispatch(updateGuestItem({ product_id: productId, selected: !currentSelected }));
      }
    } catch {
      dispatch(showToast({ message: 'Failed to toggle item state.', type: 'error' }));
    }
  };

  const handleSelectAll = async () => {
    const allSelected = cartItems.every((i: any) => i.selected);
    const targetState = !allSelected;

    try {
      if (user) {
        for (const item of cartItems) {
          await api.cart.updateItem(item.product_id, { selected: targetState });
        }
        const refreshed = await api.cart.get();
        dispatch(setCart(refreshed));
      } else {
        cartItems.forEach((item: any) => {
          dispatch(updateGuestItem({ product_id: item.product_id, selected: targetState }));
        });
      }
    } catch {
      dispatch(showToast({ message: 'Failed to update selection.', type: 'error' }));
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
      await api.orders.place({ address_index: 0 });
      dispatch(clearCart());
      dispatch(showToast({ message: 'Order placed successfully via Cash on Delivery!', type: 'success' }));
      navigation.navigate('Home');
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Checkout failed.', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = cartItems.reduce((acc: number, item: any) => {
    if (!item.selected) return acc;
    const price = productsInfo[item.product_id]?.price || 0;
    return acc + price * item.quantity;
  }, 0);

  const selectedCount = cartItems.filter((i: any) => i.selected).length;
  const isAllSelected = cartItems.length > 0 && cartItems.every((i: any) => i.selected);

  if (loading) {
    return (
      <View style={styles.loadingCentering}>
        <LoadingSpinner message="Fetching cart items..." size="large" color="#6366F1" />
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
          {/* Master Select All Header */}
          <View style={styles.selectHeader}>
            <TouchableOpacity style={styles.selectAllRow} onPress={handleSelectAll}>
              <View style={[styles.checkbox, isAllSelected && styles.checkedCheckbox]}>
                {isAllSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.selectAllText}>Select All ({cartItems.length} items)</Text>
            </TouchableOpacity>
            <Text style={styles.selectedCountText}>{selectedCount} Selected</Text>
          </View>

          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const product = productsInfo[item.product_id];
              const imageUrl = product?.images && product.images.length > 0 ? product.images[0] : DEFAULT_IMAGE;

              return (
                <View style={styles.cartCard}>
                  {/* Select Checkbox Toggle */}
                  <TouchableOpacity
                    style={[styles.checkbox, item.selected && styles.checkedCheckbox]}
                    onPress={() => handleToggleSelect(item.product_id, item.selected)}
                  >
                    {item.selected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>

                  {/* Thumbnail Image */}
                  <Image source={{ uri: imageUrl }} style={styles.thumbImage} resizeMode="cover" />

                  <View style={styles.detailsCol}>
                    <Text style={styles.title} numberOfLines={1}>
                      {product?.title || 'Loading item info...'}
                    </Text>
                    <Text style={styles.price}>
                      ₹{((product?.price || 0) * item.quantity).toFixed(2)}
                    </Text>

                    {/* Stepper controls */}
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

          {/* Sticky summary footer */}
          <View style={styles.summaryFooter}>
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Selected Subtotal:</Text>
              <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, (submitting || selectedCount === 0) && styles.disabledBtn]}
              disabled={submitting || selectedCount === 0}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutBtnText}>
                {submitting ? 'PROCESSING ORDER...' : `CHECKOUT (${selectedCount} ITEMS)`}
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
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  browseBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 10,
  },
  selectedCountText: {
    color: '#6366F1',
    fontWeight: 'bold',
    fontSize: 13,
  },
  cartCard: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkedCheckbox: {
    backgroundColor: '#6366F1',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    marginRight: 12,
  },
  detailsCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  price: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  stepBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepText: {
    color: '#6366F1',
    fontWeight: 'bold',
    fontSize: 15,
  },
  qtyText: {
    color: '#F8FAFC',
    paddingHorizontal: 8,
    fontWeight: 'bold',
    fontSize: 13,
  },
  summaryFooter: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  totalLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  totalValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkoutBtn: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#334155',
  },
  checkoutBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

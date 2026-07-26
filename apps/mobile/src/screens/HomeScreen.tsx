import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import type { RootState } from '../store';
import { showToast, setCart, addGuestItem, updateGuestItem, removeGuestItem } from '@raj-enterprises/shared-redux';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80';

export default function HomeScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { cart, guestItems } = useSelector((state: RootState) => state.cart);
  const cartItems = user ? (cart?.items || []) : (guestItems || []);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      const catsRes = await api.categories.list();
      setCategories(catsRes?.categories || []);

      const productsRes = await api.products.list({
        category: selectedCat || undefined,
        search: searchQuery || undefined,
        page_size: 50,
      });
      setProducts(productsRes?.products || []);
    } catch {
      dispatch(showToast({ message: 'Error loading products feed.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, [selectedCat, searchQuery]);

  const totalCartQty = cartItems.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);

  const getItemQtyInCart = (productId: string) => {
    const found = cartItems.find((i: any) => i.product_id === productId);
    return found ? found.quantity : 0;
  };

  const handleUpdateQty = async (productId: string, delta: number) => {
    const currentQty = getItemQtyInCart(productId);
    const nextQty = currentQty + delta;
    if (nextQty < 0) return;

    try {
      if (user) {
        if (nextQty === 0) {
          const updated = await api.cart.removeItem(productId);
          dispatch(setCart(updated));
        } else if (currentQty === 0) {
          const updated = await api.cart.addItem({ product_id: productId, quantity: 1 });
          dispatch(setCart(updated));
        } else {
          const updated = await api.cart.updateItem(productId, { quantity: nextQty });
          dispatch(setCart(updated));
        }
      } else {
        if (nextQty === 0) {
          dispatch(removeGuestItem(productId));
        } else if (currentQty === 0) {
          dispatch(addGuestItem({ product_id: productId, quantity: 1 }));
        } else {
          dispatch(updateGuestItem({ product_id: productId, quantity: nextQty }));
        }
      }
      dispatch(showToast({ message: 'Cart updated', type: 'success' }));
    } catch {
      dispatch(showToast({ message: 'Failed to update cart', type: 'error' }));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>RAJ ENTERPRISES</Text>
          <Text style={styles.brandSubtitle}>Wholesale Paints & Coatings</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={{ fontSize: 22 }}>🛒</Text>
            {totalCartQty > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalCartQty}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={{ fontSize: 22 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search paint products, SKUs..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: '#94A3B8', paddingHorizontal: 6 }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView stickyHeaderIndices={[]} showsVerticalScrollIndicator={false}>
        {/* Promotional Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>OFFICIAL WHOLESALE</Text>
          </View>
          <Text style={styles.heroTitle}>Premium Industrial Coatings & Paints</Text>
          <Text style={styles.heroSub}>Bulk wholesale orders with instant order tracking</Text>
        </View>

        {/* Categories Pill Carousel */}
        <View style={styles.catCarouselWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            <TouchableOpacity
              style={[styles.catChip, !selectedCat && styles.activeCatChip]}
              onPress={() => setSelectedCat(null)}
            >
              <Text style={[styles.catText, !selectedCat && styles.activeCatText]}>All Paints</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, selectedCat === cat.id && styles.activeCatChip]}
                onPress={() => setSelectedCat(cat.id)}
              >
                <Text style={[styles.catText, selectedCat === cat.id && styles.activeCatText]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Catalog Grid */}
        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Fetching live catalog...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <Text style={{ fontSize: 36 }}>🎨</Text>
            <Text style={styles.emptyText}>No products found matching query.</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {products.map((item) => {
              const qtyInCart = getItemQtyInCart(item.id);
              const imageUrl = item.images && item.images.length > 0 ? item.images[0] : DEFAULT_IMAGE;
              const isOutOfStock = item.stock_count <= 0;
              const isLowStock = item.stock_count > 0 && item.stock_count <= item.low_stock_threshold;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
                  activeOpacity={0.8}
                >
                  {/* Image Thumb */}
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                    {isOutOfStock ? (
                      <View style={[styles.stockBadge, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.stockBadgeText}>OUT OF STOCK</Text>
                      </View>
                    ) : isLowStock ? (
                      <View style={[styles.stockBadge, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.stockBadgeText}>LOW STOCK</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Details Block */}
                  <View style={styles.cardContent}>
                    <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.skuText}>SKU: {item.sku}</Text>
                    
                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>₹{item.price.toFixed(2)}</Text>
                      {item.unit && <Text style={styles.unitText}>/ {item.unit}</Text>}
                    </View>

                    {/* Stepper / Add to Cart Action Button */}
                    <View style={styles.actionRow}>
                      {qtyInCart > 0 ? (
                        <View style={styles.stepperContainer}>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => handleUpdateQty(item.id, -1)}
                          >
                            <Text style={styles.stepperBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qtyInCart}</Text>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => handleUpdateQty(item.id, 1)}
                            disabled={isOutOfStock}
                          >
                            <Text style={styles.stepperBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addBtn, isOutOfStock && styles.disabledAddBtn]}
                          disabled={isOutOfStock}
                          onPress={() => handleUpdateQty(item.id, 1)}
                        >
                          <Text style={styles.addBtnText}>
                            {isOutOfStock ? 'Sold Out' : '+ Add'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EC4899',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  heroBanner: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  bannerBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: '#A5B4FC',
  },
  catCarouselWrapper: {
    marginBottom: 12,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeCatChip: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  catText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },
  activeCatText: {
    color: '#FFFFFF',
  },
  loadingWrapper: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyWrapper: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    marginTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  imageContainer: {
    height: 130,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  skuText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  priceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  unitText: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 4,
  },
  actionRow: {
    marginTop: 10,
  },
  addBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledAddBtn: {
    backgroundColor: '#334155',
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepperBtnText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

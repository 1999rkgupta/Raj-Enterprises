import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import type { RootState } from '../store';
import { showToast } from '@raj-enterprises/shared-redux';

export default function HomeScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items || []);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      const catsRes = await api.categories.listActive();
      setCategories(catsRes);

      const productsRes = await api.products.list({
        category_id: selectedCat || undefined,
        limit: 40,
      });
      setProducts(productsRes.products);
    } catch {
      dispatch(showToast({ message: 'Error fetching catalog feeds.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, [selectedCat]);

  const totalCartQty = cartItems.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header Utilities */}
      <View style={styles.header}>
        <Text style={styles.storeName}>Raj Storefront</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={{ fontSize: 20 }}>🛒</Text>
            {totalCartQty > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalCartQty}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Horizontal Carousel */}
      <View style={styles.catCarouselWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          <TouchableOpacity
            style={[styles.catChip, !selectedCat && styles.activeCatChip]}
            onPress={() => setSelectedCat(null)}
          >
            <Text style={[styles.catText, !selectedCat && styles.activeCatText]}>All Products</Text>
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
        <Text style={styles.loadingText}>Fetching products feed...</Text>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
            >
              {/* Product Visual */}
              <View style={styles.imagePlaceholder}>
                <Text style={{ fontSize: 28 }}>🎨</Text>
              </View>
              
              <View style={styles.infoCol}>
                <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.sku}>SKU: {item.sku}</Text>
                <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
                
                {item.stock_count <= item.low_stock_threshold && item.stock_count > 0 && (
                  <Text style={styles.lowStock}>Few Left in Stock</Text>
                )}
                {item.stock_count <= 0 && (
                  <Text style={styles.outStock}>Out of Stock</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C63FF',
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
    top: 0,
    right: 0,
    backgroundColor: '#FF6347',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  catCarouselWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  catScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeCatChip: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  catText: {
    color: '#888',
    fontWeight: '600',
  },
  activeCatText: {
    color: '#FFF',
  },
  gridContainer: {
    padding: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#1E1E24',
    width: '48%',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D2D35',
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#272730',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    padding: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  sku: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '700',
    marginTop: 4,
  },
  lowStock: {
    fontSize: 9,
    color: '#FFA500',
    fontWeight: '600',
    marginTop: 4,
  },
  outStock: {
    fontSize: 9,
    color: '#FF6347',
    fontWeight: '600',
    marginTop: 4,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});

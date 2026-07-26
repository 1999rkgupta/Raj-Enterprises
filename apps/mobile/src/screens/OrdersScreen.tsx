import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api';
import { showToast } from '@raj-enterprises/shared-redux';
import type { RootState } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';

export default function OrdersScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.orders.list();
      setOrders(res?.orders || []);
    } catch {
      dispatch(showToast({ message: 'Failed to load order history.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingCentering}>
        <LoadingSpinner message="Fetching order history..." size="large" color="#6366F1" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ fontSize: 48 }}>📦</Text>
        <Text style={styles.emptyTitle}>Sign in to view Orders</Text>
        <Text style={styles.emptySubtitle}>Track wholesale orders and order status in real time.</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.actionBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 48 }}>📦</Text>
          <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
          <Text style={styles.emptySubtitle}>When you place wholesale orders, they will appear here.</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.actionBtnText}>Browse Storefront</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const statusColor =
              item.status === 'delivered' ? '#10B981' :
              item.status === 'cancelled' ? '#EF4444' : '#F59E0B';

            return (
              <View style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>Order #{item.order_number || item.id.slice(0, 8)}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.itemsSummary}>
                  <Text style={styles.itemCount}>
                    {item.items ? item.items.length : 0} items purchased
                  </Text>
                  <Text style={styles.totalPrice}>₹{(item.total_amount || 0).toFixed(2)}</Text>
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
  actionBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  orderCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  orderDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    color: '#94A3B8',
    fontSize: 13,
  },
  totalPrice: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

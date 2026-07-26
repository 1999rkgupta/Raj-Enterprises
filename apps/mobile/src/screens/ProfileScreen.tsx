import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser, setUser, showToast } from '@raj-enterprises/shared-redux';
import { setMobileAuthToken, api } from '../api';
import { auth } from '../firebase';
import type { RootState } from '../store';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const wishlistProductIds = useSelector((state: RootState) => state.wishlist.productIds || []);
  const { cart, guestItems } = useSelector((state: RootState) => state.cart);
  const cartItems = user ? (cart?.items || []) : (guestItems || []);

  const [addrLine1, setAddrLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [submittingAddress, setSubmittingAddress] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Firebase sign out failed', e);
    }
    setMobileAuthToken(null);
    dispatch(clearUser());
    dispatch(showToast({ message: 'Logged out successfully.', type: 'success' }));
    navigation.replace('Login');
  };

  const handleAddAddress = async () => {
    if (!addrLine1 || !city || !stateName || !pincode) {
      dispatch(showToast({ message: 'Please complete all address fields.', type: 'warning' }));
      return;
    }
    setSubmittingAddress(true);

    try {
      const isDefault = !user?.addresses || user.addresses.length === 0;
      await api.users.addAddress({
        label: 'Home',
        full_name: user?.name || 'Customer Name',
        phone: user?.mobile || '0000000000',
        address_line_1: addrLine1,
        city,
        state: stateName,
        pincode,
        is_default: isDefault,
      });

      const freshUser = await api.auth.getMe();
      dispatch(setUser(freshUser));
      dispatch(showToast({ message: 'New shipping address saved!', type: 'success' }));

      setAddrLine1('');
      setCity('');
      setStateName('');
      setPincode('');
    } catch {
      dispatch(showToast({ message: 'Failed to save address.', type: 'error' }));
    } finally {
      setSubmittingAddress(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {user ? (
        <View style={styles.block}>
          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : 'U'}</Text>
            </View>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email || 'No email recorded'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>VERIFIED WHOLESALE {user.role.toUpperCase()}</Text>
            </View>
            {user.shop_name ? <Text style={styles.shopText}>Shop: {user.shop_name}</Text> : null}
          </View>

          {/* Quick Shortcuts */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity style={styles.shortcutCard} onPress={() => navigation.navigate('Orders')}>
              <Text style={{ fontSize: 24 }}>📦</Text>
              <Text style={styles.shortcutTitle}>My Orders</Text>
              <Text style={styles.shortcutSub}>Track history</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutCard} onPress={() => navigation.navigate('Wishlist')}>
              <Text style={{ fontSize: 24 }}>💖</Text>
              <Text style={styles.shortcutTitle}>Wishlist</Text>
              <Text style={styles.shortcutSub}>{wishlistProductIds.length} items</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutCard} onPress={() => navigation.navigate('Cart')}>
              <Text style={{ fontSize: 24 }}>🛒</Text>
              <Text style={styles.shortcutTitle}>Cart</Text>
              <Text style={styles.shortcutSub}>{cartItems.length} items</Text>
            </TouchableOpacity>
          </View>

          {/* Saved Addresses Section */}
          <Text style={styles.sectionHeader}>Saved Shipping Addresses</Text>
          {(!user.addresses || user.addresses.length === 0) ? (
            <Text style={styles.emptyNote}>No shipping addresses recorded. Add one below.</Text>
          ) : (
            user.addresses.map((addr: any, idx: number) => (
              <View key={idx} style={styles.addressCard}>
                <Text style={styles.addrText}>{addr.address_line_1}</Text>
                <Text style={styles.addrSub}>{addr.city}, {addr.state} - {addr.pincode}</Text>
              </View>
            ))
          )}

          {/* Add Address Form */}
          <View style={styles.addAddressForm}>
            <Text style={styles.formTitle}>Add New Shipping Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Address Line 1"
              placeholderTextColor="#64748B"
              value={addrLine1}
              onChangeText={setAddrLine1}
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#64748B"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={styles.input}
              placeholder="State"
              placeholderTextColor="#64748B"
              value={stateName}
              onChangeText={setStateName}
            />
            <TextInput
              style={styles.input}
              placeholder="Pincode"
              placeholderTextColor="#64748B"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[styles.addBtn, submittingAddress && styles.disabledBtn]}
              disabled={submittingAddress}
              onPress={handleAddAddress}
            >
              {submittingAddress ? (
                <LoadingSpinner size="small" color="#FFF" />
              ) : (
                <Text style={styles.addBtnText}>Save Address</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>SIGN OUT ACCOUNT</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.guestCard}>
          <Text style={{ fontSize: 48 }}>👤</Text>
          <Text style={styles.guestTitle}>You are browsing as Guest</Text>
          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  block: {
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  email: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#312E81',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  roleBadgeText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: 'bold',
  },
  shopText: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 6,
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  shortcutTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  shortcutSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  sectionHeader: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 6,
  },
  emptyNote: {
    color: '#64748B',
    fontSize: 13,
  },
  addressCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addrText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  addrSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  addAddressForm: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  formTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: '#6366F1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledBtn: {
    backgroundColor: '#334155',
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  logoutBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  guestCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  guestTitle: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  loginLink: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  loginLinkText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

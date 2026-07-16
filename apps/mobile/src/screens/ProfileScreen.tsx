import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearUser, setUser, showToast } from '@raj-enterprises/shared-redux';
import { setMobileAuthToken, api } from '../api';
import type { RootState } from '../store';

export default function ProfileScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  // Address add state variables
  const [addrLine1, setAddrLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [submittingAddress, setSubmittingAddress] = useState(false);

  const handleLogout = () => {
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
      const addressesPayload = [...(user?.addresses || [])];
      addressesPayload.push({
        full_name: user?.name || 'Customer Name',
        phone: user?.mobile || '0000000000',
        address_line_1: addrLine1,
        city,
        state: stateName,
        pincode,
      });

      const updatedUser = await api.users.updateProfile({ addresses: addressesPayload });
      dispatch(setUser(updatedUser));
      dispatch(showToast({ message: 'New shipping address saved!', type: 'success' }));

      // Clear fields
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
          {/* Profile Card details */}
          <View style={styles.profileCard}>
            <Text style={styles.avatar}>👤</Text>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email || 'No email recorded'}</Text>
            <Text style={styles.role}>Role: {user.role.toUpperCase()}</Text>
            {user.shop_name && <Text style={styles.shop}>Shop: {user.shop_name}</Text>}
          </View>

          {/* Saved shipping addresses list */}
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
            <Text style={styles.formTitle}>Add New Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Address Line 1"
              placeholderTextColor="#777"
              value={addrLine1}
              onChangeText={setAddrLine1}
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#777"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={styles.input}
              placeholder="State"
              placeholderTextColor="#777"
              value={stateName}
              onChangeText={setStateName}
            />
            <TextInput
              style={styles.input}
              placeholder="Pincode"
              placeholderTextColor="#777"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[styles.addBtn, submittingAddress && styles.disabledBtn]}
              disabled={submittingAddress}
              onPress={handleAddAddress}
            >
              <Text style={styles.addBtnText}>{submittingAddress ? 'Saving Address...' : 'Save Address'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>🚪 Log Out Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.guestCard}>
          <Text style={{ fontSize: 36 }}>👤</Text>
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
    backgroundColor: '#121214',
    padding: 16,
  },
  block: {
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#1E1E24',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  avatar: {
    fontSize: 48,
    marginBottom: 8,
  },
  name: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  email: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  role: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  shop: {
    color: '#BBB',
    fontSize: 13,
    marginTop: 4,
  },
  sectionHeader: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptyNote: {
    color: '#666',
    fontSize: 13,
  },
  addressCard: {
    backgroundColor: '#1E1E24',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D35',
  },
  addrText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addrSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  addAddressForm: {
    backgroundColor: '#1E1E24',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 10,
    gap: 12,
  },
  formTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#121214',
    color: '#FFF',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  addBtn: {
    backgroundColor: '#6C63FF',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledBtn: {
    backgroundColor: '#3E3A40',
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#FF6347',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  loginLink: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  loginLinkText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

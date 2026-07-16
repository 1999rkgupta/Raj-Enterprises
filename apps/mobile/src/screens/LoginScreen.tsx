import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, showToast } from '@raj-enterprises/shared-redux';
import { setMobileAuthToken, api } from '../api';
import { View as RNView, Text as RNText, StyleSheet as RNStyleSheet, TextInput as RNTextInput, TouchableOpacity as RNTouchable } from 'react-native';

export default function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDevMockLogin = (role: 'mock-customer' | 'mock-admin') => {
    setMobileAuthToken(role);
    const mockUser = {
      id: role === 'mock-customer' ? 'cust_123' : 'admin_456',
      name: role === 'mock-customer' ? 'Mock Customer' : 'Mock Administrator',
      email: `${role}@rajenterprises.com`,
      role: role === 'mock-customer' ? 'customer' : 'admin',
    };
    dispatch(setUser(mockUser));
    dispatch(showToast({ message: `Dev Mock login as ${mockUser.role} active`, type: 'success' }));
    navigation.replace('Home');
  };

  const handleEmailLogin = async () => {
    if (!mobile || !password) return;
    setLoading(true);
    try {
      // Direct login simulation or Firebase REST validation fallback
      const response = await api.auth.login({ email: mobile, password });
      setMobileAuthToken(response.token);
      dispatch(setUser(response.user));
      dispatch(showToast({ message: 'Welcome back!', type: 'success' }));
      navigation.replace('Home');
    } catch {
      dispatch(showToast({ message: 'Authentication failed. Please verify credentials.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <RNView style={styles.card}>
        <RNText style={styles.title}>Raj Enterprises</RNText>
        <RNText style={styles.subtitle}>Wholesale Paint Stores Login</RNText>

        <RNTextInput
          style={styles.input}
          placeholder="Email Address or Mobile Number"
          placeholderTextColor="#777"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <RNTextInput
          style={styles.input}
          placeholder="Security Password"
          placeholderTextColor="#777"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <RNTouchable style={styles.loginButton} onPress={handleEmailLogin} disabled={loading}>
          <RNText style={styles.loginButtonText}>{loading ? 'Authenticating...' : 'Sign In'}</RNText>
        </RNTouchable>

        <RNText style={styles.divider}>Or Developer Bypass</RNText>

        <RNView style={styles.mockRow}>
          <RNTouchable style={[styles.mockBtn, styles.custBtn]} onPress={() => handleDevMockLogin('mock-customer')}>
            <RNText style={styles.mockText}>Customer</RNText>
          </RNTouchable>
          <RNTouchable style={[styles.mockBtn, styles.adminBtn]} onPress={() => handleDevMockLogin('mock-admin')}>
            <RNText style={styles.mockText}>Admin</RNText>
          </RNTouchable>
        </RNView>
      </RNView>
    </ScrollView>
  );
}

const styles = RNStyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#121214',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E1E24',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 26,
    color: '#6C63FF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#121214',
    color: '#FFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  loginButton: {
    backgroundColor: '#6C63FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    color: '#555',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  mockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mockBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  custBtn: {
    backgroundColor: '#3E3A60',
  },
  adminBtn: {
    backgroundColor: '#6B3A60',
  },
  mockText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

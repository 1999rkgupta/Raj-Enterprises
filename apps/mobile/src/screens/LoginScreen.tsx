import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { setUser, showToast } from '@raj-enterprises/shared-redux';
import { setMobileAuthToken, api } from '../api';

export default function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'mock'>('signin');

  // Sign In inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regShopName, setRegShopName] = useState('');

  const [loading, setLoading] = useState(false);

  const handleDevMockLogin = async (role: 'mock-customer' | 'mock-admin') => {
    setLoading(true);
    try {
      setMobileAuthToken(role);
      const dbUser = await api.auth.getMe();
      dispatch(setUser(dbUser));
      dispatch(showToast({ message: `Dev Mock login as ${dbUser.role} active`, type: 'success' }));
      navigation.replace('Home');
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Mock login failed', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseSignIn = async () => {
    if (!email || !password) {
      dispatch(showToast({ message: 'Please enter both email and password.', type: 'warning' }));
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setMobileAuthToken(null);
      const dbUser = await api.auth.getMe();
      dispatch(setUser(dbUser));
      dispatch(showToast({ message: `Welcome back, ${dbUser.name}!`, type: 'success' }));
      navigation.replace('Home');
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Authentication failed.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseRegister = async () => {
    if (!regName || !regEmail || !regPassword) {
      dispatch(showToast({ message: 'Name, email, and password are required.', type: 'warning' }));
      return;
    }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      setMobileAuthToken(null);
      const dbUser = await api.auth.register({
        firebase_uid: credential.user.uid,
        name: regName,
        email: regEmail,
        mobile: regMobile || undefined,
        shop_name: regShopName || undefined,
      });

      dispatch(setUser(dbUser));
      dispatch(showToast({ message: 'Account registered successfully!', type: 'success' }));
      navigation.replace('Home');
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || err.message || 'Registration failed.', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>RAJ ENTERPRISES</Text>
        <Text style={styles.subtitle}>Wholesale Storefront Portal</Text>

        {/* Tab Controls */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'signin' && styles.activeTab]}
            onPress={() => setActiveTab('signin')}
          >
            <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'register' && styles.activeTab]}
            onPress={() => setActiveTab('register')}
          >
            <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'mock' && styles.activeTab]}
            onPress={() => setActiveTab('mock')}
          >
            <Text style={[styles.tabText, activeTab === 'mock' && styles.activeTabText]}>⚡ Mock</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        {activeTab === 'signin' && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.actionButton} onPress={handleFirebaseSignIn} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'register' && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#64748B"
              value={regName}
              onChangeText={setRegName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#64748B"
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#64748B"
              value={regPassword}
              onChangeText={setRegPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number (Optional)"
              placeholderTextColor="#64748B"
              value={regMobile}
              onChangeText={setRegMobile}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Shop Name (Optional)"
              placeholderTextColor="#64748B"
              value={regShopName}
              onChangeText={setRegShopName}
            />
            <TouchableOpacity style={styles.actionButton} onPress={handleFirebaseRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'mock' && (
          <View style={styles.mockContainer}>
            <Text style={styles.mockDesc}>
              Quick Developer Login. Connects directly to seeded backend accounts without passwords.
            </Text>
            <View style={styles.mockRow}>
              <TouchableOpacity
                style={[styles.mockBtn, styles.custBtn]}
                onPress={() => handleDevMockLogin('mock-customer')}
                disabled={loading}
              >
                <Text style={styles.mockText}>Customer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mockBtn, styles.adminBtn]}
                onPress={() => handleDevMockLogin('mock-admin')}
                disabled={loading}
              >
                <Text style={styles.mockText}>Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 24,
    color: '#6366F1',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mockContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  mockDesc: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 20,
  },
  mockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  mockBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  custBtn: {
    backgroundColor: '#4338CA',
  },
  adminBtn: {
    backgroundColor: '#BE185D',
  },
  mockText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

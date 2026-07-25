import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { setUser, showToast } from '@raj-enterprises/shared-redux';
import { User, UserRole } from '@raj-enterprises/shared-types';
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
      // 1. Firebase Authentication
      const credential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Clear dev bypass tokens
      setMobileAuthToken(null);

      // 3. Resolve user profile from MongoDB
      const dbUser = await api.auth.getMe();
      dispatch(setUser(dbUser));
      dispatch(showToast({ message: `Welcome back, ${dbUser.name}!`, type: 'success' }));
      navigation.replace('Home');
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Authentication failed. Please verify credentials.', type: 'error' }));
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
      // 1. Create account in Firebase Auth
      const credential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      
      // 2. Clear dev bypass tokens
      setMobileAuthToken(null);

      // 3. Create profile record in MongoDB via API
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
        <Text style={styles.title}>Raj Enterprises</Text>
        <Text style={styles.subtitle}>Direct Wholesale Storefront</Text>

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
              placeholderTextColor="#777"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#777"
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
              placeholderTextColor="#777"
              value={regName}
              onChangeText={setRegName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#777"
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#777"
              value={regPassword}
              onChangeText={setRegPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile Number (Optional)"
              placeholderTextColor="#777"
              value={regMobile}
              onChangeText={setRegMobile}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Shop Name (Optional)"
              placeholderTextColor="#777"
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
              Developer Bypass. Connects instantly with local seeded database accounts.
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
    fontSize: 28,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121214',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2D2D35',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#6C63FF',
  },
  tabText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeTabText: {
    color: '#FFF',
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#121214',
    color: '#FFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#6C63FF',
    padding: 16,
    borderRadius: 8,
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
    color: '#888',
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

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { setUser, showToast } from '@raj-enterprises/shared-redux';
import { setMobileAuthToken, api } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

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
            <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        {activeTab === 'signin' && (
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your wholesale email"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.actionButton} onPress={handleFirebaseSignIn} disabled={loading}>
              {loading ? (
                <LoadingSpinner size="small" color="#FFF" />
              ) : (
                <Text style={styles.actionButtonText}>SIGN IN TO STORE</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'register' && (
          <View style={styles.form}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#64748B"
              value={regName}
              onChangeText={setRegName}
            />

            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor="#64748B"
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create strong password"
              placeholderTextColor="#64748B"
              value={regPassword}
              onChangeText={setRegPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Mobile Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#64748B"
              value={regMobile}
              onChangeText={setRegMobile}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>Shop / Firm Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Raj Paint Traders"
              placeholderTextColor="#64748B"
              value={regShopName}
              onChangeText={setRegShopName}
            />

            <TouchableOpacity style={styles.actionButton} onPress={handleFirebaseRegister} disabled={loading}>
              {loading ? (
                <LoadingSpinner size="small" color="#FFF" />
              ) : (
                <Text style={styles.actionButtonText}>REGISTER ACCOUNT</Text>
              )}
            </TouchableOpacity>
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
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: -4,
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
    marginTop: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

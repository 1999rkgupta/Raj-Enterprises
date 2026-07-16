import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../../../../apps/web/src/firebase'; // Re-use web Firebase client
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { setUser, clearUser, showToast, setLoading } from '@raj-enterprises/shared-redux';
import { createApiClient } from '@raj-enterprises/api-client';
import type { RootState } from '../store';
import './Login.css';

// Admin API client pointing to local backend (with Firebase token helper)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    const user = auth.currentUser;
    return user ? user.getIdToken(true) : localStorage.getItem('dev_mock_token');
  },
});

export function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    // Redirect if already authenticated as admin
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'super_admin')) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const handleVerifyAdminRole = async (firebaseUid?: string) => {
    try {
      const dbUser = await api.auth.getMe();
      if (dbUser.role !== 'admin' && dbUser.role !== 'super_admin') {
        // Reject and sign out customer trying to login to admin console
        localStorage.removeItem('dev_mock_token');
        await signOut(auth);
        dispatch(clearUser());
        dispatch(showToast({ message: 'Access denied. Admin privileges required.', type: 'error' }));
        return;
      }
      
      dispatch(setUser(dbUser));
      dispatch(showToast({ message: `Access Granted. Welcome ${dbUser.name}`, type: 'success' }));
      navigate('/');
    } catch (err: any) {
      localStorage.removeItem('dev_mock_token');
      await signOut(auth);
      dispatch(clearUser());
      dispatch(showToast({ message: err.detail || 'Failed to authenticate user profile', type: 'error' }));
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await signInWithPopup(auth, googleProvider);
      await handleVerifyAdminRole();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Google Sign-in Failed', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await handleVerifyAdminRole();
    } catch (err: any) {
      dispatch(showToast({ message: 'Invalid Admin credentials', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockLogin = async (mockToken: 'mock-admin' | 'mock-superadmin') => {
    setSubmitting(true);
    try {
      localStorage.setItem('dev_mock_token', mockToken);
      await handleVerifyAdminRole();
    } catch (err: any) {
      dispatch(showToast({ message: 'Mock login failed', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-container flex justify-center items-center">
      <div className="admin-login-card card-glass animate-scale-in">
        <div className="login-header">
          <div className="logo-icon" style={{ margin: '0 auto 16px' }}>RE</div>
          <h1 className="text-gradient">Admin Portal</h1>
          <p className="text-secondary">Raj Enterprises Management Console</p>
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div className="input-group">
            <label htmlFor="adm-email">Admin Email</label>
            <input
              type="email"
              id="adm-email"
              className="input"
              placeholder="admin@rajenterprises.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="adm-pass">Password</label>
            <input
              type="password"
              id="adm-pass"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Secure Log In'}
          </button>
        </form>

        <div className="login-divider"><span>OR</span></div>

        <button className="btn btn-secondary google-btn" onClick={handleGoogleLogin} disabled={submitting}>
          Sign In with Google
        </button>

        {isDev && (
          <div className="mock-section flex flex-col gap-2" style={{ marginTop: 'var(--space-6)' }}>
            <p className="text-tertiary" style={{ fontSize: '11px', textAlign: 'center' }}>
              ⚡ Developer bypass options:
            </p>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => handleMockLogin('mock-admin')} style={{ flex: 1 }}>
                Mock Admin
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleMockLogin('mock-superadmin')} style={{ flex: 1 }}>
                Mock Super
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default Login;

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { auth, googleProvider } from '../../firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
} from 'firebase/auth';
import { setUser, clearUser, setLoading, showToast } from '@raj-enterprises/shared-redux';
import { api } from '../../utils/api';
import type { RootState } from '../../store/store';
import './LoginModal.css';

// Declare global recaptcha verifier
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const dispatch = useDispatch();
  const [method, setMethod] = useState<'phone' | 'email' | 'mock'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isOpen) {
      setOtpSent(false);
      setOtp('');
      setPhone('');
      setEmail('');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      // Try to verify and retrieve user from backend
      try {
        const dbUser = await api.auth.getMe();
        dispatch(setUser(dbUser));
        dispatch(showToast({ message: `Welcome back, ${dbUser.name}!`, type: 'success' }));
        onClose();
      } catch (err: any) {
        if (err.status === 404) {
          // Trigger registration flow (user authenticated in Firebase but no Mongo profile yet)
          dispatch(showToast({ message: 'Authentication successful. Please complete your registration.', type: 'info' }));
          
          // Auto-register mock name for now
          const regUser = await api.auth.register({
            firebase_uid: result.user.uid,
            name: result.user.displayName || 'Google User',
            email: result.user.email || undefined,
            profile_image_url: result.user.photoURL || undefined,
          });
          dispatch(setUser(regUser));
          dispatch(showToast({ message: `Account registered successfully! Welcome ${regUser.name}`, type: 'success' }));
          onClose();
        } else {
          dispatch(showToast({ message: err.detail || 'Failed to sync with backend server', type: 'error' }));
        }
      }
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Google Login Failed', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const dbUser = await api.auth.getMe();
      dispatch(setUser(dbUser));
      dispatch(showToast({ message: `Welcome back, ${dbUser.name}!`, type: 'success' }));
      onClose();
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Invalid email or password', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('g-recaptcha-response solved, submit phone auth');
        },
      });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setSubmitting(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error('Recaptcha initialization failed');

      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      dispatch(showToast({ message: 'OTP sent successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to send OTP. Make sure phone includes country code (e.g., +91).', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;
    setSubmitting(true);
    try {
      const result = await confirmationResult.confirm(otp);
      
      try {
        const dbUser = await api.auth.getMe();
        dispatch(setUser(dbUser));
        dispatch(showToast({ message: `Welcome back, ${dbUser.name}!`, type: 'success' }));
        onClose();
      } catch (err: any) {
        if (err.status === 404) {
          // Register user in MongoDB
          const regUser = await api.auth.register({
            firebase_uid: result.user.uid,
            name: 'Valued Customer',
            mobile: result.user.phoneNumber || undefined,
          });
          dispatch(setUser(regUser));
          dispatch(showToast({ message: 'Mobile account registered successfully!', type: 'success' }));
          onClose();
        } else {
          dispatch(showToast({ message: err.detail || 'Failed to resolve user profile', type: 'error' }));
        }
      }
    } catch (err: any) {
      dispatch(showToast({ message: 'Invalid OTP code. Please try again.', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  // Dev-only Mock Login Bypass
  const handleMockLogin = async (mockToken: 'mock-customer' | 'mock-admin' | 'mock-superadmin') => {
    setSubmitting(true);
    try {
      // Set the token locally in Axios API Client headers by triggering custom logic,
      // or simply override storage
      localStorage.setItem('dev_mock_token', mockToken);
      
      // Hit /me to verify and generate user
      const dbUser = await api.auth.getMe();
      dispatch(setUser(dbUser));
      dispatch(showToast({ message: `[DEV MOCK] Logged in as ${dbUser.name} (${dbUser.role})`, type: 'success' }));
      onClose();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Mock login failed', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal-content card-glass animate-scale-in" onClick={e => e.stopPropagation()}>
        <button className="login-modal-close" onClick={onClose}>&times;</button>
        
        <div className="login-modal-header">
          <h2 className="text-gradient">Sign in to Raj Enterprises</h2>
          <p className="text-secondary">Direct-from-factory paints & hardware storefront</p>
        </div>

        {/* Recaptcha container */}
        <div id="recaptcha-container"></div>

        {/* Tab Buttons */}
        <div className="login-tabs">
          <button className={`login-tab ${method === 'phone' ? 'active' : ''}`} onClick={() => setMethod('phone')}>
            Phone OTP
          </button>
          <button className={`login-tab ${method === 'email' ? 'active' : ''}`} onClick={() => setMethod('email')}>
            Email
          </button>
          {isDev && (
            <button className={`login-tab ${method === 'mock' ? 'active' : ''}`} onClick={() => setMethod('mock')}>
              ⚡ Mock
            </button>
          )}
        </div>

        {/* Google Login Button */}
        {method !== 'mock' && (
          <div className="social-login">
            <button className="btn btn-secondary google-btn" onClick={handleGoogleLogin} disabled={submitting}>
              <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '8px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <div className="login-divider"><span>OR</span></div>
          </div>
        )}

        {/* Method-specific Form */}
        {method === 'phone' && (
          <div className="phone-auth-container">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div className="input-group">
                  <label htmlFor="phone">Mobile Number</label>
                  <input
                    type="tel"
                    id="phone"
                    className="input"
                    placeholder="+919999999999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sending OTP...' : 'Send Verification OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="input-group">
                  <label htmlFor="otp">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    id="otp"
                    className="input"
                    placeholder="123456"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Verifying...' : 'Verify & Sign In'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOtpSent(false)}>
                  Back
                </button>
              </form>
            )}
          </div>
        )}

        {method === 'email' && (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {method === 'mock' && isDev && (
          <div className="mock-auth-container flex flex-col gap-4">
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
              ⚡ Developer bypass mode. Instantly sign in to local DB profiles.
            </p>
            <button className="btn btn-secondary" onClick={() => handleMockLogin('mock-customer')} disabled={submitting}>
              Login as Mock Customer
            </button>
            <button className="btn btn-secondary" onClick={() => handleMockLogin('mock-admin')} disabled={submitting}>
              Login as Mock Admin
            </button>
            <button className="btn btn-secondary" onClick={() => handleMockLogin('mock-superadmin')} disabled={submitting}>
              Login as Mock Super Admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default LoginModal;

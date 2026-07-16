import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { api } from './utils/api';
import { guestCartDB } from './utils/indexeddb';
import {
  setUser,
  clearUser,
  setLoading,
  showToast,
  setCart,
  setGuestItems,
} from '@raj-enterprises/shared-redux';
import type { RootState } from './store/store';

// Pages
import Home from './pages/Home';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistory from './pages/OrderHistory';
import ProfilePage from './pages/ProfilePage';
import WishlistPage from './pages/WishlistPage';

// Layout
import Navbar from './components/layout/Navbar';
import ToastContainer from './components/ui/ToastContainer';
import LoginModal from './components/auth/LoginModal';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Sync token getter interceptor with Mock Auth
  useEffect(() => {
    // Interceptor to inject mock token if present
    const mockTokenInterceptor = api.raw.interceptors.request.use((config) => {
      const mockToken = localStorage.getItem('dev_mock_token');
      if (mockToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${mockToken}`;
      }
      return config;
    });

    return () => {
      api.raw.interceptors.request.eject(mockTokenInterceptor);
    };
  }, []);

  const syncAndLoadCart = async () => {
    try {
      // 1. Fetch guest cart items from IndexedDB
      const guestItemsList = await guestCartDB.getAll();
      let cartRes;

      if (guestItemsList.length > 0) {
        // 2. Perform merge on backend
        cartRes = await api.cart.merge({
          items: guestItemsList.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            selected: i.selected,
          })),
        });
        // 3. Clear IndexedDB guest cart
        await guestCartDB.clear();
        dispatch(setGuestItems([]));
        dispatch(showToast({ message: 'Merged your guest cart items!', type: 'success' }));
      } else {
        // 4. Just retrieve the server cart
        cartRes = await api.cart.get();
      }

      dispatch(setCart(cartRes));
    } catch (err: any) {
      console.error('Failed to sync cart:', err);
    }
  };

  useEffect(() => {
    // Check for dev mock login first
    const mockToken = localStorage.getItem('dev_mock_token');
    if (mockToken) {
      dispatch(setLoading(true));
      api.auth.getMe()
        .then((dbUser) => {
          dispatch(setUser(dbUser));
          // Sync & load cart
          return syncAndLoadCart();
        })
        .catch(() => {
          localStorage.removeItem('dev_mock_token');
          dispatch(clearUser());
        })
        .finally(() => {
          dispatch(setLoading(false));
        });
      return;
    }

    // Standard Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      dispatch(setLoading(true));
      if (firebaseUser) {
        try {
          const dbUser = await api.auth.getMe();
          dispatch(setUser(dbUser));

          // Sync & load cart
          await syncAndLoadCart();
        } catch (err: any) {
          if (err.status === 404) {
            // User authenticated on Firebase but no profile in DB yet.
            try {
              const regUser = await api.auth.register({
                firebase_uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Valued Customer',
                email: firebaseUser.email || undefined,
                profile_image_url: firebaseUser.photoURL || undefined,
              });
              dispatch(setUser(regUser));
              dispatch(showToast({ message: 'Account registered successfully!', type: 'success' }));
              await syncAndLoadCart();
            } catch (regErr) {
              dispatch(clearUser());
            }
          } else {
            dispatch(clearUser());
          }
        }
      } else {
        dispatch(clearUser());
        // Load IndexedDB guest cart items into Redux for guest sessions
        guestCartDB.getAll().then((items) => {
          dispatch(setGuestItems(items));
        });
      }
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <div className="app">
      <Navbar onOpenLogin={() => setIsLoginOpen(true)} />
      <main className="main-content">
        <Routes>
          {/* Public / Customer Routes */}
          <Route path="/" element={<Home onOpenLogin={() => setIsLoginOpen(true)} />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage onOpenLogin={() => setIsLoginOpen(true)} />} />
          <Route path="/checkout" element={isAuthenticated ? <CheckoutPage /> : <Navigate to="/" replace />} />
          <Route path="/orders" element={isAuthenticated ? <OrderHistory /> : <Navigate to="/" replace />} />
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" replace />} />
          <Route path="/wishlist" element={isAuthenticated ? <WishlistPage /> : <Navigate to="/" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}

export default App;

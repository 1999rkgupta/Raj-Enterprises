import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../web/src/firebase';
import { api } from '../../web/src/utils/api';
import { setUser, clearUser, setLoading, showToast } from '@raj-enterprises/shared-redux';
import type { RootState } from './store';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ProductManagement from './pages/ProductManagement';
import OrderManagement from './pages/OrderManagement';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';

// Layout UI components
import ToastContainer from '../../web/src/components/ui/ToastContainer';

function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  // Sync token getter interceptor with Mock Auth
  useEffect(() => {
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

  useEffect(() => {
    // Check mock dev login first
    const mockToken = localStorage.getItem('dev_mock_token');
    if (mockToken) {
      dispatch(setLoading(true));
      api.auth.getMe()
        .then((dbUser) => {
          if (dbUser.role !== 'admin' && dbUser.role !== 'super_admin') {
            localStorage.removeItem('dev_mock_token');
            dispatch(clearUser());
            navigate('/login');
          } else {
            dispatch(setUser(dbUser));
          }
        })
        .catch(() => {
          localStorage.removeItem('dev_mock_token');
          dispatch(clearUser());
          navigate('/login');
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
          if (dbUser.role !== 'admin' && dbUser.role !== 'super_admin') {
            await signOut(auth);
            dispatch(clearUser());
            navigate('/login');
          } else {
            dispatch(setUser(dbUser));
          }
        } catch (err) {
          await signOut(auth);
          dispatch(clearUser());
          navigate('/login');
        }
      } else {
        dispatch(clearUser());
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      }
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch, navigate]);

  const handleLogout = async () => {
    localStorage.removeItem('dev_mock_token');
    await signOut(auth);
    dispatch(clearUser());
    dispatch(showToast({ message: 'Logged out successfully', type: 'info' }));
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <p className="text-secondary" style={{ fontSize: 'var(--text-lg)' }}>Loading administration dashboard...</p>
      </div>
    );
  }

  // Auth Guard
  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-app" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {isAuthenticated && (
        <aside className="admin-sidebar card-glass" style={{ width: 'var(--sidebar-width)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', borderRight: '1px solid var(--border-subtle)', borderRadius: 0 }}>
          <div className="logo flex items-center gap-3">
            <div className="logo-icon">RE</div>
            <span className="logo-text" style={{ fontWeight: 700 }}>Admin Panel</span>
          </div>

          <nav className="flex flex-col gap-2" style={{ flex: 1 }}>
            <Link to="/" className={`btn btn-secondary ${location.pathname === '/' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }}>
              📊 Dashboard
            </Link>
            <Link to="/users" className={`btn btn-secondary ${location.pathname === '/users' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }}>
              👥 User Management
            </Link>
            <Link to="/products" className={`btn btn-secondary ${location.pathname === '/products' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }}>
              📦 Product Catalog
            </Link>
            <Link to="/orders" className={`btn btn-secondary ${location.pathname === '/orders' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }}>
              🛒 Order History
            </Link>
            <Link to="/reports" className={`btn btn-secondary ${location.pathname === '/reports' ? 'btn-primary' : ''}`} style={{ justifyContent: 'flex-start' }}>
              📈 Reports
            </Link>
          </nav>

          <div className="sidebar-footer flex flex-col gap-4">
            <div style={{ fontSize: 'var(--text-xs)' }}>
              <Link to="/profile" className="text-secondary" style={{ fontWeight: 600, display: 'block', textDecoration: 'none' }}>
                👤 {user?.name}
              </Link>
              <p className="text-tertiary" style={{ textTransform: 'capitalize' }}>{user?.role.replace('_', ' ')}</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ width: '100%' }}>
              🚪 Log Out
            </button>
          </div>
        </aside>
      )}

      <main className="admin-main" style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;

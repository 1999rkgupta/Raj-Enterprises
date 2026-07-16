/**
 * Raj Enterprises — Navbar Component
 *
 * Top navigation with logo, menu, profile dropdown.
 * Profile icon shows initials fallback when no photo.
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store/store';
import './Navbar.css';

import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { clearCart, clearUser } from '@raj-enterprises/shared-redux';

interface NavbarProps {
  onOpenLogin: () => void;
}

function Navbar({ onOpenLogin }: NavbarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { cart, guestItems } = useSelector((state: RootState) => state.cart);

  const cartCount = isAuthenticated
    ? (cart?.total_items || 0)
    : guestItems.length;

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    localStorage.removeItem('dev_mock_token');
    await signOut(auth);
    dispatch(clearUser());
    dispatch(clearCart());
    navigate('/');
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <div className="logo-icon">RE</div>
          <span className="logo-text">Raj Enterprises</span>
        </Link>

        {/* Search Bar */}
        <div className="navbar-search" id="navbar-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search paints, tools, and more..."
            className="navbar-search-input"
            id="navbar-search-input"
          />
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Cart */}
          <Link to="/cart" className="navbar-action-btn" id="navbar-cart-btn" title="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </Link>

          {/* Wishlist */}
          <Link to="/wishlist" className="navbar-action-btn" id="navbar-wishlist-btn" title="Wishlist">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>

          {/* Profile */}
          <div className="navbar-profile" ref={profileRef}>
            <button
              className="navbar-profile-btn"
              id="navbar-profile-btn"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              title="Profile"
            >
              {user?.profile_image_url ? (
                <img src={user.profile_image_url} alt={user.name} className="profile-avatar" />
              ) : (
                <div className="profile-initials">{userInitials}</div>
              )}
            </button>

            {isProfileOpen && (
              <div className="profile-dropdown animate-scale-in" id="profile-dropdown">
                {isAuthenticated ? (
                  <>
                    <div className="profile-dropdown-header">
                      <span className="profile-dropdown-name">{user?.name}</span>
                      <span className="profile-dropdown-email">{user?.email || user?.mobile || ''}</span>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <Link to="/cart" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                      🛒 Cart
                    </Link>
                    <Link to="/wishlist" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                      ❤️ Wishlist
                    </Link>
                    <Link to="/orders" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                      📦 Order History
                    </Link>
                    <Link to="/profile" className="profile-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                      👤 Edit Profile
                    </Link>
                    <div className="profile-dropdown-divider" />
                    <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div className="profile-dropdown-header">
                      <span className="profile-dropdown-name">Welcome</span>
                      <span className="profile-dropdown-email">Sign in to continue</span>
                    </div>
                    <div className="profile-dropdown-divider" />
                    <button className="profile-dropdown-item btn-primary" style={{ margin: '8px', borderRadius: '8px' }} onClick={() => {
                      setIsProfileOpen(false);
                      onOpenLogin();
                    }}>
                      Sign In
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="navbar-mobile-toggle"
            id="navbar-mobile-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

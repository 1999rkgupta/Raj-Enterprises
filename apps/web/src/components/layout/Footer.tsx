import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import './Footer.css';

interface FooterProps {
  onOpenLogin?: () => void;
}

export function Footer({ onOpenLogin }: FooterProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const handleProtectedNavigation = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate(path);
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } else {
      if (onOpenLogin) {
        onOpenLogin();
      }
    }
  };

  const handleScrollToCatalog = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer" id="main-footer">
      <div className="container footer-inner">
        <div className="footer-grid">
          {/* Company Info */}
          <div className="footer-col footer-brand">
            <Link to="/" className="footer-logo" onClick={e => handleNav(e, '/')}>
              <div className="logo-icon">RE</div>
              <span className="footer-logo-text">Raj Enterprises</span>
            </Link>
            <p className="footer-desc text-secondary">
              Premier manufacturer of industrial paints, high-precision hardware parts, and heavy-duty chemical formulations. Supplying quality products directly from factory to retail and enterprise clients.
            </p>
            <div className="footer-badges flex gap-2">
              <span className="badge badge-primary">🏭 Manufacturer</span>
              <span className="badge badge-success">🛡️ ISO Certified</span>
            </div>
          </div>

          {/* Menu Shortcuts */}
          <div className="footer-col">
            <h4 className="footer-heading">Menu Shortcuts</h4>
            <ul className="footer-links">
              <li><a href="/" onClick={e => handleNav(e, '/')}>🏠 Home</a></li>
              <li><a href="#catalog-section" onClick={handleScrollToCatalog}>📦 Product Catalog</a></li>
              <li><a href="/cart" onClick={e => handleNav(e, '/cart')}>🛒 Cart</a></li>
              <li><a href="/wishlist" onClick={e => handleProtectedNavigation(e, '/wishlist')}>❤️ Wishlist</a></li>
              <li><a href="/orders" onClick={e => handleProtectedNavigation(e, '/orders')}>📦 Order History</a></li>
              <li><a href="/profile" onClick={e => handleProtectedNavigation(e, '/profile')}>👤 Account Profile</a></li>
            </ul>
          </div>

          {/* Product Lines */}
          <div className="footer-col">
            <h4 className="footer-heading">Our Product Lines</h4>
            <ul className="footer-links">
              <li><a href="#catalog-section" onClick={handleScrollToCatalog}>🎨 Industrial & Decorative Paints</a></li>
              <li><a href="#catalog-section" onClick={handleScrollToCatalog}>⚙️ Precision Hardware Parts</a></li>
              <li><a href="#catalog-section" onClick={handleScrollToCatalog}>🧪 Speciality Chemical Products</a></li>
              <li><a href="#catalog-section" onClick={handleScrollToCatalog}>🛡️ Surface Primers & Solvents</a></li>
              <li><a href="#catalog-section" onClick={handleScrollToCatalog}>🔧 Construction & Tool Fittings</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="footer-col">
            <h4 className="footer-heading">Contact & Support</h4>
            <ul className="footer-contact-info text-secondary">
              <li>
                <span className="info-icon">📍</span>
                <span>Gidha, Bhojpur, Bihar - 802314</span>
              </li>
              <li>
                <span className="info-icon">📞</span>
                <span>+91 79968 39274 / Factory Sales</span>
              </li>
              <li>
                <span className="info-icon">✉️</span>
                <span>sales@rajenterprises.com</span>
              </li>
              <li>
                <span className="info-icon">⏰</span>
                <span>Mon - Sat: 9:00 AM - 7:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom flex justify-between items-center">
          <p className="copyright-text text-tertiary">
            © {new Date().getFullYear()} Raj Enterprises. All rights reserved. Paints, Hardware Parts & Chemical Manufacturing.
          </p>
          <div className="footer-legal flex gap-4">
            <span className="text-tertiary">Privacy Policy</span>
            <span className="text-tertiary">Terms of Supply</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

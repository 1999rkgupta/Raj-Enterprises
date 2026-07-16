import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store/store';
import {
  setProducts,
  setCategories as setReduxCategories,
  setProductsLoading,
  showToast,
} from '@raj-enterprises/shared-redux';
import { api } from '../utils/api';
import ProductCard from '../components/product/ProductCard';
import './Home.css';

interface HomeProps {
  onOpenLogin: () => void;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
  is_active: boolean;
  subcategories: Category[];
}

export function Home({ onOpenLogin }: HomeProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { products, total, page, hasMore, isLoading, categories } = useSelector(
    (state: RootState) => state.products
  );

  // Local filters state (mirrored from/to Redux to orchestrate fetch calls)
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await api.categories.list();
      dispatch(setReduxCategories(res.categories));
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  // Fetch Products
  const fetchProductsList = async (pageNum: number, categoryId: string | null, search: string, append = false) => {
    dispatch(setProductsLoading(true));
    try {
      const res = await api.products.list({
        page: pageNum,
        page_size: 12,
        category: categoryId || undefined,
        search: search || undefined,
      });

      dispatch(
        setProducts({
          products: res.products,
          total: res.total,
          page: pageNum,
          has_more: res.has_more,
          append,
        })
      );
    } catch (err: any) {
      dispatch(showToast({ message: 'Failed to fetch catalog', type: 'error' }));
    } finally {
      dispatch(setProductsLoading(false));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Initial fetch or filter change reset
    setActivePage(1);
    fetchProductsList(1, selectedCat, searchQuery, false);
  }, [selectedCat, searchQuery]);

  const handleLoadMore = () => {
    const nextPage = activePage + 1;
    setActivePage(nextPage);
    fetchProductsList(nextPage, selectedCat, searchQuery, true);
  };

  const handleShopNow = () => {
    if (isAuthenticated) {
      navigate('/cart');
    } else {
      onOpenLogin();
    }
  };

  return (
    <div className="home-page" id="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="container hero-content animate-fade-in-up">
          <div className="hero-text">
            <span className="hero-badge badge badge-primary">Factory Direct Prices</span>
            <h1 className="hero-title">
              Transform Your Space with <span className="text-gradient">Premium Paints</span>
            </h1>
            <p className="hero-description">
              Raj Enterprises brings you factory-fresh paints, wood finishes, primers, 
              and professional tools — delivered straight to your doorstep at unbeatable prices.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" id="hero-shop-btn" onClick={handleShopNow}>
                Shop Now
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button className="btn btn-secondary btn-lg" id="hero-catalog-btn" onClick={() => {
                document.getElementById('catalog-header')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                View Catalog
              </button>
            </div>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">500+</span>
              <span className="hero-stat-label">Products</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">10K+</span>
              <span className="hero-stat-label">Happy Customers</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-value">15+</span>
              <span className="hero-stat-label">Years Experience</span>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog & Shop Section */}
      <section className="catalog-section container" id="catalog-section">
        <div className="catalog-header flex justify-between items-center" id="catalog-header" style={{ marginBottom: 'var(--space-8)' }}>
          <div>
            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 'var(--space-1)' }}>Explore Our Catalog</h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Premium coatings directly from the manufacturer</p>
          </div>
          
          {/* Direct Search Bar */}
          <div className="catalog-search card-glass" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)', width: '320px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tertiary">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: 'var(--text-sm)' }}
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="category-chips flex gap-2" style={{ overflowX: 'auto', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <button
            className={`chip btn-secondary btn-sm ${selectedCat === null ? 'active-chip' : ''}`}
            onClick={() => setSelectedCat(null)}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            All Products
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              className={`chip btn-secondary btn-sm ${selectedCat === cat.id ? 'active-chip' : ''}`}
              onClick={() => setSelectedCat(cat.id)}
              style={{ borderRadius: 'var(--radius-full)' }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {isLoading && products.length === 0 ? (
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card skeleton-card">
                <div className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-md)' }} />
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div className="skeleton" style={{ height: '18px', width: '80%' }} />
                  <div className="skeleton" style={{ height: '14px', width: '50%' }} />
                  <div className="skeleton" style={{ height: '24px', width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex justify-center items-center flex-col card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🎨</span>
            <h3 style={{ marginTop: 'var(--space-4)' }}>No products found</h3>
            <p className="text-secondary" style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
              We couldn't find any paints matching your filters. Try selecting a different category or refining your search.
            </p>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} onOpenLogin={onOpenLogin} />
              ))}
            </div>

            {/* Pagination trigger */}
            {hasMore && (
              <div className="flex justify-center" style={{ marginTop: 'var(--space-10)' }}>
                <button className="btn btn-secondary btn-lg" onClick={handleLoadMore} disabled={isLoading}>
                  {isLoading ? 'Loading catalog...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Home;

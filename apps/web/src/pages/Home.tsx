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
import ScrollReveal from '../components/ui/ScrollReveal';
import PageTransition from '../components/ui/PageTransition';
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
  const { products, isLoading, categories } = useSelector(
    (state: RootState) => state.products
  );

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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

      setHasMore(res.has_more);
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
    <PageTransition className="home-page" id="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="container hero-content">
          <ScrollReveal direction="up" delay={0.1}>
            <div className="hero-text">
              <span className="hero-badge badge badge-primary">Factory Direct Manufacturer</span>
              <h1 className="hero-title">
                Leading Manufacturer of <span className="text-gradient">Paints, Hardware & Chemicals</span>
              </h1>
              <p className="hero-description">
                Raj Enterprises is a premier manufacturer and wholesale supplier of high-performance paints,
                precision hardware parts, and speciality chemical formulations — delivered direct from our factory.
              </p>
              <div className="hero-actions">
                <button className="btn btn-primary btn-lg" id="hero-shop-btn" onClick={handleShopNow}>
                  Explore Products
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
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.25}>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">100+</span>
                <span className="hero-stat-label">Products</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">1K+</span>
                <span className="hero-stat-label">Clients Served</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">10+</span>
                <span className="hero-stat-label">Years Manufacturing</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Catalog & Shop Section */}
      <section className="catalog-section container" id="catalog-section">
        <ScrollReveal direction="up" delay={0.1}>
          <div className="catalog-header" id="catalog-header">
            <div className="catalog-title-group">
              <div className="catalog-badge-row">
                <span className="badge badge-primary">Direct Factory Inventory</span>
              </div>
              <h2 className="catalog-title">
                Explore Our <span className="text-gradient">Catalog</span>
              </h2>
              <p className="catalog-subtitle">High-Performance Paints, Precision Hardware Parts & Chemical Solutions</p>
            </div>

            {/* Sleek Glass Search Bar */}
            <div className="catalog-search" id="catalog-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="catalog-search-input"
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')} title="Clear search">✕</button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Category Filter Chips */}
        <ScrollReveal direction="up" delay={0.15}>
          <div className="category-chips flex gap-2" style={{ overflowX: 'auto', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
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
        </ScrollReveal>

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
            <span style={{ fontSize: '3rem' }}>📦</span>
            <h3 style={{ marginTop: 'var(--space-4)' }}>No products found</h3>
            <p className="text-secondary" style={{ maxWidth: '400px', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
              We couldn't find any products matching your filters. Try selecting a different category or refining your search.
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
              <div className="flex justify-center load-more-container" style={{ marginTop: 'var(--space-8)' }}>
                <button className="btn btn-secondary load-more-btn" onClick={handleLoadMore} disabled={isLoading}>
                  {isLoading ? 'Loading catalog...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </PageTransition>
  );
}

export default Home;

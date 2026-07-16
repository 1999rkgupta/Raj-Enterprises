import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { showToast } from '@raj-enterprises/shared-redux';
import { createApiClient } from '@raj-enterprises/api-client';
import { auth } from '../../../../apps/web/src/firebase';
import './ProductManagement.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    const user = auth.currentUser;
    return user ? user.getIdToken(true) : localStorage.getItem('dev_mock_token');
  },
});

interface ProductAdmin {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string;
  images: string[];
  price: number;
  status: string;
  is_low_stock: boolean;
  in_stock: boolean;
  stock_count: number;
  sku: string;
  low_stock_threshold: number;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string;
  is_active: boolean;
  subcategories: Category[];
}

export function ProductManagement() {
  const dispatch = useDispatch();

  const [searchParams] = useSearchParams();
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    if (searchParams.get('filter') === 'low-stock') {
      setShowLowStockOnly(true);
    }
  }, [searchParams]);

  // List States
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<{ id: string; name: string }[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Add/Edit Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [stockCount, setStockCount] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState('active');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await api.categories.list();
      setCategories(res.categories);
      
      // Flatten helper
      const flat: { id: string; name: string }[] = [];
      const flatten = (cats: Category[]) => {
        cats.forEach(c => {
          flat.push({ id: c.id, name: c.name });
          if (c.subcategories && c.subcategories.length > 0) {
            flatten(c.subcategories);
          }
        });
      };
      flatten(res.categories);
      setFlatCategories(flat);
    } catch (err: any) {
      dispatch(showToast({ message: 'Failed to load categories', type: 'error' }));
    }
  };

  // Fetch Products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.admin.listProducts({
        page,
        page_size: 10,
        search: search || undefined,
        category: selectedCatFilter || undefined,
        product_status: selectedStatusFilter || undefined,
      });
      setProducts(res.products);
      setTotalProducts(res.total);
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to load products', type: 'error' }));
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCatFilter, selectedStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  // Open modal for new product
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setTitle('');
    setSku('');
    setDescription('');
    setCategoryId('');
    setPrice('');
    setStockCount('');
    setLowStockThreshold('5');
    setImages([]);
    setStatus('active');
    setShowProductModal(true);
  };

  // Open modal for editing
  const handleOpenEditProduct = (p: ProductAdmin) => {
    setEditingProductId(p.id);
    setTitle(p.title);
    setSku(p.sku);
    setDescription(p.description);
    setCategoryId(p.category_id);
    setPrice(p.price.toString());
    setStockCount(p.stock_count.toString());
    setLowStockThreshold(p.low_stock_threshold.toString());
    setImages(p.images);
    setStatus(p.status);
    setShowProductModal(true);
  };

  // File upload trigger
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const uploadedRelativePaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await api.admin.uploadImage(file);
        uploadedRelativePaths.push(res.relative_path);
      }
      setImages([...images, ...uploadedRelativePaths]);
      dispatch(showToast({ message: 'Images uploaded successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to upload image.', type: 'error' }));
    } finally {
      setUploadingImage(false);
    }
  };

  // Save product details
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    const productData = {
      title,
      description,
      category_id: categoryId,
      images,
      price: parseFloat(price),
      stock_count: parseInt(stockCount),
      sku,
      low_stock_threshold: parseInt(lowStockThreshold),
      status: status as any,
    };

    try {
      if (editingProductId) {
        await api.admin.updateProduct(editingProductId, productData);
        dispatch(showToast({ message: 'Product updated successfully!', type: 'success' }));
      } else {
        await api.admin.createProduct(productData);
        dispatch(showToast({ message: 'Product created successfully!', type: 'success' }));
      }
      setShowProductModal(false);
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to save product.', type: 'error' }));
    } finally {
      setSavingProduct(false);
    }
  };

  // Soft deactivate actions
  const handleMarkInactive = async (p: ProductAdmin) => {
    if (!confirm(`Are you sure you want to mark product "${p.title}" as inactive (soft delete)?`)) return;
    try {
      await api.admin.markProductInactive(p.id);
      dispatch(showToast({ message: 'Product soft deactivated.', type: 'success' }));
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to deactivate product.', type: 'error' }));
    }
  };

  const handleMarkOutOfStock = async (p: ProductAdmin) => {
    if (!confirm(`Are you sure you want to mark product "${p.title}" out of stock?`)) return;
    try {
      await api.admin.markProductOutOfStock(p.id);
      dispatch(showToast({ message: 'Product marked as out of stock.', type: 'success' }));
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to mark out of stock.', type: 'error' }));
    }
  };

  const handleRevertStatus = async (p: ProductAdmin) => {
    try {
      await api.admin.updateProduct(p.id, { status: 'active' as any });
      dispatch(showToast({ message: 'Product set to Active successfully!', type: 'success' }));
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to activate product.', type: 'error' }));
    }
  };

  const handleAddStock = async (p: ProductAdmin) => {
    const input = prompt(`Add more stock for "${p.title}" (current: ${p.stock_count}):`, "10");
    if (input === null) return;
    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }
    try {
      const newStock = p.stock_count + amount;
      const updateData: any = { stock_count: newStock };
      if (p.status === 'out_of_stock' || p.status === 'inactive') {
        updateData.status = 'active';
      }
      await api.admin.updateProduct(p.id, updateData);
      dispatch(showToast({ message: `Successfully added ${amount} units of stock.`, type: 'success' }));
      fetchProducts();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to update stock.', type: 'error' }));
    }
  };

  // Save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCategory(true);
    try {
      await api.admin.createCategory({
        name: newCategoryName,
        parent_id: newCategoryParent || undefined,
      });
      dispatch(showToast({ message: 'Category created successfully!', type: 'success' }));
      setNewCategoryName('');
      setNewCategoryParent('');
      setShowCategoryModal(false);
      fetchCategories();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to create category.', type: 'error' }));
    } finally {
      setSavingCategory(false);
    }
  };

  const displayedProducts = showLowStockOnly
    ? products.filter(p => p.stock_count <= p.low_stock_threshold)
    : products;

  return (
    <div className="product-management-page container animate-fade-in" id="admin-product-management">
      <div className="flex justify-between items-center header-section">
        <h1 className="text-gradient">Product & Catalog Management</h1>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
            + Add Category
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddProduct}>
            + Add Product
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-4 filters-form card-glass" style={{ padding: 'var(--space-4)', margin: 'var(--space-6) 0' }}>
        <input
          type="text"
          className="input"
          placeholder="Search products by title, description or SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 2 }}
        />
        <select
          className="input"
          value={selectedCatFilter}
          onChange={e => setSelectedCatFilter(e.target.value)}
          style={{ flex: 1, background: 'var(--bg-secondary)' }}
        >
          <option value="">All Categories</option>
          {flatCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="input"
          value={selectedStatusFilter}
          onChange={e => setSelectedStatusFilter(e.target.value)}
          style={{ flex: 1, background: 'var(--bg-secondary)' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="out_of_stock">Out Of Stock</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="submit" className="btn btn-secondary">Filter</button>
      </form>

      {showLowStockOnly && (
        <div className="card-glass flex justify-between items-center animate-fade-in" style={{ padding: 'var(--space-3)', margin: '0 0 var(--space-4) 0', borderRadius: 'var(--radius-md)', borderColor: 'var(--color-warning)' }}>
          <span className="text-secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>⚠️ Showing Low Stock Items Only</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowLowStockOnly(false)}>Show All Products</button>
        </div>
      )}

      {/* Products Grid/Table */}
      <div className="card table-card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Details</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingProducts ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Loading catalog...</td></tr>
            ) : displayedProducts.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>No products found matching filters.</td></tr>
            ) : (
              displayedProducts.map(p => (
                <tr key={p.id}>
                  <td><code>{p.sku}</code></td>
                  <td>
                    <div className="flex items-center gap-3">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0]} alt={p.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)' }}>🎨</div>
                      )}
                      <div>
                        <strong>{p.title}</strong>
                      </div>
                    </div>
                  </td>
                  <td className="text-secondary">{p.category_name || '—'}</td>
                  <td>₹{p.price.toFixed(2)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span>{p.stock_count}</span>
                      {p.stock_count <= p.low_stock_threshold && p.stock_count > 0 && (
                        <span className="badge badge-warning" style={{ fontSize: '8px', padding: '1px 4px' }}>Low Stock</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${p.status === 'active' ? 'badge-success' : p.status === 'inactive' ? 'badge-danger' : 'badge-warning'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditProduct(p)}>Edit</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAddStock(p)} style={{ background: 'rgba(0, 212, 170, 0.1)', borderColor: 'rgba(0, 212, 170, 0.3)' }}>+ Stock</button>
                      {p.status === 'active' ? (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleMarkOutOfStock(p)}>Set Out of Stock</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleMarkInactive(p)}>Archive</button>
                        </>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => handleRevertStatus(p)}>Activate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center pagination-row" style={{ marginTop: 'var(--space-6)' }}>
        <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
          Showing {displayedProducts.length} of {totalProducts} products
        </span>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <button className="btn btn-secondary btn-sm" disabled={page * 10 >= totalProducts} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-content card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setShowProductModal(false)}>&times;</button>
            <h2>{editingProductId ? 'Edit Product' : 'Add New Product'}</h2>
            
            <form onSubmit={handleSaveProduct} className="flex flex-col gap-4" style={{ marginTop: 'var(--space-6)' }}>
              <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label htmlFor="prod-title">Product Title</label>
                  <input
                    type="text"
                    id="prod-title"
                    className="input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="prod-sku">SKU Code</label>
                  <input
                    type="text"
                    id="prod-sku"
                    className="input"
                    placeholder="RE-PAINT-01"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="prod-desc">Description</label>
                <textarea
                  id="prod-desc"
                  className="input"
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label htmlFor="prod-cat">Category</label>
                  <select
                    id="prod-cat"
                    className="input"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    required
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <option value="">Select Category</option>
                    {flatCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="prod-price">UnitPrice (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    id="prod-price"
                    className="input"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label htmlFor="prod-stock">{editingProductId ? 'Current Stock' : 'Initial Stock'}</label>
                  <input
                    type="number"
                    id="prod-stock"
                    className="input"
                    value={stockCount}
                    onChange={e => setStockCount(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="prod-threshold">Alert Threshold</label>
                  <input
                    type="number"
                    id="prod-threshold"
                    className="input"
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="prod-status">Product Status</label>
                  <select
                    id="prod-status"
                    className="input"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    required
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <option value="active">Active</option>
                    <option value="out_of_stock">Out Of Stock</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Multi-Image Upload Dropzone */}
              <div className="input-group">
                <label>Product Images</label>
                <div className="images-uploader-box card-glass flex flex-col items-center justify-center gap-2" style={{ border: '2px dashed var(--border-default)', padding: 'var(--space-6)', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  <span>📁 Drag or Click to upload images</span>
                  <span className="text-tertiary" style={{ fontSize: 'var(--text-xs)' }}>Supports Jpeg, Png, Webp</span>
                </div>
                {uploadingImage && <p className="text-secondary" style={{ fontSize: 'var(--text-xs)' }}>Uploading files...</p>}

                {/* Previews */}
                <div className="uploaded-images-row flex gap-2" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {images.map((img, idx) => (
                    <div key={idx} className="image-preview-container" style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" className="delete-img-btn" onClick={() => setImages(images.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', color: 'white' }}>
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4" style={{ marginTop: 'var(--space-4)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingProduct}>
                  {savingProduct ? 'Saving Catalog...' : 'Save Product'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '100%' }}>
            <button className="modal-close" onClick={() => setShowCategoryModal(false)}>&times;</button>
            <h2>Create Catalog Category</h2>
            
            <form onSubmit={handleSaveCategory} className="flex flex-col gap-4" style={{ marginTop: 'var(--space-6)' }}>
              <div className="input-group">
                <label htmlFor="cat-name">Category Name</label>
                <input
                  type="text"
                  id="cat-name"
                  className="input"
                  placeholder="e.g. Wall Primers"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="cat-parent">Parent Category (Optional)</label>
                <select
                  id="cat-parent"
                  className="input"
                  value={newCategoryParent}
                  onChange={e => setNewCategoryParent(e.target.value)}
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <option value="">None (Top Level Category)</option>
                  {flatCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4" style={{ marginTop: 'var(--space-4)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingCategory}>
                  {savingCategory ? 'Creating...' : 'Save Category'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default ProductManagement;

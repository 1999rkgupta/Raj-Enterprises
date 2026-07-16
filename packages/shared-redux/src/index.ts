/**
 * Raj Enterprises — Shared Redux Slices
 *
 * These slices are shared between web and mobile apps.
 * Business logic lives here to ensure consistent behavior.
 */

export { authSlice, setUser, clearUser, setLoading, setAuthError } from './slices/authSlice';
export { cartSlice, setCart, clearCart, setCartLoading, setGuestItems, addGuestItem, updateGuestItem, removeGuestItem } from './slices/cartSlice';
export { productsSlice, setProducts, setProductsLoading, setSearchQuery, setSelectedCategory, setCategories } from './slices/productsSlice';
export { ordersSlice, setOrders, setOrdersLoading } from './slices/ordersSlice';
export { wishlistSlice, setWishlist, toggleWishlistItem } from './slices/wishlistSlice';
export { uiSlice, setTheme, showToast, hideToast, setNotificationsEnabled } from './slices/uiSlice';

// Re-export types
export type { AuthState } from './slices/authSlice';
export type { CartState } from './slices/cartSlice';
export type { ProductsState } from './slices/productsSlice';
export type { OrdersState } from './slices/ordersSlice';
export type { WishlistState } from './slices/wishlistSlice';
export type { UIState, Toast } from './slices/uiSlice';

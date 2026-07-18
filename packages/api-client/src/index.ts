/**
 * Raj Enterprises — Typed API Client
 *
 * Axios-based SDK with Firebase token injection.
 * All endpoints typed with request/response from shared-types.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type {
  User, UserCreateRequest, UserUpdateRequest, AddressRequest,
  Product, ProductListResponse, ProductAdminListResponse,
  ProductCreateRequest, ProductUpdateRequest,
  Category, CategoryListResponse, CategoryCreateRequest,
  CartResponse, CartItemAddRequest, CartItemUpdateRequest, CartMergeRequest,
  Order, OrderListResponse, OrderCreateRequest,
  OrderStatusUpdateRequest, PaymentRecordRequest,
  WishlistResponse,
  DashboardSummary, SalesReport,
  AuthVerifyResponse, MessageResponse,
} from '@raj-enterprises/shared-types';

// ==================== Client Configuration ====================

export interface ApiClientConfig {
  baseURL: string;
  getAuthToken?: () => Promise<string | null>;
}

// ==================== API Error ====================

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiError';
  }
}

// ==================== API Client ====================

export function createApiClient(config: ApiClientConfig) {
  const client: AxiosInstance = axios.create({
    baseURL: config.baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request interceptor: inject Firebase auth token
  client.interceptors.request.use(async (reqConfig) => {
    if (config.getAuthToken) {
      const token = await config.getAuthToken();
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
    }
    return reqConfig;
  });

  // Response interceptor: normalize errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ detail?: string }>) => {
      const status = error.response?.status || 500;
      const detail = error.response?.data?.detail || error.message || 'Unknown error';
      throw new ApiError(status, detail);
    }
  );

  return {
    // ===== Auth =====
    auth: {
      register: (data: UserCreateRequest) =>
        client.post<User>('/api/auth/register', data).then(r => r.data),

      getMe: () =>
        client.get<User>('/api/auth/me').then(r => r.data),

      verifyToken: () =>
        client.post<AuthVerifyResponse>('/api/auth/verify-token').then(r => r.data),
    },

    // ===== Users =====
    users: {
      updateProfile: (data: UserUpdateRequest) =>
        client.put<User>('/api/users/profile', data).then(r => r.data),

      uploadProfileImage: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return client.post<{ profile_image_url: string }>('/api/users/profile-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
      },

      addAddress: (data: AddressRequest) =>
        client.post<MessageResponse>('/api/users/addresses', data).then(r => r.data),

      updateAddress: (index: number, data: AddressRequest) =>
        client.put<MessageResponse>(`/api/users/addresses/${index}`, data).then(r => r.data),

      deleteAddress: (index: number) =>
        client.delete<MessageResponse>(`/api/users/addresses/${index}`).then(r => r.data),
    },

    // ===== Products =====
    products: {
      list: (params?: { page?: number; page_size?: number; category?: string; search?: string; sort_by?: string; sort_order?: string }) =>
        client.get<ProductListResponse>('/api/products', { params }).then(r => r.data),

      get: (id: string) =>
        client.get<Product>(`/api/products/${id}`).then(r => r.data),
    },

    // ===== Categories =====
    categories: {
      list: () =>
        client.get<CategoryListResponse>('/api/categories').then(r => r.data),

      get: (id: string) =>
        client.get<Category>(`/api/categories/${id}`).then(r => r.data),
    },

    // ===== Cart =====
    cart: {
      get: () =>
        client.get<CartResponse>('/api/cart').then(r => r.data),

      addItem: (data: CartItemAddRequest) =>
        client.post<CartResponse>('/api/cart/items', data).then(r => r.data),

      updateItem: (productId: string, data: CartItemUpdateRequest) =>
        client.put<CartResponse>(`/api/cart/items/${productId}`, data).then(r => r.data),

      removeItem: (productId: string) =>
        client.delete<CartResponse>(`/api/cart/items/${productId}`).then(r => r.data),

      merge: (data: CartMergeRequest) =>
        client.post<CartResponse>('/api/cart/merge', data).then(r => r.data),

      clear: () =>
        client.delete<MessageResponse>('/api/cart').then(r => r.data),
    },

    // ===== Orders =====
    orders: {
      place: (data: OrderCreateRequest) =>
        client.post<Order>('/api/orders', data).then(r => r.data),

      list: (params?: { page?: number; page_size?: number; month?: number; year?: number; order_status?: string }) =>
        client.get<OrderListResponse>('/api/orders', { params }).then(r => r.data),

      get: (id: string) =>
        client.get<Order>(`/api/orders/${id}`).then(r => r.data),
    },

    // ===== Wishlist =====
    wishlist: {
      get: () =>
        client.get<WishlistResponse>('/api/wishlist').then(r => r.data),

      toggle: (productId: string) =>
        client.post<{ action: string; product_id: string }>('/api/wishlist/toggle', { product_id: productId }).then(r => r.data),
    },

    // ===== Admin =====
    admin: {
      // Dashboard
      getDashboard: () =>
        client.get<DashboardSummary>('/api/admin/dashboard/summary').then(r => r.data),

      // Users
      listCustomers: (params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) =>
        client.get('/api/admin/users/customers', { params }).then(r => r.data),

      listAdmins: () =>
        client.get('/api/admin/users/admins').then(r => r.data),

      createAdmin: (data: { firebase_uid: string; name: string; email?: string; mobile?: string }) =>
        client.post('/api/admin/users/create-admin', data).then(r => r.data),

      updateAdminProfile: (userId: string, data: { name?: string; email?: string; mobile?: string; role?: string }) =>
        client.put<MessageResponse>(`/api/admin/users/${userId}/profile`, data).then(r => r.data),

      deactivateUser: (userId: string) =>
        client.put(`/api/admin/users/${userId}/deactivate`).then(r => r.data),

      activateUser: (userId: string) =>
        client.put(`/api/admin/users/${userId}/activate`).then(r => r.data),

      getUserOrders: (userId: string, params?: { page?: number; page_size?: number }) =>
        client.get(`/api/admin/users/${userId}/orders`, { params }).then(r => r.data),

      // Products
      listProducts: (params?: { page?: number; page_size?: number; search?: string; category?: string; product_status?: string }) =>
        client.get<ProductAdminListResponse>('/api/admin/products', { params }).then(r => r.data),

      createProduct: (data: ProductCreateRequest) =>
        client.post('/api/admin/products', data).then(r => r.data),

      updateProduct: (id: string, data: ProductUpdateRequest) =>
        client.put(`/api/admin/products/${id}`, data).then(r => r.data),

      markProductInactive: (id: string) =>
        client.put(`/api/admin/products/${id}/mark-inactive`).then(r => r.data),

      markProductOutOfStock: (id: string) =>
        client.put(`/api/admin/products/${id}/mark-out-of-stock`).then(r => r.data),

      uploadImage: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return client.post('/api/admin/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).then(r => r.data);
      },

      createCategory: (data: CategoryCreateRequest) =>
        client.post('/api/admin/products/categories', data).then(r => r.data),

      updateCategory: (id: string, data: { name?: string; is_active?: boolean }) =>
        client.put(`/api/admin/products/categories/${id}`, data).then(r => r.data),

      // Orders
      listOrders: (params?: { page?: number; page_size?: number; search?: string; order_status?: string; payment_status?: string; date_from?: string; date_to?: string }) =>
        client.get('/api/admin/orders', { params }).then(r => r.data),

      updateOrderStatus: (orderId: string, data: OrderStatusUpdateRequest) =>
        client.put(`/api/admin/orders/${orderId}/status`, data).then(r => r.data),

      recordPayment: (orderId: string, data: PaymentRecordRequest) =>
        client.post(`/api/admin/orders/${orderId}/payment`, data).then(r => r.data),

      getDuesDashboard: () =>
        client.get('/api/admin/orders/dues').then(r => r.data),

      // Reports
      getSalesReport: (params?: { period?: string; year?: number; month?: number }) =>
        client.get<SalesReport>('/api/admin/reports/sales', { params }).then(r => r.data),

      exportSalesExcel: (params?: { period?: string; year?: number; month?: number }) =>
        client.get('/api/admin/reports/sales/export/excel', { params, responseType: 'blob' }).then(r => r.data),

      exportSalesPdf: (params?: { period?: string; year?: number; month?: number }) =>
        client.get('/api/admin/reports/sales/export/pdf', { params, responseType: 'blob' }).then(r => r.data),
    },

    // Raw client for custom requests
    raw: client,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
export default createApiClient;

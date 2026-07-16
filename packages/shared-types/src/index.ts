/**
 * Raj Enterprises — Shared TypeScript Types
 *
 * These interfaces mirror the Pydantic models in the FastAPI backend.
 * Any schema change must be reflected here to maintain type safety.
 */

// ==================== Enums ====================

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  PACKED = 'packed',
  DISPATCHED = 'dispatched',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

// ==================== Address ====================

export interface Address {
  label: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  is_default: boolean;
}

// ==================== User ====================

export interface User {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  shop_name?: string;
  addresses: Address[];
  role: UserRole;
  profile_image_url?: string;
  is_active: boolean;
  notification_opt_in: boolean;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAdmin extends User {
  firebase_uid: string;
  last_active_at?: string;
  metadata: Record<string, unknown>;
}

export interface UserCreateRequest {
  firebase_uid: string;
  name: string;
  mobile?: string;
  email?: string;
  shop_name?: string;
  profile_image_url?: string;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  mobile?: string;
  shop_name?: string;
  profile_image_url?: string;
  notification_opt_in?: boolean;
}

export interface AddressRequest {
  label?: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  is_default?: boolean;
}

// ==================== Product ====================

export interface Product {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string;
  images: string[];
  price: number;
  status: ProductStatus;
  is_low_stock: boolean;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductAdmin extends Product {
  stock_count: number;
  sku: string;
  low_stock_threshold: number;
  metadata: Record<string, unknown>;
}

export interface ProductCreateRequest {
  title: string;
  description: string;
  category_id: string;
  images?: string[];
  price: number;
  stock_count: number;
  sku: string;
  low_stock_threshold?: number;
}

export interface ProductUpdateRequest {
  title?: string;
  description?: string;
  category_id?: string;
  images?: string[];
  price?: number;
  stock_count?: number;
  sku?: string;
  low_stock_threshold?: number;
  status?: ProductStatus;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface ProductAdminListResponse {
  products: ProductAdmin[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ==================== Category ====================

export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  is_active: boolean;
  subcategories: Category[];
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
}

export interface CategoryCreateRequest {
  name: string;
  parent_id?: string;
}

// ==================== Cart ====================

export interface CartItem {
  product_id: string;
  quantity: number;
  selected: boolean;
}

export interface CartItemResponse {
  product_id: string;
  product_title: string;
  product_image?: string;
  price: number;
  quantity: number;
  selected: boolean;
  in_stock: boolean;
  max_quantity: number;
  subtotal: number;
}

export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  total_items: number;
  selected_items_count: number;
  subtotal: number;
  updated_at: string;
}

export interface CartItemAddRequest {
  product_id: string;
  quantity?: number;
}

export interface CartItemUpdateRequest {
  quantity?: number;
  selected?: boolean;
}

export interface CartMergeRequest {
  items: CartItem[];
}

// ==================== Order ====================

export interface OrderItemSnapshot {
  product_id: string;
  title_snapshot: string;
  price_snapshot: number;
  quantity: number;
  subtotal: number;
}

export interface PaymentEntry {
  amount: number;
  date: string;
  collected_by?: string;
  note: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  changed_by: string;
  timestamp: string;
  note: string;
}

export interface DeliveryAddress {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface Order {
  id: string;
  order_number: string;
  items: OrderItemSnapshot[];
  delivery_address: DeliveryAddress;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  amount_total: number;
  amount_received: number;
  amount_due: number;
  expected_delivery_date?: string;
  invoice_generated: boolean;
  invoice_url?: string;
  created_at: string;
  status_history: StatusHistoryEntry[];
}

export interface OrderAdmin extends Order {
  user_id: string;
  user_name?: string;
  user_mobile?: string;
  payment_history: PaymentEntry[];
}

export interface OrderCreateRequest {
  address_index?: number;
  delivery_address?: DeliveryAddress;
  note?: string;
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
  note?: string;
}

export interface PaymentRecordRequest {
  amount: number;
  note?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ==================== Wishlist ====================

export interface WishlistItem {
  product_id: string;
  product_title: string;
  product_image?: string;
  price: number;
  in_stock: boolean;
  status: string;
}

export interface WishlistResponse {
  id: string;
  items: WishlistItem[];
  total_items: number;
}

// ==================== Dashboard ====================

export interface DashboardSummary {
  total_sales: number;
  total_orders_delivered: number;
  total_dues: number;
  pending_orders_count: number;
  low_stock_products: LowStockProduct[];
  low_stock_count: number;
  recent_orders: RecentOrder[];
  total_customers: number;
  total_products: number;
  total_orders: number;
  today_sales: number;
  today_orders: number;
}

export interface LowStockProduct {
  id: string;
  title: string;
  stock_count: number;
  threshold: number;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  amount_total: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
}

// ==================== Sales Reports ====================

export interface SalesDataPoint {
  label: number;
  total_sales: number;
  total_received: number;
  total_due: number;
  order_count: number;
}

export interface SalesReport {
  period: string;
  year: number;
  month?: number;
  data: SalesDataPoint[];
  summary: {
    total_sales: number;
    total_received: number;
    total_due: number;
    total_orders: number;
  };
}

// ==================== Auth ====================

export interface AuthVerifyResponse {
  valid: boolean;
  registered: boolean;
  firebase_uid?: string;
  user_id?: string;
  role?: UserRole;
}

// ==================== API Responses ====================

export interface ApiError {
  detail: string;
}

export interface MessageResponse {
  message: string;
}

// ==================== Pagination ====================

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

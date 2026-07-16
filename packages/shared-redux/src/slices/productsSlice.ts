import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Product, Category } from '@raj-enterprises/shared-types';

export interface ProductsState {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  categories: Category[];
}

const initialState: ProductsState = {
  products: [],
  total: 0,
  page: 1,
  pageSize: 20,
  hasMore: false,
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,
  sortBy: 'created_at',
  sortOrder: 'desc',
  categories: [],
};

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<{
      products: Product[];
      total: number;
      page: number;
      has_more: boolean;
      append?: boolean;
    }>) => {
      if (action.payload.append) {
        state.products = [...state.products, ...action.payload.products];
      } else {
        state.products = action.payload.products;
      }
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.hasMore = action.payload.has_more;
      state.isLoading = false;
      state.error = null;
    },
    setProductsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.products = [];
      state.page = 1;
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
      state.products = [];
      state.page = 1;
    },
    setSortBy: (state, action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
      state.products = [];
      state.page = 1;
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
  },
});

export const {
  setProducts, setProductsLoading, setSearchQuery,
  setSelectedCategory, setSortBy, setCategories,
} = productsSlice.actions;
export default productsSlice.reducer;

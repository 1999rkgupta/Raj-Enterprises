import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Order } from '@raj-enterprises/shared-types';

export interface OrdersState {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  selectedOrder: Order | null;
}

const initialState: OrdersState = {
  orders: [],
  total: 0,
  page: 1,
  pageSize: 20,
  hasMore: false,
  isLoading: false,
  error: null,
  selectedOrder: null,
};

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<{
      orders: Order[];
      total: number;
      page: number;
      has_more: boolean;
    }>) => {
      state.orders = action.payload.orders;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.hasMore = action.payload.has_more;
      state.isLoading = false;
      state.error = null;
    },
    setOrdersLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setSelectedOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
    setOrdersError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const { setOrders, setOrdersLoading, setSelectedOrder, setOrdersError } = ordersSlice.actions;
export default ordersSlice.reducer;

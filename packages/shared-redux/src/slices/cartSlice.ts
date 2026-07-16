import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartResponse, CartItemResponse } from '@raj-enterprises/shared-types';

export interface CartState {
  cart: CartResponse | null;
  isLoading: boolean;
  error: string | null;
  /** Guest cart items (stored in IndexedDB, synced here for UI) */
  guestItems: Array<{
    product_id: string;
    quantity: number;
    selected: boolean;
  }>;
  isGuest: boolean;
}

const initialState: CartState = {
  cart: null,
  isLoading: false,
  error: null,
  guestItems: [],
  isGuest: true,
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<CartResponse>) => {
      state.cart = action.payload;
      state.isLoading = false;
      state.isGuest = false;
      state.error = null;
    },
    clearCart: (state) => {
      state.cart = null;
      state.guestItems = [];
      state.isLoading = false;
    },
    setCartLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCartError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setGuestItems: (state, action: PayloadAction<CartState['guestItems']>) => {
      state.guestItems = action.payload;
      state.isGuest = true;
    },
    addGuestItem: (state, action: PayloadAction<{ product_id: string; quantity: number }>) => {
      const existing = state.guestItems.find(i => i.product_id === action.payload.product_id);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else if (state.guestItems.length < 20) {
        state.guestItems.push({ ...action.payload, selected: true });
      }
    },
    updateGuestItem: (state, action: PayloadAction<{ product_id: string; quantity?: number; selected?: boolean }>) => {
      const item = state.guestItems.find(i => i.product_id === action.payload.product_id);
      if (item) {
        if (action.payload.quantity !== undefined) {
          if (action.payload.quantity === 0) {
            state.guestItems = state.guestItems.filter(i => i.product_id !== action.payload.product_id);
          } else {
            item.quantity = action.payload.quantity;
          }
        }
        if (action.payload.selected !== undefined) {
          item.selected = action.payload.selected;
        }
      }
    },
    removeGuestItem: (state, action: PayloadAction<string>) => {
      state.guestItems = state.guestItems.filter(i => i.product_id !== action.payload);
    },
  },
});

export const {
  setCart, clearCart, setCartLoading, setCartError,
  setGuestItems, addGuestItem, updateGuestItem, removeGuestItem,
} = cartSlice.actions;
export default cartSlice.reducer;

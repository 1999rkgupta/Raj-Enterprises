import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WishlistState {
  productIds: string[];
  isLoading: boolean;
}

const initialState: WishlistState = {
  productIds: [],
  isLoading: false,
};

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlist: (state, action: PayloadAction<string[]>) => {
      state.productIds = action.payload;
      state.isLoading = false;
    },
    toggleWishlistItem: (state, action: PayloadAction<string>) => {
      const idx = state.productIds.indexOf(action.payload);
      if (idx >= 0) {
        state.productIds.splice(idx, 1);
      } else {
        state.productIds.push(action.payload);
      }
    },
    setWishlistLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setWishlist, toggleWishlistItem, setWishlistLoading } = wishlistSlice.actions;
export default wishlistSlice.reducer;

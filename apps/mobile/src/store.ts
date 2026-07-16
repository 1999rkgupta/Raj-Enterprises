import { configureStore } from '@reduxjs/toolkit';
import {
  authSlice,
  cartSlice,
  productsSlice,
  ordersSlice,
  wishlistSlice,
  uiSlice,
} from '@raj-enterprises/shared-redux';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    cart: cartSlice.reducer,
    products: productsSlice.reducer,
    orders: ordersSlice.reducer,
    wishlist: wishlistSlice.reducer,
    ui: uiSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

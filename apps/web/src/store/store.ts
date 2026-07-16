import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from '@raj-enterprises/shared-redux';
import { cartSlice } from '@raj-enterprises/shared-redux';
import { productsSlice } from '@raj-enterprises/shared-redux';
import { ordersSlice } from '@raj-enterprises/shared-redux';
import { wishlistSlice } from '@raj-enterprises/shared-redux';
import { uiSlice } from '@raj-enterprises/shared-redux';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    cart: cartSlice.reducer,
    products: productsSlice.reducer,
    orders: ordersSlice.reducer,
    wishlist: wishlistSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@raj-enterprises/shared-types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  firebaseUid: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  firebaseUid: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.firebaseUid = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setFirebaseUid: (state, action: PayloadAction<string>) => {
      state.firebaseUid = action.payload;
    },
  },
});

export const { setUser, clearUser, setLoading, setAuthError, setFirebaseUid } = authSlice.actions;
export default authSlice.reducer;

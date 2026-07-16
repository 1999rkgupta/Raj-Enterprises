import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface UIState {
  theme: 'light' | 'dark';
  toasts: Toast[];
  notificationsEnabled: boolean;
  sidebarOpen: boolean;
}

const initialState: UIState = {
  theme: 'dark',
  toasts: [],
  notificationsEnabled: true,
  sidebarOpen: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    showToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      state.toasts.push({
        ...action.payload,
        id: Date.now().toString(),
      });
    },
    hideToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.notificationsEnabled = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { setTheme, showToast, hideToast, setNotificationsEnabled, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;

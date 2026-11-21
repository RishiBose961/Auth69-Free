import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User, TwoFactorChallenge, AuditLog } from '../types/auth';
import { api } from '../services/api';

export interface AuthState {
  user: User | null;
  token: string | null;
  challenge: TwoFactorChallenge | null;
  auditLogs: AuditLog[];
  isLoading: boolean;
  error: string | null;
}

const initialToken = typeof window !== 'undefined' ? localStorage.getItem('auth69_token') : null;

const initialState: AuthState = {
  user: null,
  token: initialToken,
  challenge: null,
  auditLogs: [],
  isLoading: !!initialToken,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.challenge = null;
      state.error = null;
      state.isLoading = false;
      api.setToken(action.payload.token);
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (action.payload) {
        api.setToken(action.payload);
      } else {
        api.clearToken();
      }
    },
    setChallenge: (state, action: PayloadAction<TwoFactorChallenge | null>) => {
      state.challenge = action.payload;
      state.isLoading = false;
    },
    clearChallenge: (state) => {
      state.challenge = null;
    },
    setAuditLogs: (state, action: PayloadAction<AuditLog[]>) => {
      state.auditLogs = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.challenge = null;
      state.auditLogs = [];
      state.error = null;
      state.isLoading = false;
      api.clearToken();
    },
  },
});

export const {
  setCredentials,
  setUser,
  setToken,
  setChallenge,
  clearChallenge,
  setAuditLogs,
  setLoading,
  setError,
  clearError,
  logout,
} = authSlice.actions;

export default authSlice.reducer;

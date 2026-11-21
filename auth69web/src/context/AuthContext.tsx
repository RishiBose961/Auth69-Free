/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { User, TwoFactorChallenge, AuditLog } from '../types/auth';
import { api } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setCredentials,
  clearChallenge,
  clearError,
  setError,
  logout as logoutAction,
  setLoading,
} from '../store/authSlice';
import {
  useLoginMutation,
  useRegisterMutation,
  useVerify2FAMutation,
  useResend2FAMutation,
  useToggle2FAMutation,
  useSet2FAMethodMutation,
  useProfileQuery,
} from '../services/authQueries';
import { useQueryClient } from '@tanstack/react-query';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  challenge: TwoFactorChallenge | null;
  auditLogs: AuditLog[];
  login: (email: string, password: string) => Promise<{ requires2FA: boolean }>;
  register: (email: string, password: string, name: string) => Promise<void>;
  verify2FA: (otp: string) => Promise<void>;
  resendOTP: () => Promise<void>;
  cancel2FA: () => void;
  toggle2FA: (enabled: boolean, method?: 'number' | 'alphabet' | 'otp' | 'totp') => Promise<void>;
  set2FAMethod: (method: 'number' | 'alphabet' | 'otp' | 'totp') => Promise<void>;
  loginWithToken: (token: string, user: User) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // Read state directly from Redux Store
  const { user, token, challenge, auditLogs, error } = useAppSelector((state) => state.auth);

  // TanStack Query for user profile fetching and caching
  const profileQuery = useProfileQuery(token);

  // TanStack Query Mutations
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const verify2FAMutation = useVerify2FAMutation();
  const resend2FAMutation = useResend2FAMutation();
  const toggle2FAMutation = useToggle2FAMutation();
  const set2FAMethodMutation = useSet2FAMethodMutation();

  const isGlobalLoading =
    profileQuery.isLoading ||
    loginMutation.isPending ||
    registerMutation.isPending ||
    verify2FAMutation.isPending;

  // Real-time WebSocket listener + Dual-Channel Fallback for mobile YES/NO & Number Match responses
  useEffect(() => {
    if (!challenge) return;

    let socket: any = null;
    let pollInterval: any = null;
    let pollTimeout: any = null;
    let isResolved = false;

    const handleSuccess = (user: User, token: string) => {
      if (isResolved) return;
      isResolved = true;
      if (pollInterval) clearInterval(pollInterval);
      if (pollTimeout) clearTimeout(pollTimeout);
      dispatch(setCredentials({ user, token }));
    };

    const handleDenial = (reason?: string) => {
      if (isResolved) return;
      isResolved = true;
      if (pollInterval) clearInterval(pollInterval);
      if (pollTimeout) clearTimeout(pollTimeout);
      dispatch(setError(reason || 'Sign-in request was DENIED on your auth69mob device.'));
      dispatch(clearChallenge());
    };

    try {
      socket = io('http://localhost:5002', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
      });

      const joinChallenge = () => {
        if (challenge?.challengeId) {
          socket.emit('watch_challenge', { challengeId: challenge.challengeId });
        }
      };

      socket.on('connect', joinChallenge);
      joinChallenge();

      socket.on(
        'server:challenge_resolved',
        async (data: { status: string; token?: string; user?: User }) => {
          if (data.status === 'APPROVED') {
            if (data.token && data.user) {
              handleSuccess(data.user, data.token);
              return;
            }

            // Fallback if token was not in socket payload
            try {
              const res = await api.checkChallengeStatus(challenge.challengeId);
              const statusData = (res.data || res) as any;
              if (statusData?.token && statusData.user) {
                handleSuccess(statusData.user, statusData.token);
              }
            } catch (err) {
              console.error('Error completing login:', err);
            }
          } else if (data.status === 'DENIED') {
            handleDenial((data as any).reason || (data as any).error || 'Sign-in request was DENIED or incorrect option selected. Session terminated.');
          }
        }
      );

      // Listen for real-time remote device revocation / logout from another session
      const deviceId = localStorage.getItem('auth69_device_id');
      if (deviceId) {
        socket.emit('watch_device', { deviceId });
        socket.on('server:device_revoked', () => {
          dispatch(logoutAction());
          dispatch(setError('Your session was remotely logged out from another device.'));
        });
      }
    } catch (err) {
      console.warn('Socket error on web:', err);
    }

    // Dual-channel fallback polling: checks after 800ms, then every 1200ms
    // Ensures 100% instant login on the very first attempt without requiring user to retry
    const pollCheck = async () => {
      if (isResolved) return;
      try {
        const res = await api.checkChallengeStatus(challenge.challengeId);
        const statusData = (res.data || res) as any;
        if (statusData?.status === 'APPROVED' && statusData?.token && statusData?.user) {
          handleSuccess(statusData.user, statusData.token);
        } else if (statusData?.status === 'DENIED') {
          handleDenial('Sign-in request was DENIED on your auth69mob device.');
        }
      } catch {
        // Silent error during polling
      }
    };

    pollTimeout = setTimeout(pollCheck, 800);
    pollInterval = setInterval(pollCheck, 1200);

    return () => {
      if (pollTimeout) clearTimeout(pollTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (socket) socket.disconnect();
    };
  }, [challenge, dispatch]);

  const login = async (email: string, password: string) => {
    dispatch(clearError());
    dispatch(setLoading(true));
    try {
      const data: any = await loginMutation.mutateAsync({ email, password });

      if (data.requires2FA && data.challengeId) {
        return { requires2FA: true };
      }

      if (data.token && data.user) {
        return { requires2FA: false };
      }

      throw new Error('Unexpected login response state');
    } catch (err: any) {
      dispatch(setError(err.message || 'Login failed'));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const register = async (email: string, password: string, name: string) => {
    dispatch(clearError());
    dispatch(setLoading(true));
    try {
      await registerMutation.mutateAsync({ email, password, name });
    } catch (err: any) {
      dispatch(setError(err.message || 'Registration failed'));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const verify2FA = async (otp: string) => {
    if (!challenge) throw new Error('No active 2-step verification challenge');
    dispatch(clearError());
    dispatch(setLoading(true));
    try {
      await verify2FAMutation.mutateAsync({
        challengeId: challenge.challengeId,
        otp,
      });
    } catch (err: any) {
      dispatch(setError(err.message || 'Verification failed'));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const resendOTP = async () => {
    if (!challenge) return;
    try {
      const res = await resend2FAMutation.mutateAsync(challenge.challengeId);
      const data = (res?.data || res) as any;
      if (data?.challengeId) {
        dispatch(
          setCredentials({
            user: user!,
            token: token || '',
          })
        );
      }
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to resend code'));
    }
  };

  const cancel2FA = () => {
    dispatch(clearChallenge());
    dispatch(clearError());
  };

  const toggle2FA = async (enabled: boolean, method?: 'number' | 'alphabet' | 'otp' | 'totp') => {
    dispatch(clearError());
    try {
      await toggle2FAMutation.mutateAsync({ enabled, method });
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to toggle 2-Step Verification'));
      throw err;
    }
  };

  const set2FAMethod = async (method: 'number' | 'alphabet' | 'otp' | 'totp') => {
    dispatch(clearError());
    try {
      await set2FAMethodMutation.mutateAsync(method);
    } catch (err: any) {
      dispatch(setError(err.message || 'Failed to set 2FA method'));
      throw err;
    }
  };

  const loginWithToken = async (authToken: string, authUser: User) => {
    dispatch(setCredentials({ token: authToken, user: authUser }));
  };

  const logout = () => {
    dispatch(logoutAction());
    queryClient.clear();
  };

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading: isGlobalLoading,
    error,
    challenge,
    auditLogs,
    login,
    register,
    verify2FA,
    resendOTP,
    cancel2FA,
    toggle2FA,
    set2FAMethod,
    loginWithToken,
    logout,
    clearError: () => dispatch(clearError()),
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

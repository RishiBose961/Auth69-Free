import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAppDispatch } from '../store/hooks';
import {
  setCredentials,
  setChallenge,
  setAuditLogs,
  setUser,
  setError,
  logout,
} from '../store/authSlice';

/**
 * TanStack Query Mutation for User Login
 */
export const useLoginMutation = () => {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await api.login(email, password);
      const data = (res.data || res) as any;
      if (!data) throw new Error('Invalid server response');
      return data;
    },
    onSuccess: (data: any, variables) => {
      if (data.requires2FA && data.challengeId) {
        dispatch(
          setChallenge({
            challengeId: data.challengeId,
            email: variables.email,
            message: data.message,
            mode: data.mode || 'number',
            matchNumber: data.matchNumber,
            alphabet4: data.alphabet4,
          })
        );
      } else if (data.token && data.user) {
        dispatch(setCredentials({ user: data.user, token: data.token }));
      }
    },
    onError: (err: any) => {
      dispatch(setError(err.message || 'Login failed'));
    },
  });
};

/**
 * TanStack Query Mutation for User Registration
 */
export const useRegisterMutation = () => {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name: string }) => {
      const res = await api.register(email, password, name);
      const data = (res.data || res) as any;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.token && data?.user) {
        dispatch(setCredentials({ user: data.user, token: data.token }));
      }
    },
    onError: (err: any) => {
      dispatch(setError(err.message || 'Registration failed'));
    },
  });
};

/**
 * TanStack Query Mutation for 2FA Verification (OTP, Alphabet, or Number)
 */
export const useVerify2FAMutation = () => {
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async ({ challengeId, otp }: { challengeId: string; otp: string }) => {
      const res = await api.verify2FA(challengeId, otp);
      const data = (res.data || res) as any;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.token && data?.user) {
        dispatch(setCredentials({ user: data.user, token: data.token }));
      }
    },
    onError: (err: any) => {
      dispatch(setError(err.message || 'Verification failed'));
    },
  });
};

/**
 * TanStack Query Mutation for Resending 2FA Challenge
 */
export const useResend2FAMutation = () => {
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const res = await api.resend2FA(challengeId);
      const data = (res.data || res) as any;
      return data;
    },
  });
};

/**
 * TanStack Query Mutation for Toggling 2-Step Verification
 */
export const useToggle2FAMutation = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enabled, method }: { enabled: boolean; method?: 'number' | 'alphabet' | 'otp' | 'totp' }) => {
      const res = await api.toggle2FA(enabled, method);
      const data = (res.data || res) as any;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.user) {
        dispatch(setUser(data.user));
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    },
    onError: (err: any) => {
      dispatch(setError(err.message));
    },
  });
};

/**
 * TanStack Query Mutation for Updating 2FA Method
 */
export const useSet2FAMethodMutation = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (method: 'number' | 'alphabet' | 'otp' | 'totp') => {
      const res = await api.set2FAMethod(method);
      const data = (res.data || res) as any;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.user) {
        dispatch(setUser(data.user));
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    },
    onError: (err: any) => {
      dispatch(setError(err.message));
    },
  });
};

/**
 * Connected Devices & Active Sessions Hooks
 */
export const useDevicesQuery = (token: string | null) => {
  return useQuery({
    queryKey: ['connected-devices', token],
    queryFn: async () => {
      const res = await api.getConnectedDevices();
      return (res.data || res) as any[];
    },
    enabled: !!token,
    refetchInterval: 10000,
  });
};

export const useLogoutDeviceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      return await api.logoutDevice(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connected-devices'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useLogoutAllOtherDevicesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return await api.logoutAllOtherDevices();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connected-devices'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

/**
 * Authenticator App (TOTP) Setup Hooks
 */
export const useSetupTOTPMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const res = await api.setupTOTP();
      return (res.data || res) as any;
    },
  });
};

export const useVerifyTOTPSetupMutation = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const res = await api.verifyTOTPSetup(code);
      return (res.data || res) as any;
    },
    onSuccess: (data: any) => {
      if (data?.user) {
        dispatch(setUser(data.user));
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    },
  });
};

/**
 * TanStack Query for User Profile and Security Audit Logs
 */
export const useProfileQuery = (token: string | null) => {
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['profile', token],
    queryFn: async () => {
      if (!token) return null;
      try {
        const res = await api.getProfile();
        const data = (res.data || res) as any;
        if (data?.user) {
          dispatch(setUser(data.user));
          dispatch(setAuditLogs(data.auditLogs || []));
        }
        return data;
      } catch (err: any) {
        dispatch(logout());
        throw err;
      }
    },
    enabled: !!token,
  });
};

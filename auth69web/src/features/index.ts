/**
 * Auth69 Web Modular Feature Exports
 * -----------------------------------------------------------
 * Import and use any feature independently in any React project.
 */

// 1. One-Time Password & 2FA Hook
export { useOTP, type UseOTPOptions } from './otp/useOTP';

// 2. WhatsApp-Style QR Login Hook
export { useQRLogin, type UseQRLoginOptions, type QRLoginSession } from './qr/useQRLogin';

// 3. Complete Redux + TanStack Query Auth Context
export { useAuth, AuthProvider, type AuthContextType } from '../context/AuthContext';

// 4. TanStack Query Mutations
export {
  useLoginMutation,
  useRegisterMutation,
  useVerify2FAMutation,
  useResend2FAMutation,
  useToggle2FAMutation,
  useSet2FAMethodMutation,
  useProfileQuery,
} from '../services/authQueries';

// 5. Redux Store & Hooks
export { store, type RootState, type AppDispatch } from '../store';
export { useAppDispatch, useAppSelector } from '../store/hooks';
export * from '../store/authSlice';

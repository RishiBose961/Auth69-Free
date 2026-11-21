import { useState } from 'react';
import { api } from '../../services/api';

export interface UseOTPOptions {
  challengeId?: string;
  onSuccess?: (data: { token?: string; user?: any }) => void;
  onError?: (error: string) => void;
}

/**
 * Modular Standalone Hook for OTP & 2-Step Verification
 * Can be used in any React application with zero boilerplate.
 */
export const useOTP = (options: UseOTPOptions = {}) => {
  const [challengeId, setChallengeId] = useState<string | null>(options.challengeId || null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submit 6-digit numeric code, 4-letter alphabet, or 2-digit match number
   */
  const verify = async (code: string, explicitChallengeId?: string) => {
    const id = explicitChallengeId || challengeId;
    if (!id) throw new Error('Challenge ID is required for verification');

    setIsVerifying(true);
    setError(null);

    try {
      const res = await api.verify2FA(id, code.trim());
      const data = (res.data || res) as any;

      if (options.onSuccess) {
        options.onSuccess(data);
      }
      return data;
    } catch (err: any) {
      const message = err.message || 'Verification failed';
      setError(message);
      if (options.onError) {
        options.onError(message);
      }
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Request a new verification challenge / code
   */
  const resend = async (explicitChallengeId?: string) => {
    const id = explicitChallengeId || challengeId;
    if (!id) throw new Error('Challenge ID is required to resend code');

    try {
      const res = await api.resend2FA(id);
      const data = (res.data || res) as any;
      if (data?.challengeId) {
        setChallengeId(data.challengeId);
      }
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code');
      throw err;
    }
  };

  return {
    challengeId,
    setChallengeId,
    verify,
    resend,
    isVerifying,
    error,
    clearError: () => setError(null),
  };
};

export default useOTP;

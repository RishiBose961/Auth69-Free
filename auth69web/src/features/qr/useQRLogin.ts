import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from '../../services/api';

export interface QRLoginSession {
  qrId: string;
  qrCodeDataUrl: string;
  rawPayload: string;
  expiresAt: string;
  status: 'PENDING' | 'SCANNED' | 'AUTHORIZED' | 'DENIED' | 'EXPIRED';
}

export interface UseQRLoginOptions {
  socketUrl?: string;
  onAuthorized?: (payload: { token: string; user: any }) => void;
  onScanned?: () => void;
  onDenied?: () => void;
  onExpired?: () => void;
}

/**
 * Modular Standalone Hook for WhatsApp-Style QR Desktop Login
 * Handles dynamic QR code creation, real-time WebSocket listening,
 * polling fallback, and expiration timers.
 */
export const useQRLogin = (options: UseQRLoginOptions = {}) => {
  const [session, setSession] = useState<QRLoginSession | null>(null);
  const [status, setStatus] = useState<string>('IDLE');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const socketRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  /**
   * Initializes a fresh WhatsApp-style QR session
   */
  const createQRSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createQRSession();
      const data = (res.data || res) as any;

      if (!data?.qrId || !data?.qrCodeDataUrl) {
        throw new Error('Failed to create QR code session');
      }

      setSession(data);
      setStatus(data.status || 'PENDING');
      setTimeLeft(60);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error generating QR code');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Countdown timer for 60-second expiration
  useEffect(() => {
    if (!session || status === 'AUTHORIZED' || status === 'DENIED' || status === 'EXPIRED') {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus('EXPIRED');
          if (options.onExpired) options.onExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, status, options]);

  // Real-time WebSocket connection to watch this QR session
  useEffect(() => {
    if (!session?.qrId || status === 'AUTHORIZED' || status === 'DENIED' || status === 'EXPIRED') {
      return;
    }

    try {
      const socket = io(options.socketUrl || 'http://localhost:5002', {
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.emit('watch_qr', { qrId: session.qrId });

      socket.on('server:qr_status', (data: { status: string; token?: string; user?: any }) => {
        setStatus(data.status);

        if (data.status === 'SCANNED') {
          if (options.onScanned) options.onScanned();
        } else if (data.status === 'AUTHORIZED') {
          if (data.token && data.user && options.onAuthorized) {
            options.onAuthorized({ token: data.token, user: data.user });
          }
        } else if (data.status === 'DENIED') {
          if (options.onDenied) options.onDenied();
        } else if (data.status === 'EXPIRED') {
          if (options.onExpired) options.onExpired();
        }
      });
    } catch (err) {
      console.warn('[useQRLogin] Socket connection error:', err);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [session?.qrId, status, options]);

  return {
    session,
    status,
    timeLeft,
    isLoading,
    error,
    createQRSession,
    refreshQR: createQRSession,
  };
};

export default useQRLogin;

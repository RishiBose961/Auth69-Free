import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  QrCode,
  Smartphone,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
} from 'lucide-react';

interface QRCodeLoginProps {
  onSwitchToPasswordLogin: () => void;
}

export const QRCodeLogin: React.FC<QRCodeLoginProps> = ({ onSwitchToPasswordLogin }) => {
  const { loginWithToken } = useAuth();
  const [qrId, setQrId] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<'PENDING' | 'SCANNED' | 'AUTHORIZED' | 'DENIED' | 'EXPIRED'>('PENDING');
  const [scannedUser, setScannedUser] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load new QR session
  const fetchNewQR = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setStatus('PENDING');
      setScannedUser(null);
      setTimeLeft(60);

      const res = await api.createQRSession();
      if (res.data) {
        setQrId(res.data.qrId);
        setQrCodeDataUrl(res.data.qrCodeDataUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load QR code. Please check server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNewQR();
  }, []);

  // Countdown timer for 60-second expiration (like WhatsApp Web)
  useEffect(() => {
    if (status !== 'PENDING' && status !== 'SCANNED') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, qrId]);

  // Real-time WebSocket connection to watch QR session
  useEffect(() => {
    if (!qrId) return;

    let socket: any = null;
    try {
      socket = io('http://localhost:5002', { transports: ['websocket'] });
      socket.emit('watch_qr', { qrId });

      socket.on('server:qr_status', async (data: any) => {
        if (data.qrId !== qrId) return;

        if (data.status === 'SCANNED') {
          setStatus('SCANNED');
          if (data.user?.email) {
            setScannedUser(data.user.email);
          }
        } else if (data.status === 'AUTHORIZED') {
          setStatus('AUTHORIZED');
          if (data.token && data.user) {
            setTimeout(async () => {
              await loginWithToken(data.token, data.user);
            }, 600);
          }
        } else if (data.status === 'DENIED') {
          setStatus('DENIED');
          setErrorMessage('Login request was declined on your mobile device.');
        } else if (data.status === 'EXPIRED') {
          setStatus('EXPIRED');
        }
      });
    } catch (err) {
      console.warn('Socket error in QR code watcher:', err);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [qrId, loginWithToken]);

  return (
    <div className="auth-card qr-auth-card">
      <div className="auth-header">
        <div className="icon-header-badge whatsapp-badge">
          <QrCode size={28} className="text-emerald" />
        </div>
        <h2>Scan QR Code to Log In</h2>
        <p className="auth-desc">Log in instantly without typing your email or password</p>
      </div>

      {errorMessage && (
        <div className="alert-box error">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* WhatsApp Web Split Container */}
      <div className="whatsapp-layout">
        {/* Left: Step-by-Step Instructions */}
        <div className="whatsapp-instructions">
          <h3>To log in with Auth69:</h3>
          <ol className="whatsapp-steps">
            <li>
              <span className="step-num">1</span>
              <span>Open <strong>Auth69 Mobile (auth69mob)</strong> on your phone</span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>Tap the <strong>"Scan QR Code"</strong> button at the top</span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>Point your camera at this QR code to log in immediately</span>
            </li>
          </ol>

          <div className="whatsapp-security-pill">
            <ShieldCheck size={16} className="text-emerald" />
            <span>End-to-End Encrypted & Authenticated</span>
          </div>
        </div>

        {/* Right: The Dynamic QR Code Box */}
        <div className="whatsapp-qr-wrapper">
          <div className={`qr-box-container ${status === 'SCANNED' ? 'scanned-state' : ''}`}>
            {isLoading ? (
              <div className="qr-placeholder">
                <RefreshCw size={36} className="spin text-accent" />
                <span>Generating secure QR code...</span>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="qr-image-frame">
                <img src={qrCodeDataUrl} alt="WhatsApp Style Login QR Code" className="qr-image" />

                {/* Scanned state overlay */}
                {status === 'SCANNED' && (
                  <div className="qr-scanned-overlay">
                    <Smartphone size={38} className="pulse-icon text-emerald" />
                    <h4>Device Detected</h4>
                    <p>{scannedUser || 'Confirming on your phone...'}</p>
                  </div>
                )}

                {/* Authorized state overlay */}
                {status === 'AUTHORIZED' && (
                  <div className="qr-authorized-overlay">
                    <CheckCircle2 size={44} className="text-emerald" />
                    <h4>Logged In!</h4>
                    <p>Redirecting to dashboard...</p>
                  </div>
                )}

                {/* Expired state overlay (Exact replica of WhatsApp Web) */}
                {status === 'EXPIRED' && (
                  <div className="qr-expired-overlay" onClick={fetchNewQR}>
                    <div className="reload-circle-btn">
                      <RefreshCw size={28} color="#ffffff" />
                    </div>
                    <span className="expired-title">QR Code Expired</span>
                    <span className="expired-sub">Click to reload code</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="qr-placeholder">
                <p>Failed to load QR code</p>
                <button type="button" onClick={fetchNewQR} className="btn-secondary">
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* QR Footer / Expiration timer */}
          {status === 'PENDING' && (
            <div className="qr-timer-pill">
              <span className="timer-dot"></span>
              <span>Valid for {timeLeft}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Switcher back to Email & Password */}
      <div className="auth-footer qr-footer-actions">
        <button type="button" onClick={onSwitchToPasswordLogin} className="btn-toggle-method">
          <Lock size={16} />
          <span>Or sign in with Email & Password</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

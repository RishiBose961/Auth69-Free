import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Smartphone,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  KeyRound,
  CheckCircle,
  Hash,
  Type,
} from 'lucide-react';

export const TwoFactorModal: React.FC = () => {
  const { challenge, verify2FA, resendOTP, cancel2FA, error, clearError } = useAuth();
  const mode = challenge?.mode || 'number';

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus input on mount ONLY when in 6-digit OTP or Authenticator app entry mode
  useEffect(() => {
    if (mode === 'otp' || mode === 'totp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [mode]);

  // Expiration countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const cd = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(cd);
  }, [resendCooldown]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const submitCode = async (code: string) => {
    try {
      setIsVerifying(true);
      setLocalError(null);
      await verify2FA(code);
    } catch (err: any) {
      setLocalError(err.message || 'Verification failed. Please check your code.');
      setOtpDigits(['', '', '', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  // 6-digit OTP Handlers
  const handleDigitChange = (index: number, value: string) => {
    setLocalError(null);
    clearError();
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    const digit = cleaned.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    const fullCode = updated.join('');
    if (fullCode.length === 6) {
      submitCode(fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      setIsResending(true);
      setResendNotice(null);
      await resendOTP();
      setResendCooldown(30);
      setTimeLeft(300);
      setOtpDigits(['', '', '', '', '', '']);
      setResendNotice('New verification challenge dispatched to your auth69mob device!');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-card two-fa-card">
      <div className="auth-header">
        <div className="icon-header-badge mobile-badge">
          <Smartphone size={32} className="text-accent" />
        </div>
        <h2>2-Step Verification</h2>
        <p className="auth-desc">
          Sign-in prompt dispatched to <strong>auth69mob</strong> for{' '}
          <span className="auth-email-highlight">{challenge?.email}</span>
        </p>
      </div>

      {/* Real-time Socket Indicator */}
      <div className="mobile-companion-hint">
        <div className="companion-dot pulsing"></div>
        <div className="companion-text">
          <span>Real-time Socket Guard active • Confirm on <strong>auth69mob</strong></span>
        </div>
      </div>

      {/* Single Active Mode Indicator Badge (No multi-tab confusion) */}
      <div className="active-mode-badge-wrap">
        <div className="active-mode-badge">
          {mode === 'number' && (
            <>
              <Hash size={14} className="text-accent" />
              <span>Mode: Random Number Match</span>
            </>
          )}
          {mode === 'alphabet' && (
            <>
              <Type size={14} className="text-accent" />
              <span>Mode: 4-Letter Alphabet Match</span>
            </>
          )}
          {mode === 'otp' && (
            <>
              <KeyRound size={14} className="text-accent" />
              <span>Mode: 6-Digit OTP</span>
            </>
          )}
          {mode === 'totp' && (
            <>
              <Smartphone size={14} className="text-accent" />
              <span>Mode: Authenticator App (TOTP)</span>
            </>
          )}
        </div>
      </div>

      {displayError && (
        <div className="alert-box error">
          <ShieldAlert size={18} />
          <span>{displayError}</span>
        </div>
      )}

      {resendNotice && (
        <div className="alert-box success">
          <CheckCircle size={18} />
          <span>{resendNotice}</span>
        </div>
      )}

      {/* MODE 1: Random Number Match */}
      {mode === 'number' && (
        <div className="single-mode-pane">
          <div className="number-match-card">
            <div className="match-header">
              <Hash size={16} className="text-accent" />
              <span>MATCH THIS NUMBER</span>
            </div>
            <div className="match-number-circle">
              <span>{challenge?.matchNumber ?? 42}</span>
            </div>
            <p className="match-instruction">
              Check <strong>auth69mob</strong> on your phone. Tap <strong>"YES, IT'S ME"</strong>, then select number{' '}
              <strong className="text-accent">{challenge?.matchNumber ?? 42}</strong>.
            </p>
          </div>

          <div className="waiting-status-banner">
            <div className="waiting-spinner"></div>
            <span>Waiting for your response on auth69mob...</span>
          </div>
        </div>
      )}

      {/* MODE 2: 4-Letter Alphabet Match */}
      {mode === 'alphabet' && (
        <div className="single-mode-pane">
          <div className="number-match-card">
            <div className="match-header">
              <Type size={16} className="text-accent" />
              <span>MATCH THIS 4-LETTER CODE</span>
            </div>
            <div className="alphabet-display-row">
              {(challenge?.alphabet4 || 'AUTH').split('').map((char, i) => (
                <span key={i} className="alpha-badge">
                  {char}
                </span>
              ))}
            </div>
            <p className="match-instruction">
              Check <strong>auth69mob</strong> on your phone. Tap <strong>"YES, IT'S ME"</strong>, then select code{' '}
              <strong className="text-accent">{challenge?.alphabet4 || 'AUTH'}</strong>.
            </p>
          </div>

          <div className="waiting-status-banner">
            <div className="waiting-spinner"></div>
            <span>Waiting for your selection on auth69mob...</span>
          </div>
        </div>
      )}

      {/* MODE 3: 6-Digit OTP */}
      {mode === 'otp' && (
        <div className="single-mode-pane">
          <p className="tab-hint">Check <strong>auth69mob</strong>, tap <strong>"YES, IT'S ME"</strong> to view code, and enter it below:</p>
          <div className="otp-inputs-row">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  otpRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                className={`otp-digit-box ${digit ? 'filled' : ''}`}
                autoComplete="one-time-code"
                disabled={isVerifying}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* MODE 4: Authenticator App (Google Authenticator, Authy, Microsoft Authenticator) */}
      {mode === 'totp' && (
        <div className="single-mode-pane">
          <p className="tab-hint">
            Open <strong>Google Authenticator</strong> or <strong>Authy</strong> and enter the 6-digit code:
          </p>
          <div className="otp-inputs-row">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  otpRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                className={`otp-digit-box ${digit ? 'filled' : ''}`}
                autoComplete="one-time-code"
                disabled={isVerifying}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Meta Footer */}
      <div className="otp-meta-row" style={{ marginTop: '20px' }}>
        <div className="timer-badge">
          <span>Expires in: </span>
          <strong className={timeLeft < 60 ? 'text-danger' : ''}>{formatTimer(timeLeft)}</strong>
        </div>

        <button
          type="button"
          className="btn-resend"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
        >
          <RefreshCw size={14} className={isResending ? 'spin' : ''} />
          <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Prompt'}</span>
        </button>
      </div>

      <div className="auth-footer">
        <button type="button" onClick={cancel2FA} className="btn-back-link">
          <ArrowLeft size={16} />
          <span>Cancel & Back to Sign In</span>
        </button>
      </div>
    </div>
  );
};

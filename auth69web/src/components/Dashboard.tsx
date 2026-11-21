import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  useDevicesQuery,
  useLogoutDeviceMutation,
  useLogoutAllOtherDevicesMutation,
  useSetupTOTPMutation,
  useVerifyTOTPSetupMutation,
} from '../services/authQueries';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Calendar,
  Mail,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  Laptop,
  LogOut,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, token, toggle2FA, set2FAMethod, auditLogs, refreshProfile } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [isUpdatingMethod, setIsUpdatingMethod] = useState(false);
  const [toggleSuccessMsg, setToggleSuccessMsg] = useState<string | null>(null);

  // Authenticator App (TOTP) Setup State
  const [isTOTPModalOpen, setIsTOTPModalOpen] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; qrCodeDataUrl: string; otpAuthUri: string } | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [isVerifyingTOTP, setIsVerifyingTOTP] = useState(false);
  const [totpSetupError, setTotpSetupError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Connected Devices Hooks
  const { data: devices, isLoading: isDevicesLoading } = useDevicesQuery(token);
  const logoutDeviceMutation = useLogoutDeviceMutation();
  const logoutAllOthersMutation = useLogoutAllOtherDevicesMutation();
  const setupTOTPMutation = useSetupTOTPMutation();
  const verifyTOTPSetupMutation = useVerifyTOTPSetupMutation();

  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false);

  if (!user) return null;

  const handleToggle2FA = async () => {
    try {
      setIsToggling(true);
      setToggleSuccessMsg(null);
      const nextState = !user.twoFactorEnabled;
      await toggle2FA(nextState);
      setToggleSuccessMsg(
        nextState
          ? `2-Step Verification is now ON (${(user.twoFactorMethod || 'number').toUpperCase()})! Future logins will prompt auth69mob.`
          : '2-Step Verification has been disabled.'
      );
      setTimeout(() => setToggleSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(`Error toggling 2FA: ${err.message}`);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSelectMethod = async (method: 'number' | 'alphabet' | 'otp' | 'totp') => {
    if (method === 'totp' && !user.twoFactorMethod) {
      handleOpenTOTPSetup();
      return;
    }
    try {
      setIsUpdatingMethod(true);
      await set2FAMethod(method);
      const labels = {
        number: 'Random Number Match',
        alphabet: '4-Letter Alphabet',
        otp: '6-Digit OTP',
        totp: 'Authenticator App (TOTP)',
      };
      setToggleSuccessMsg(`Active 2FA verification mode set to: ${labels[method]}. Only this mode will appear during login.`);
      setTimeout(() => setToggleSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Error updating 2FA method: ${err.message}`);
    } finally {
      setIsUpdatingMethod(false);
    }
  };

  const handleOpenTOTPSetup = async () => {
    try {
      setTotpSetupError(null);
      setTotpCodeInput('');
      setIsTOTPModalOpen(true);
      const data = await setupTOTPMutation.mutateAsync();
      setTotpSetupData(data);
    } catch (err: any) {
      setTotpSetupError(err.message || 'Failed to initialize Authenticator App setup');
    }
  };

  const handleVerifyTOTPSetup = async () => {
    if (totpCodeInput.length !== 6) return;
    try {
      setIsVerifyingTOTP(true);
      setTotpSetupError(null);
      await verifyTOTPSetupMutation.mutateAsync(totpCodeInput);
      setIsTOTPModalOpen(false);
      setToggleSuccessMsg('Authenticator App successfully linked and activated as your 2FA method!');
      setTimeout(() => setToggleSuccessMsg(null), 5000);
    } catch (err: any) {
      setTotpSetupError(err.message || 'Invalid 6-digit code. Please verify your app.');
    } finally {
      setIsVerifyingTOTP(false);
    }
  };

  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {}
  };

  const handleLogoutDevice = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to log out this device? The session will be terminated immediately.')) {
      return;
    }
    try {
      setRevokingDeviceId(deviceId);
      await logoutDeviceMutation.mutateAsync(deviceId);
      setToggleSuccessMsg('Device session revoked successfully.');
      setTimeout(() => setToggleSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to log out device: ${err.message}`);
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const handleLogoutAllOthers = async () => {
    if (!window.confirm('Are you sure you want to log out all other devices? All other active sessions will be terminated.')) {
      return;
    }
    try {
      setIsLoggingOutOthers(true);
      await logoutAllOthersMutation.mutateAsync();
      setToggleSuccessMsg('All other device sessions have been logged out.');
      setTimeout(() => setToggleSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to log out all other devices: ${err.message}`);
    } finally {
      setIsLoggingOutOthers(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="avatar-large">
            <span>{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="hero-text">
            <h1>Welcome, {user.name}</h1>
            <p className="hero-email">
              <Mail size={16} />
              <span>{user.email}</span>
            </p>
            <div className="hero-meta">
              <span className="meta-pill">
                <Calendar size={14} />
                <span>Member since {formatDate(user.createdAt)}</span>
              </span>
              <span className={`meta-pill ${user.twoFactorEnabled ? 'pill-secure' : 'pill-warning'}`}>
                {user.twoFactorEnabled ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                <span>{user.twoFactorEnabled ? '2FA Protected' : '2FA Not Configured'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {toggleSuccessMsg && (
        <div className="alert-box success banner-alert">
          <CheckCircle2 size={20} />
          <span>{toggleSuccessMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Card 1: 2-Step Verification Core Toggle */}
        <div className="dash-card card-security">
          <div className="card-header">
            <div className="card-icon-wrap accent-bg">
              <Lock size={22} className="text-accent" />
            </div>
            <div className="card-header-titles">
              <h3>2-Step Verification</h3>
              <p>Strengthen account security by requiring an OTP from auth69mob</p>
            </div>
          </div>

          <div className="card-body">
            <div className="two-fa-status-banner">
              <div className="status-indicator-col">
                <div className={`status-orb ${user.twoFactorEnabled ? 'orb-active' : 'orb-inactive'}`}></div>
                <div>
                  <h4>{user.twoFactorEnabled ? '2-Step Verification is Active' : '2-Step Verification is Disabled'}</h4>
                  <p>
                    {user.twoFactorEnabled
                      ? 'Whenever you sign in with your email & password, an OTP will be dispatched to your auth69mob mobile app.'
                      : 'You are currently signing in with password only. Turn this ON to require approval on your mobile app.'}
                  </p>
                </div>
              </div>

              {/* The Interactive Switch Toggle */}
              <div className="toggle-wrapper">
                <label className="switch-toggle" aria-label="Toggle 2-Step Verification">
                  <input
                    type="checkbox"
                    checked={user.twoFactorEnabled}
                    onChange={handleToggle2FA}
                    disabled={isToggling}
                  />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label-text">
                  {isToggling ? 'Updating...' : user.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>

            {/* 2FA Method Selector - Choose only 1 active method */}
            <div className="two-fa-method-section">
              <div className="section-subtitle">
                <span className="subtitle-title">Active 2-Step Verification Method:</span>
                <p className="subtitle-desc">
                  Choose which single verification challenge will be dispatched to your mobile screen during login:
                </p>
              </div>

              <div className="method-picker-grid" style={{ opacity: isUpdatingMethod ? 0.6 : 1, pointerEvents: isUpdatingMethod ? 'none' : 'auto' }}>
                {/* 1. Number Match */}
                <div
                  className={`method-picker-card ${(user.twoFactorMethod || 'number') === 'number' ? 'active' : ''}`}
                  onClick={() => handleSelectMethod('number')}
                >
                  <div className="method-card-top">
                    <span className="method-emoji">🔢</span>
                    <span className="method-title">Random Number Match</span>
                    {(user.twoFactorMethod || 'number') === 'number' && (
                      <span className="method-active-pill">ACTIVE</span>
                    )}
                  </div>
                  <p className="method-desc">
                    Web displays a 2-digit number (e.g. 42). Tap the matching number or YES on auth69mob to approve.
                  </p>
                </div>

                {/* 2. 4-Letter Alphabet */}
                <div
                  className={`method-picker-card ${user.twoFactorMethod === 'alphabet' ? 'active' : ''}`}
                  onClick={() => handleSelectMethod('alphabet')}
                >
                  <div className="method-card-top">
                    <span className="method-emoji">🔤</span>
                    <span className="method-title">4-Letter Alphabet</span>
                    {user.twoFactorMethod === 'alphabet' && (
                      <span className="method-active-pill">ACTIVE</span>
                    )}
                  </div>
                  <p className="method-desc">
                    Dispatches a 4-letter visual code (e.g. KJPX). Confirm code on your phone or enter it on web.
                  </p>
                </div>

                {/* 3. 6-Digit OTP */}
                <div
                  className={`method-picker-card ${user.twoFactorMethod === 'otp' ? 'active' : ''}`}
                  onClick={() => handleSelectMethod('otp')}
                >
                  <div className="method-card-top">
                    <span className="method-emoji">🔑</span>
                    <span className="method-title">6-Digit OTP Code</span>
                    {user.twoFactorMethod === 'otp' && (
                      <span className="method-active-pill">ACTIVE</span>
                    )}
                  </div>
                  <p className="method-desc">
                    Generates a classic 6-digit one-time password on auth69mob to enter into the web screen.
                  </p>
                </div>

                {/* 4. Authenticator App (Google Authenticator / Authy / TOTP) */}
                <div
                  className={`method-picker-card ${user.twoFactorMethod === 'totp' ? 'active' : ''}`}
                  onClick={() => handleSelectMethod('totp')}
                >
                  <div className="method-card-top">
                    <span className="method-emoji">📱</span>
                    <span className="method-title">Authenticator App</span>
                    {user.twoFactorMethod === 'totp' && (
                      <span className="method-active-pill">ACTIVE</span>
                    )}
                  </div>
                  <p className="method-desc">
                    Use Google Authenticator, Microsoft Authenticator, or Authy to generate standard 6-digit codes.
                  </p>
                  <button
                    type="button"
                    className="btn-setup-totp-badge"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTOTPSetup();
                    }}
                  >
                    <QrCode size={13} />
                    <span>{user.twoFactorMethod === 'totp' ? 'Scan New QR' : 'Set Up App'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="how-it-works-box">
              <h5>
                <Sparkles size={16} /> How 2FA Works with Auth69:
              </h5>
              <ol className="steps-list">
                <li>Enter your email & password on Auth69 Web.</li>
                <li>Auth69 automatically generates a secure 6-digit OTP and pushes it to <strong>auth69mob</strong>.</li>
                <li>Check your mobile screen to view the OTP or tap <strong>"Approve"</strong> to sign in instantly.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Card 2: Mobile Companion Link (auth69mob) */}
        <div className="dash-card card-mobile">
          <div className="card-header">
            <div className="card-icon-wrap emerald-bg">
              <Smartphone size={22} className="text-emerald" />
            </div>
            <div className="card-header-titles">
              <h3>Auth69 Mobile (auth69mob)</h3>
              <p>Your companion authenticator device</p>
            </div>
          </div>

          <div className="card-body">
            <div className="companion-device-card">
              <div className="device-icon">
                <Smartphone size={32} />
              </div>
              <div className="device-info">
                <h4>auth69mob Authenticator</h4>
                <p>Status: Ready & Listening for OTP Requests</p>
                <div className="live-ping">
                  <span className="ping-dot"></span>
                  <span>Real-Time SSE Gateway Connected</span>
                </div>
              </div>
            </div>

            <div className="mobile-instructions">
              <p>
                Run <code>npm run start</code> or <code>npx expo start</code> in the <code>auth69mob</code> folder to launch the companion app on your phone, web emulator, or simulator.
              </p>
            </div>
          </div>
        </div>

        {/* Card: Connected Devices & Active Sessions */}
        <div className="dash-card card-devices span-2">
          <div className="card-header">
            <div className="card-icon-wrap indigo-bg">
              <Laptop size={22} className="text-accent" />
            </div>
            <div className="card-header-titles">
              <h3>Connected Devices & Active Sessions</h3>
              <p>Devices and browsers currently logged into this email. You can remotely terminate any session.</p>
            </div>
            {devices && devices.length > 1 && (
              <button
                type="button"
                onClick={handleLogoutAllOthers}
                disabled={isLoggingOutOthers}
                className="btn-logout-all-others"
              >
                <LogOut size={14} />
                <span>{isLoggingOutOthers ? 'Terminating...' : 'Log Out All Other Devices'}</span>
              </button>
            )}
          </div>

          <div className="card-body">
            {isDevicesLoading ? (
              <div className="devices-loading">
                <Clock size={20} className="spin" />
                <span>Loading active connected devices...</span>
              </div>
            ) : devices && devices.length > 0 ? (
              <div className="devices-list">
                {devices.map((device: any) => (
                  <div key={device.deviceId} className={`device-item-card ${device.isCurrent ? 'current-device' : ''}`}>
                    <div className="device-item-left">
                      <div className="device-type-icon">
                        {device.deviceType === 'mobile' ? (
                          <Smartphone size={24} className="text-emerald" />
                        ) : (
                          <Laptop size={24} className="text-accent" />
                        )}
                      </div>
                      <div className="device-details">
                        <div className="device-name-row">
                          <span className="device-name-text">{device.deviceName || 'Web Browser'}</span>
                          {device.isCurrent ? (
                            <span className="current-badge">THIS DEVICE</span>
                          ) : (
                            <span className="active-dot-badge">Active</span>
                          )}
                        </div>
                        <div className="device-meta-row">
                          <span className="device-meta-item">IP: {device.ipAddress || '127.0.0.1'}</span>
                          <span className="device-meta-sep">•</span>
                          <span className="device-meta-item">
                            Last active: {formatDate(device.lastActive)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="device-item-right">
                      {device.isCurrent ? (
                        <span className="current-status-text">Active Now</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-revoke-device"
                          onClick={() => handleLogoutDevice(device.deviceId)}
                          disabled={revokingDeviceId === device.deviceId}
                        >
                          <LogOut size={14} />
                          <span>{revokingDeviceId === device.deviceId ? 'Logging out...' : 'Log Out'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-logs">
                <Laptop size={32} />
                <p>No active connected devices detected.</p>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Security & Activity Audit Log */}
        <div className="dash-card card-audit span-2">
          <div className="card-header">
            <div className="card-icon-wrap">
              <Activity size={22} className="text-accent" />
            </div>
            <div className="card-header-titles">
              <h3>Security Activity Log</h3>
              <p>Real-time audit history of authentication events and 2FA toggles</p>
            </div>
            <button onClick={refreshProfile} className="btn-refresh-logs" title="Refresh Activity">
              <Clock size={16} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="card-body">
            {auditLogs && auditLogs.length > 0 ? (
              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Details</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span className={`log-badge badge-${log.action.toLowerCase()}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="log-details">{log.details}</td>
                        <td className="log-time">{formatDate(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-logs">
                <Clock size={32} />
                <p>No recent activity recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Authenticator App (TOTP) Setup Modal */}
      {isTOTPModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card totp-setup-modal">
            <div className="modal-header">
              <div className="modal-icon-wrap indigo-bg">
                <QrCode size={24} className="text-accent" />
              </div>
              <div className="modal-titles">
                <h3>Set Up Authenticator App</h3>
                <p>Google Authenticator, Microsoft Authenticator, or Authy</p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsTOTPModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {totpSetupData ? (
                <>
                  <div className="totp-step-row">
                    <span className="step-num">1</span>
                    <p>Scan this QR code with your Authenticator app:</p>
                  </div>

                  <div className="qr-preview-box">
                    <img
                      src={totpSetupData.qrCodeDataUrl}
                      alt="Authenticator QR Code"
                      className="totp-qr-img"
                    />
                  </div>

                  <div className="totp-step-row">
                    <span className="step-num">2</span>
                    <p>Or enter this secret key manually:</p>
                  </div>

                  <div className="secret-key-box">
                    <code>{totpSetupData.secret}</code>
                    <button
                      type="button"
                      className="btn-copy-secret"
                      onClick={() => handleCopySecret(totpSetupData.secret)}
                    >
                      {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="totp-step-row">
                    <span className="step-num">3</span>
                    <p>Enter the 6-digit verification code from your app to confirm:</p>
                  </div>

                  <div className="totp-verify-input-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCodeInput}
                      onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ''))}
                      className="totp-code-field"
                      autoFocus
                    />
                  </div>

                  {totpSetupError && (
                    <div className="alert-box error" style={{ marginTop: '12px' }}>
                      <ShieldAlert size={16} />
                      <span>{totpSetupError}</span>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setIsTOTPModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-submit-verify"
                      onClick={handleVerifyTOTPSetup}
                      disabled={isVerifyingTOTP || totpCodeInput.length !== 6}
                    >
                      {isVerifyingTOTP ? 'Activating...' : 'Verify & Activate'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="devices-loading">
                  <Clock size={24} className="spin" />
                  <span>Generating Authenticator QR code...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

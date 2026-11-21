export interface User {
  id: string;
  email: string;
  name: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'number' | 'alphabet' | 'otp' | 'totp';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface TwoFactorChallenge {
  challengeId: string;
  email: string;
  message: string;
  mode?: 'number' | 'alphabet' | 'otp' | 'totp';
  matchNumber?: number;
  alphabet4?: string;
}

export interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface TOTPSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  otpAuthUri: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

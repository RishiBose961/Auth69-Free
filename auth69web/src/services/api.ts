import type { ApiResponse, User, AuditLog, ConnectedDevice, TOTPSetupResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  public getDeviceId(): string {
    let id = localStorage.getItem('auth69_device_id');
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('auth69_device_id', id);
    }
    return id;
  }

  private getToken(): string | null {
    return localStorage.getItem('auth69_token');
  }

  public setToken(token: string) {
    localStorage.setItem('auth69_token', token);
  }

  public clearToken() {
    localStorage.removeItem('auth69_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const deviceId = this.getDeviceId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }
      if (data && typeof data === 'object' && !data.data) {
        data.data = data;
      }
      return data;
    } catch (err: any) {
      console.error(`[API] Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  public async register(email: string, password: string, name: string) {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  public async login(email: string, password: string) {
    return this.request<{
      requires2FA: boolean;
      token?: string;
      user?: User;
      challengeId?: string;
      mode?: 'number' | 'alphabet' | 'otp';
      matchNumber?: number;
      alphabet4?: string;
      message: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  public async verify2FA(challengeId: string, otp: string) {
    return this.request<{ user: User; token: string }>('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otp }),
    });
  }

  public async resend2FA(challengeId: string) {
    return this.request<{
      challengeId: string;
      mode?: 'number' | 'alphabet' | 'otp';
      matchNumber?: number;
      alphabet4?: string;
    }>('/auth/resend-2fa', {
      method: 'POST',
      body: JSON.stringify({ challengeId }),
    });
  }

  public async checkChallengeStatus(challengeId: string) {
    return this.request<{
      status: 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'DENIED';
      token?: string;
      user?: User;
      mode?: 'number' | 'alphabet' | 'otp';
      matchNumber?: number;
      alphabet4?: string;
    }>(`/auth/challenge/${challengeId}/status`);
  }

  public async getProfile() {
    return this.request<{ user: User; auditLogs: AuditLog[] }>('/auth/me');
  }

  public async toggle2FA(enabled: boolean, method?: 'number' | 'alphabet' | 'otp' | 'totp') {
    return this.request<{ user: User }>('/auth/2fa/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled, method }),
    });
  }

  public async set2FAMethod(method: 'number' | 'alphabet' | 'otp' | 'totp') {
    return this.request<{ user: User }>('/auth/2fa/method', {
      method: 'POST',
      body: JSON.stringify({ method }),
    });
  }

  // --- Authenticator App (TOTP RFC 6238) Methods ---
  public async setupTOTP() {
    return this.request<TOTPSetupResponse>('/auth/2fa/totp/setup', {
      method: 'POST',
    });
  }

  public async verifyTOTPSetup(code: string) {
    return this.request<{ user: User }>('/auth/2fa/totp/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // --- Connected Devices & Active Sessions Management ---
  public async getConnectedDevices() {
    return this.request<ConnectedDevice[]>('/auth/devices');
  }

  public async logoutDevice(deviceId: string) {
    return this.request<{ message: string }>(`/auth/devices/${deviceId}/logout`, {
      method: 'POST',
    });
  }

  public async logoutAllOtherDevices() {
    return this.request<{ modifiedCount: number }>('/auth/devices/logout-all', {
      method: 'POST',
    });
  }

  // --- WhatsApp-Style QR Code Login Methods ---
  public async createQRSession() {
    return this.request<{
      qrId: string;
      qrCodeDataUrl: string;
      rawPayload: string;
      expiresAt: string;
      status: string;
    }>('/qr/create', {
      method: 'POST',
    });
  }

  public async checkQRStatus(qrId: string) {
    return this.request<{
      status: 'PENDING' | 'SCANNED' | 'AUTHORIZED' | 'DENIED' | 'EXPIRED';
      token?: string;
      user?: User;
    }>(`/qr/status/${qrId}`);
  }

  public async scanQR(qrId: string) {
    return this.request<{
      qrId: string;
      status: string;
      clientInfo: { ipAddress: string; userAgent: string };
    }>('/qr/scan', {
      method: 'POST',
      body: JSON.stringify({ qrId }),
    });
  }

  public async authorizeQR(qrId: string, deviceId?: string) {
    return this.request<{
      status: string;
      token: string;
      user: User;
    }>('/qr/authorize', {
      method: 'POST',
      body: JSON.stringify({ qrId, deviceId }),
    });
  }

  public async denyQR(qrId: string, deviceId?: string) {
    return this.request<{ status: string }>('/qr/deny', {
      method: 'POST',
      body: JSON.stringify({ qrId, deviceId }),
    });
  }
}

export const api = new ApiService();

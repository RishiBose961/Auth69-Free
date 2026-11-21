import { SERVER_CONFIG } from '../constants/config';
import { OTPChallengeItem } from '../types';

class MobileService {
  private customBaseUrl: string | null = null;

  public setBaseUrl(url: string) {
    this.customBaseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.customBaseUrl || SERVER_CONFIG.getBaseUrl();
  }

  /**
   * Log into auth69mob companion with email and password
   */
  public async login(email: string, password: string) {
    const url = `${this.getBaseUrl()}/api/auth/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-type': 'mobile',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        isMobile: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Mobile login failed');
    }
    return data.data || data;
  }

  /**
   * Register a new account directly from auth69mob
   */
  public async register(email: string, password: string, name: string) {
    const url = `${this.getBaseUrl()}/api/auth/register`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    return data.data || data;
  }

  /**
   * Fetch active pending OTP challenges strictly for the authenticated email
   */
  public async getPendingOTPs(token?: string | null, email?: string | null): Promise<OTPChallengeItem[]> {
    if (!token && !email) {
      // If not logged in on mobile, do not fetch any OTPs
      return [];
    }

    const queryParams = new URLSearchParams();
    if (email) queryParams.append('email', email);

    const url = `${this.getBaseUrl()}/api/mobile/pending-otps?${queryParams.toString()}`;
    try {
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();
      return (data.data || []).map((item: any) => ({
        ...item,
        status: 'PENDING',
      }));
    } catch (err: any) {
      console.warn('[MobileService] Error fetching pending OTPs:', err.message);
      throw err;
    }
  }

  /**
   * Approve login directly with 1 tap from mobile
   */
  public async approveLogin(challengeId: string, deviceId: string = 'auth69mob_device') {
    const url = `${this.getBaseUrl()}/api/mobile/approve`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        challengeId,
        deviceId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to approve login');
    }
    return data;
  }

  /**
   * Notify server that mobile scanned a WhatsApp-style QR code
   */
  public async scanQR(qrId: string, token: string) {
    const url = `${this.getBaseUrl()}/api/qr/scan`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ qrId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to process QR scan');
    }
    return data.data;
  }

  /**
   * Authorize WhatsApp-style web login from mobile
   */
  public async authorizeQR(qrId: string, token: string, deviceId: string = 'auth69mob_phone') {
    const url = `${this.getBaseUrl()}/api/qr/authorize`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ qrId, deviceId }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to authorize QR login');
    }
    return data.data;
  }

  /**
   * Deny QR web login attempt
   */
  public async denyQR(qrId: string, token?: string, deviceId: string = 'auth69mob_phone') {
    const url = `${this.getBaseUrl()}/api/qr/deny`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ qrId, deviceId }),
    });

    const data = await response.json();
    return data;
  }

  /**
   * Check connection status to auth69server
   */
  public async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/mobile/status`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const mobileService = new MobileService();

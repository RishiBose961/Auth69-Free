export interface OTPChallengeItem {
  challengeId: string;
  userId: string;
  userEmail: string;
  userName: string;
  mode?: 'number' | 'alphabet' | 'otp';
  otp: string;
  matchNumber?: number;
  numberOptions?: number[];
  alphabet4?: string;
  alphabetOptions?: string[];
  expiresAt: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
}

export interface MobileDeviceState {
  deviceId: string;
  isOnline: boolean;
  pairedEmail?: string;
  lastSync: string;
}

export interface PromptDecisionPayload {
  challengeId: string;
  decision: 'YES' | 'NO';
  selectedNumber?: number;
  selectedAlphabet?: string;
}

export interface ConnectedDeviceItem {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

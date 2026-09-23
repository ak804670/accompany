export type AuthChannel = 'phone' | 'email';
export type OtpChannel = 'sms' | 'email';
export type IdentityProvider = 'phone' | 'email' | 'apple' | 'google';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export type UserRecord = {
  id: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export type OtpStatus = 'pending' | 'verified' | 'expired' | 'locked';

export type OtpRecord = {
  id: string;
  destination: string;
  channel: OtpChannel;
  otpHash: string;
  expiresAt: Date;
  attemptCount: number;
  verifiedAt: Date | null;
  purpose: 'otp';
  status: OtpStatus;
};

export type SessionRecord = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceId: string | null;
  platform: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
};

export type DeviceInput = {
  deviceIdentifier: string;
  platform: string;
  appVersion?: string;
};

export type RequestContext = {
  ip: string;
  requestId: string;
  userAgent?: string;
};

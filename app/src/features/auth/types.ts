export type AuthChannel = 'phone' | 'email';

export type AuthStatus =
  | 'checking'
  | 'unauthenticated'
  | 'requestingOtp'
  | 'verifyingOtp'
  | 'authenticated'
  | 'error';

export type AuthUser = {
  id: string;
};

export type AuthFailure = {
  code: string;
  message: string;
};

export type OtpChallenge = {
  channel: AuthChannel;
  destination: string;
  expiresIn: number;
  resendAfter: number;
};

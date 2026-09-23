import type { AuthChannel } from '@/features/auth/types';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { method: AuthChannel };
  VerifyOtp: {
    channel: AuthChannel;
    destination: string;
    resendAfter: number;
  };
};

export type AuthenticatedStackParamList = {
  Home: undefined;
};

export const secureKeys = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  deviceId: 'auth.deviceId',
} as const;

export const preferenceKeys = {
  theme: 'theme.preference',
  deviceInformation: 'device.information',
  userPreferences: 'user.preferences',
} as const;

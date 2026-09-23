const appEnvs = ['development', 'staging', 'production'] as const;

export type AppEnv = (typeof appEnvs)[number];

export type AppEnvironment = {
  appEnv: AppEnv;
  apiBaseUrl: string;
  wsBaseUrl: string;
};

function readAppEnv(value: string | undefined): AppEnv {
  if (value === undefined || value === '') {
    return 'development';
  }

  if (appEnvs.includes(value as AppEnv)) {
    return value as AppEnv;
  }

  throw new Error(
    `Invalid EXPO_PUBLIC_APP_ENV "${value}". Expected development, staging, or production.`
  );
}

export const env: AppEnvironment = {
  appEnv: readAppEnv(process.env.EXPO_PUBLIC_APP_ENV),
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE_URL ?? '',
};

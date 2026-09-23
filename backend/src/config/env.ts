import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

const nodeEnvs = ['development', 'staging', 'production'] as const;

let envFileLoaded = false;

function loadLocalEnvFile(): void {
  if (envFileLoaded) {
    return;
  }

  envFileLoaded = true;

  if (existsSync('.env')) {
    loadEnvFile('.env');
  }
}

export type NodeEnv = (typeof nodeEnvs)[number];

export type AppConfig = {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpirySeconds: number;
  refreshTokenExpirySeconds: number;
  otpExpirySeconds: number;
  otpMaxAttempts: number;
  otpResendSeconds: number;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function nodeEnv(value: string | undefined): NodeEnv {
  if (value === undefined || value === '' || value === 'test') {
    return 'development';
  }

  if (nodeEnvs.includes(value as NodeEnv)) {
    return value as NodeEnv;
  }

  throw new Error(`Invalid NODE_ENV "${value}"`);
}

function positiveInt(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

export function readConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  if (source === process.env) {
    loadLocalEnvFile();
  }

  return {
    nodeEnv: nodeEnv(source.NODE_ENV),
    port: positiveInt('PORT', source.PORT, 4000),
    databaseUrl: required('DATABASE_URL', source.DATABASE_URL),
    redisUrl: required('REDIS_URL', source.REDIS_URL),
    jwtAccessSecret: required('JWT_ACCESS_SECRET', source.JWT_ACCESS_SECRET),
    jwtRefreshSecret: required('JWT_REFRESH_SECRET', source.JWT_REFRESH_SECRET),
    accessTokenExpirySeconds: positiveInt(
      'ACCESS_TOKEN_EXPIRY',
      source.ACCESS_TOKEN_EXPIRY,
      900,
    ),
    refreshTokenExpirySeconds: positiveInt(
      'REFRESH_TOKEN_EXPIRY',
      source.REFRESH_TOKEN_EXPIRY,
      60 * 60 * 24 * 30,
    ),
    otpExpirySeconds: positiveInt('OTP_EXPIRY', source.OTP_EXPIRY, 300),
    otpMaxAttempts: positiveInt('OTP_MAX_ATTEMPTS', source.OTP_MAX_ATTEMPTS, 5),
    otpResendSeconds: 30,
  };
}

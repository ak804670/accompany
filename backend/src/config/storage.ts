export type S3StorageConfig = {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  forcePathStyle: boolean;
  prefix: string;
  publicUrl?: string;
};

function optional(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function readStorageConfig(source: NodeJS.ProcessEnv = process.env): S3StorageConfig {
  const driver = optional(source.STORAGE_DRIVER)?.toLowerCase();
  if (driver && !['s3', 'r2', 'cloudflare r2', 'cloudflare-r2'].includes(driver)) {
    throw new Error('STORAGE_DRIVER must be "s3" or "cloudflare-r2"');
  }

  const bucket = optional(source.AWS_S3_BUCKET) ?? optional(source.S3_BUCKET);
  if (!bucket) throw new Error('AWS_S3_BUCKET (or S3_BUCKET) is required');

  const accessKeyId = optional(source.AWS_ACCESS_KEY_ID) ?? optional(source.S3_ACCESS_KEY_ID);
  const secretAccessKey = optional(source.AWS_SECRET_ACCESS_KEY) ?? optional(source.S3_SECRET_ACCESS_KEY);
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be configured together');
  }

  const endpoint = optional(source.AWS_S3_ENDPOINT) ?? optional(source.S3_ENDPOINT);
  const pathStyle = optional(source.AWS_S3_FORCE_PATH_STYLE) ?? optional(source.S3_FORCE_PATH_STYLE);
  let prefix = optional(source.AWS_S3_PREFIX) ?? optional(source.S3_PREFIX) ?? '';
  prefix = prefix.replace(/^\/+/, '');
  if (prefix && !prefix.endsWith('/')) prefix += '/';

  const publicUrl = optional(source.AWS_S3_PUBLIC_URL) ?? optional(source.S3_PUBLIC_URL) ?? optional(source.CDN_URL);
  return {
    bucket,
    region: optional(source.AWS_REGION) ?? optional(source.S3_REGION) ?? 'us-east-1',
    accessKeyId,
    secretAccessKey,
    endpoint,
    forcePathStyle: pathStyle === undefined ? Boolean(endpoint) : ['true', '1'].includes(pathStyle.toLowerCase()),
    prefix,
    publicUrl: publicUrl?.replace(/\/+$/, ''),
  };
}

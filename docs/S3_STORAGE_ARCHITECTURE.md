# S3 Media Storage

Profile photos are stored in S3-compatible object storage. The database stores object keys such as `profiles/{userId}/{mediaId}.jpg`.

Set these values in `backend/.env`:

```bash
STORAGE_DRIVER=s3
AWS_REGION=auto
AWS_S3_BUCKET=your-bucket
AWS_S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

For AWS S3, omit `AWS_S3_ENDPOINT` and use the bucket's AWS region. Credentials may also come from the AWS default credential provider chain. `AWS_S3_PREFIX` and `AWS_S3_PUBLIC_URL` are optional.

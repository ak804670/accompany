-- Move auth rows written to public.* into the acc schema, then drop the public copies.

INSERT INTO acc.m_users (id, status, last_seen_at, created_at, updated_at)
SELECT id,
       CASE WHEN status IN ('active', 'suspended', 'restricted', 'deleted') THEN status ELSE 'active' END,
       last_login_at,
       created_at,
       updated_at
FROM public.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO acc.m_auth_identities (id, user_id, provider, provider_subject, email, phone, created_at, updated_at)
SELECT id, user_id, provider, provider_subject, email, phone, created_at, updated_at
FROM public.auth_identities
WHERE user_id IN (SELECT id FROM acc.m_users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO acc.m_devices (id, user_id, device_identifier, platform, app_version, last_seen_at, created_at)
SELECT id, user_id, device_identifier,
       CASE WHEN platform IN ('ios', 'android', 'web') THEN platform ELSE 'android' END,
       app_version, last_seen_at, created_at
FROM public.devices
WHERE user_id IN (SELECT id FROM acc.m_users)
ON CONFLICT (device_identifier) DO NOTHING;

INSERT INTO acc.sessions (
  id, user_id, refresh_token_hash, device_id, platform, expires_at, last_used_at, revoked_at, created_at
)
SELECT s.id, s.user_id, s.refresh_token_hash, d.id, s.platform, s.expires_at, s.last_used_at, s.revoked_at, s.created_at
FROM public.sessions s
LEFT JOIN acc.m_devices d ON d.id = s.device_id
WHERE s.user_id IN (SELECT id FROM acc.m_users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO acc.otp_verifications (id, destination, channel, otp_hash, expires_at, attempt_count, verified_at, created_at)
SELECT id, destination, channel, otp_hash, expires_at, attempt_count, verified_at, created_at
FROM public.otp_verifications
WHERE channel IN ('sms', 'email')
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.otp_verifications;
DROP TABLE IF EXISTS public.devices;
DROP TABLE IF EXISTS public.auth_identities;
DROP TABLE IF EXISTS public.users;

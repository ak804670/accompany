# Replacing an Accompany communication provider

Accompany sends email and SMS through `EmailProvider` and `SmsProvider`. Mailjet and TextBee are adapters behind those interfaces. Auth, notifications, controllers, and the React Native app do not call a vendor.

Sign-in schedules `auth.otp` on the communication service. The service writes an outbox row and a `communication_logs` row in one database transaction with the OTP hash. A worker later renders the template and calls the configured provider. The OTP is encrypted in the outbox payload. The log stores the recipient, provider, and delivery status, not the code.

## Replace Mailjet with another email provider

1. Add a class that implements `EmailProvider` (`sendEmail` and `isHealthy`) under `backend/src/modules/communications/providers/email/`. Translate `SendEmailInput` into that vendor's request inside the class. Keep Mailjet field names, template IDs, and SMTP details in that file only.
2. Register the class in `emailProviders` inside `backend/src/modules/communications/providerFactory.ts`.
3. Allow the new name in `readCommunicationConfig` (`backend/src/config/communication.ts`) and read its secrets from the environment there.
4. Set `EMAIL_PROVIDER` to that name and provide the new secrets. Leave `SMS_PROVIDER` unchanged.
5. Run `npm test` and `npm run typecheck` in `backend/`.
6. Deploy the backend. Existing queued jobs are sent by whichever email provider the worker is configured to use. Webhook status updates for the old provider can stay on `POST /webhooks/email/mailjet` until those messages age out. Add `POST /webhooks/email/<name>` only in the webhook router, and normalize vendor statuses to `sent`, `delivered`, or `failed`.

## Replace TextBee with another SMS provider

1. Add a class that implements `SmsProvider` under `backend/src/modules/communications/providers/sms/`.
2. Register it in `smsProviders` in `providerFactory.ts`.
3. Accept the new `SMS_PROVIDER` value and its environment variables in `readCommunicationConfig`.
4. Set `SMS_PROVIDER` and the new secrets. TextBee sends from the registered device (`TEXTBEE_DEVICE_ID`). A future gateway may use a sender ID. Do not put that difference outside the adapter.
5. Run the backend tests.
6. Deploy. Point the new vendor's delivery webhook at `POST /webhooks/sms/<name>` with header `x-webhook-secret`.

`AuthService` should not need a change. It only calls `communications.schedule` with a template name, destination, and variables.

## Local development

`EMAIL_PROVIDER=mock` and `SMS_PROVIDER=mock` are the defaults when `NODE_ENV` is development and the variables are empty. The mock prints the rendered message to stdout so a local sign-in code can be read. Staging and production refuse `mock`.

Provider plan limits are optional environment variables (`EMAIL_MAX_DAILY_MESSAGES`, `SMS_MAX_MONTHLY_MESSAGES`, and the matching per-second limits). Empty means no cap. Do not copy a vendor's current free-tier number into business logic.

Automatic failover to a second provider is intentionally not implemented. A failed send is retried on the same provider, then marked failed. Adding a fallback later belongs in the worker, after the retry policy, so a timeout cannot deliver the same code twice.

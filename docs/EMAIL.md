# Email operations

## Current status

The repository has a branded React-rendered transactional template foundation and a server-only Brevo request adapter. It creates a generic non-sensitive subject, HTML and plain-text fallback, and one idempotency-labelled provider request. No route invokes it, no automated test sends a real message, and the email feature gate is unavailable by default.

The application must never report a message as delivered when Brevo is unavailable. The adapter returns unavailable or rejected rather than a success claim when required configuration is absent or a provider call fails.

## Template inventory

The template inventory covers verification support, welcome, application received/correction/approved/rejected, receipt received/correction/approved/rejected, membership activated/expiring, password-reset support, executive invitation, administrator notification, newsletter confirmation, and unsubscribe confirmation.

Subjects intentionally avoid identity-document, full payment-reference, password, token, and private application data. No document is attached to email.

## Enablement prerequisites

1. Store BREVO_API_KEY or approved SMTP settings in server-only deployment secrets.
2. Set BREVO_SENDER_ADDRESS and BREVO_SENDER_NAME after sender/domain verification, SPF/DKIM, bounce ownership, and support ownership are approved.
3. Keep SESC_PREVIEW_SAFE_MODE=false only in the reviewed environment, then set SESC_EMAIL_DELIVERY_ENABLED=true after an idempotent delivery queue is deployed.
4. Separate transactional and marketing consent. Newsletter sending requires a confirmed subscription and a working unsubscribe operation.
5. Use sandbox or allow-listed test recipients in staging; never point automated tests at a live audience.

## Server-operation requirements

A future trusted queue must re-fetch recipient identity/preferences, render allow-listed HTTPS action links, record only minimal delivery metadata, and retry with an idempotency key. It must not log full recipient addresses, rendered sensitive content, keys, reset tokens, document URLs, or receipt contents.

If Brevo reports compromise, unexpected delivery, abnormal bounce rate, or recipient-data concern: disable the key, pause the gate, preserve safe diagnostics, notify the authorised security contact privately, rotate credentials, and revalidate before re-enabling.

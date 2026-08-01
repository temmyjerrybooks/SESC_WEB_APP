# Transactional email setup

## Current readiness

The repository contains branded transactional-email templates and a server-only Brevo API adapter. It does not contain configured provider credentials, a verified sender, a live recipient list, or evidence of a real provider delivery. Email delivery is intentionally unavailable by default.

SMTP-shaped variables appear in [`docs/environment.example`](environment.example) for a future approved adapter, but the currently implemented delivery adapter uses the Brevo API key. Do **not** enable email delivery merely because SMTP values are present in a local file.

## Ownership and separation

An authorised SESC owner must approve the sender identity, reply-to/support ownership, privacy notice, retention, unsubscribe process, and incident contact before any non-test email is sent. Engineering configures the integration; it does not invent a club sender address, subscriber list, or consent record.

Use a separate provider account or project for staging. Staging may send only to allow-listed, synthetic test mailboxes controlled by the test team.

## Required deployment settings

| Setting | Where it belongs | Purpose |
| --- | --- | --- |
| `BREVO_API_KEY` | Server-side deployment-secret store | Credentials for the implemented Brevo API adapter. Never expose it to the browser. |
| `BREVO_SENDER_ADDRESS` | Server-side deployment-secret store | A verified sender address approved by SESC. |
| `BREVO_SENDER_NAME` | Server-side deployment configuration | The approved display name. |
| `NEXT_PUBLIC_SITE_URL` | Environment configuration | Canonical HTTPS site URL used when trusted flows generate links. |
| `SESC_PREVIEW_SAFE_MODE` | Deployment configuration | Must remain `true` for ordinary previews. An approved, isolated Preview-as-staging environment may set it to `false` only after the full gate evidence and synthetic-recipient controls are in place. |
| `SESC_EMAIL_DELIVERY_ENABLED` | Deployment configuration | Final explicit enablement only after all prerequisites below are satisfied. |

Do not place any value for `BREVO_API_KEY`, SMTP credentials, recipient addresses, reset tokens, service-role keys, or delivery logs in the repository. The template has blank values by design.

## Provider configuration procedure

1. Obtain organisation approval for the sender address, display name, reply-to route, support owner, transactional-vs-marketing policy, and incident owner.
2. In the approved Brevo account, verify the sender domain and sender address. Complete SPF, DKIM, and DMARC work with the domain owner before broad delivery.
3. Store `BREVO_API_KEY` only in the staging or production secret manager. Configure `BREVO_SENDER_ADDRESS` and `BREVO_SENDER_NAME` there as well.
4. Configure `NEXT_PUBLIC_SITE_URL` to the exact HTTPS environment origin. Ensure any linked destination is an allow-listed HTTPS route and that corresponding Supabase Auth redirect URLs are approved.
5. Keep `SESC_PREVIEW_SAFE_MODE=true` and `SESC_EMAIL_DELIVERY_ENABLED=false` until a staging validation record exists.
6. In staging, use a provider allow-list or sandbox and send only to synthetic test mailboxes. Record provider message IDs and timestamps in access-controlled operational evidence, not source control.
7. Review bounces, complaints, sender authentication, link destination, template rendering, plain-text fallback, and support routing.
8. After written approval, set `SESC_PREVIEW_SAFE_MODE=false` and `SESC_EMAIL_DELIVERY_ENABLED=true` only in the reviewed environment. Recheck the public readiness endpoint without exposing configuration values.

A gate being enabled is not proof that a message reached an inbox. The implementation must report provider acceptance conservatively and must not claim delivery when a provider request fails.

## Templates and content boundaries

The current template inventory includes account support, membership, payment-status, invitation, administrator-notification, and newsletter-preference messages. It intentionally uses a generic subject and omits identity documents, full payment references, passwords, authentication tokens, private application data, and document URLs.

Before release, an authorised owner must review all public-facing copy for legal accuracy, support contact details, consent wording, and Nigerian data-protection obligations. Do not replace unknown organisation details with invented content.

## Validation

Run the local static suite before staging work:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

Then carry out a controlled staging exercise:

1. Render every template and inspect the HTML and plain-text variants.
2. Send one message of each permitted type to an allow-listed synthetic recipient.
3. Verify the sender, reply-to path, HTTPS action link, mobile rendering, plain-text readability, and no-sensitive-subject rule.
4. Verify that a disabled email gate causes no provider request and no misleading success message.
5. Force a provider rejection in staging and verify that no retry duplicates a message and no sensitive payload appears in logs.
6. Test the implemented newsletter confirmation and unsubscribe operations only with a real consent model, approved sender, and allow-listed synthetic recipients; transactional permission does not grant marketing permission.

Keep screenshots and provider evidence redacted. Never retain raw recipient lists, cookies, API keys, email bodies containing private data, or reset links in a pull request.

## Operational controls

- Use an idempotency key for each trusted dispatch and retain only the minimum delivery metadata needed for support.
- Re-fetch recipient identity and notification preference at send time; never trust a browser-supplied recipient address for a protected notification.
- Do not attach identity documents or payment receipts to email.
- Keep production and staging provider credentials, sender identities, and audiences separate.
- Monitor bounces, complaints, unexpected send volume, provider alerts, and sender-authentication failures.
- Rotate credentials immediately if a key is exposed or provider activity is suspicious.

## Incident response

If delivery is misdirected, an account is compromised, or abnormal provider activity occurs: disable `SESC_EMAIL_DELIVERY_ENABLED`, revoke or rotate the provider key, preserve only redacted diagnostics, notify the authorised security and communications owners privately, assess affected recipients, and complete a staged retest before re-enabling delivery.

## Release evidence

Do not mark email production-ready until an owner has approved the sender and content, domain authentication is verified, staging sends and failure handling are evidenced, consent boundaries are tested, operational ownership is named, and the release checklist records the decision. Until then, leave the gate disabled.

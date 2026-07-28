# Email Operations

## Current status

Email delivery is intentionally not implemented in the current application. The newsletter route rejects requests before reading an address, so it does not subscribe anyone, retain an email address, or send mail. Membership submissions are likewise unavailable. This is deliberate until the club approves sender identity, templates, data handling, and delivery credentials.

Do not describe the preview as sending club email, and do not collect a subscriber list for production use from it.

## Delivery architecture

The intended provider is Brevo using a server-only adapter. Application code should call a small domain service, not the Brevo SDK directly from UI components.

```text
authorised server event
  -> validate event and recipient preference
  -> select approved transactional or marketing template
  -> render safe variables and plain-text alternative
  -> Brevo server-side API/SMTP delivery
  -> record minimal delivery event / audit event
```

The browser must never receive `BREVO_API_KEY`, SMTP credentials, full delivery payloads, or other subscribers' addresses.

## Required external configuration

Before enabling delivery, an authorised owner must supply:

- A Brevo account and server-only `BREVO_API_KEY` in the hosting provider's secret store.
- An approved sender name, sender address, reply-to address, and verified sending domain. These values are not yet represented in `docs/environment.example`; add them as non-secret deployment configuration only when the email adapter is implemented.
- Domain DNS records required by Brevo (SPF/DKIM and any tracking domain choice), verified in Brevo.
- An approved unsubscribe/contact route for newsletters and campaigns.
- Ownership for bounce, complaint, suppression, and delivery-failure review.
- Final legal/privacy wording and consent rules for marketing messages.

Use a separate Brevo project or clearly isolated audience for development/staging. Never point a staging environment at a live marketing audience.

## Message classes

| Class | Examples | Consent / unsubscribe expectation |
| --- | --- | --- |
| Transactional | Verify email, password reset, application received, payment decision, membership activation, event registration | Necessary service/security messages; do not add marketing content. |
| Operational | Executive invitation, correction request, support ticket response, important event update | Send only to the relevant authorised recipient; retain minimal audit metadata. |
| Marketing | Newsletter, partner opportunity, promotional event reminder | Require valid opt-in, preference controls, and a functioning unsubscribe link. |

## Approved template inventory

The intended template set is:

- Verify email; welcome; password reset; account invitation; executive invitation.
- Application received; application requires correction; application approved; application declined.
- Payment receipt received; payment approved; payment rejected.
- Membership activated; membership expiring; membership expired; renewal confirmed; digital card issued.
- Event registration; event reminder; event update; supporters' trip confirmation; gala invitation.
- Contact-enquiry acknowledgement; support-ticket acknowledgement; administrator notification.

Each template should provide a text fallback, accessible logo alt text, a concise purpose-specific subject, a single prominent action where applicable, and SESC green/white/subtle-gold branding. Do not include identity-document details, full payment references, passwords, access tokens, or unredacted personal data in email content.

## Safe implementation requirements

1. Trigger messages from successful server-side domain events, never from a client-side button click alone.
2. Re-fetch and authorise the recipient context at send time; do not trust a browser-provided email address for privileged messages.
3. Use signed, time-limited links for sensitive actions. Never email a service-role key or raw reset token in logs.
4. Escape/sanitise template variables and use allow-listed URLs based on `NEXT_PUBLIC_SITE_URL`.
5. Store only what operations need: template ID/version, event ID, recipient identifier or protected address reference, provider message ID, status, and timestamps.
6. Store render bodies only when a documented retention need exists; otherwise avoid them.
7. Handle provider errors without exposing credentials or recipient information in client responses.
8. Implement idempotency so retries do not send duplicate membership or payment messages.

## Testing and release checks

- Unit-test template input validation, preference logic, URL construction, and plain-text alternatives.
- In test/staging, use a sandbox/allow-list recipient address controlled by the team.
- Verify sender-domain authentication, unsubscribe links, deep links, mobile rendering, and accessibility before enabling production delivery.
- Test bounce/complaint handling and ensure a suppressed address cannot receive repeated marketing sends.
- Confirm event logs exclude secrets and sensitive attachment URLs.

## Operational response

If the provider reports a credential leak, unexpected campaign, unusual bounce rate, or recipient-data issue: disable the delivery key in the provider/host immediately, preserve only safe diagnostic evidence, notify the authorised security contact privately, and rotate/review credentials before re-enabling delivery.

# Manual bank-transfer payment verification

## Release state

The free initial manual-bank-transfer option is represented in the schema and domain state machine, but no public payment submission or receipt upload is enabled. The application must not activate from a browser field, a payment reference, or an uploaded file alone.

## Required member experience

After the secure membership workflow is live, an applicant should receive administrator-managed bank instructions, enter a payment reference, upload an approved private receipt, see pending verification, replace a receipt after a correction request, and see the controlled final status. Do not display raw bank details in source code or public fixtures.

## Required finance experience

Authorised finance officers must use a minimal finance queue that exposes payment reference, application reference, chapter, amount, currency, method, status, receipt presence, and verification state. It deliberately excludes applicant name, address, date of birth, emergency contact, identity-document path, profile-photo path, raw receipt path, provider reference, and bank reference.

Receipt access must be a separate server-authorised signed-URL operation. Finance access to a receipt does not imply access to identification documents.

## Data controls

- payment_receipts keeps versioned private receipt metadata and permits one current receipt lifecycle;
- payment_verifications keeps current/superseded decision history, verifier identity, timestamp, and controlled notes;
- verification decisions are immutable after supersession and audit-log entries record the event without receipt contents;
- application approval, payment approval, and membership activation remain distinct server-authorised decisions;
- no sensitive payment evidence appears in public exports or email subjects.

The domain state machine accepts receipt submission or replacement from the applicant only in pending_receipt or needs_resubmission contexts, and accepts approve, reject, or resubmission requests only from finance authority. Membership activation requires both application and payment approval.

## Optional Paystack adapter

Paystack remains an interface-only future adapter. Do not add public or secret keys, webhook endpoints, or live charge logic until SESC approves a separate payment release, webhook signing, replay protection, dispute process, and security review.

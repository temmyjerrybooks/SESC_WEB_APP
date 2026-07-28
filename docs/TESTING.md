# Testing Guide

## Quality gates

Run the following from the repository root before a release or pull request that changes application behaviour:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Install browser binaries once on a new workstation:

```powershell
npx playwright install
```

## Current automated coverage

| Layer | Tool | Current purpose |
| --- | --- | --- |
| Unit/validation | Vitest + Testing Library | Validates the membership schema's accepted and rejected inputs. |
| Browser smoke | Playwright | Starts a local server, checks the public home route, and checks the health endpoint. |
| Type safety | TypeScript | Strict compile-time checks through `npm run typecheck`. |
| Static quality | ESLint | Next.js/TypeScript linting through `npm run lint`. |

Current tests are intentionally small safety scaffolding, not evidence that every production workflow is complete. Add coverage with each feature; do not rely on smoke tests for authorisation, payment, or data-security confidence.

## Vitest

Vitest is configured in `vitest.config.ts` with JSDOM and shared setup in `src/test/setup.ts`. Put tests next to the relevant source as `*.test.ts` or `*.test.tsx` under `src/`.

```powershell
npm run test
npm run test:watch
```

Prioritise tests for:

- Input validation and error messages.
- Permission helpers as presentation behaviour, including expired and chapter-scoped grants.
- Membership state calculations and public-safe verification data.
- Notification preferences and URL/deep-link validation.
- Critical form keyboard/error behaviour.

## Playwright

`playwright.config.ts` uses `http://127.0.0.1:3000` by default and launches `npm run dev` when no local server is already in use. Run:

```powershell
npm run test:e2e
```

To target an already-running safe environment:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000"
npm run test:e2e
```

Never point browser tests that create users, upload files, send email, or mutate data at production. Keep test accounts and storage isolated from real members.

The smoke configuration covers Chromium by default. Expand the project matrix deliberately after the core flows work, including the required responsive viewports:

- 390 x 844 (mobile)
- 768 x 1024 (tablet)
- 1024 x 768 (small desktop)
- 1440 x 900 (desktop)

For browser debugging, use `npx playwright test --headed` or `npx playwright test --debug` locally. Do not commit generated `playwright-report/` or `test-results/` directories.

## Required integration and security coverage before live data

The following is mandatory before the platform processes real member information:

1. An applicant cannot read another applicant's profile, application, payment, receipt, membership, notification, or private object.
2. A chapter officer can access only their assigned chapter; a national grant works only for its permission.
3. A finance officer cannot approve unrelated payments or alter protected amount/payer/application fields.
4. A member cannot activate their own membership or assign their own role.
5. An auditor can read authorised audit data but cannot mutate it.
6. Public card verification returns only safe data for active, unexpired memberships.
7. Upload endpoints reject unauthorised users, unexpected MIME types, oversized files, unsafe paths, and cross-account access.
8. Rate limit, origin/CSRF-aware checks, Turnstile verification, and safe errors work on public mutation endpoints.

Use at least five separate test identities: applicant A, applicant B, chapter officer, national officer, and unauthorised user. Use non-production documents and payments only.

## End-to-end expansion plan

Once the services are implemented, add browser journeys for:

- Public and mobile navigation, search, legal routes, and error pages.
- Registration, login, logout, email verification, password reset, and session refresh.
- Authenticated application drafting/submission, private upload, manual payment evidence, status/correction, and membership card.
- Scoped administrator review, payment decision, content publication, and role-protection denial cases.
- Event registration, notification preferences, and notification deep links.

Use stable semantic locators such as accessible roles, labels, and test IDs only where no user-facing semantic locator is reliable. Assert visible outcomes rather than brittle implementation details.

## Manual accessibility and responsive checks

Automated tests do not replace manual review. For each changed screen, check keyboard-only navigation, visible focus, escape/dismiss behaviour, screen-reader labels/error announcements, reduced motion, zoom/reflow, long content, empty/error states, and the target viewports. Run an axe-based scan when the relevant test harness is added, and resolve serious violations before release.

## Failure triage

- Treat a failed type/lint/build check as a release blocker.
- Treat a failed RLS denial test as a security incident until proven otherwise; do not weaken a policy to make a test pass.
- If an E2E test cannot start the server, confirm the port is free or set a safe `PLAYWRIGHT_BASE_URL`.
- Capture only redacted logs/screenshots. Never attach passwords, cookies, service keys, payment data, or identity documents to test evidence.

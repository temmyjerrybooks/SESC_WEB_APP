# Pre-merge audit: PR #1

**Audit date:** 29 July 2026
**Pull request:** #1, feat/full-platform-implementation into main
**Decision:** **DO NOT MERGE**

## Executive decision

The clean-history remediation remains the approved foundation for this pull
request. The current implementation adds production-readiness foundations:
GitHub Actions CI, Dependabot configuration, typed fail-closed environment
gates, forward Supabase migrations, static schema checks, server-side portal
checks, private-upload validation, workflow state helpers, and email adapter
foundations.

Those changes are not yet sufficient to certify a production release. This
audit has no evidence that the migration chain was applied to a disposable or
staging Supabase project, that RLS was exercised with multiple identities, or
that any external provider configuration was safely validated. Public
collection routes remain intentionally unavailable. PR #1 must remain open
and unmerged.

## Clean-history status

The earlier approved remediation replaced the active feature ancestry with two
clean commits above main:

- Main baseline: eced6e1b435630567cf4c6b3b49dc0a77d4a5a30.
- Clean implementation: c7abd3fe765e91903f6f9f8ee4a5201d5adec0d1.
- Clean-history audit: e00695516c140909f2192a10e6ac5754c0ae44b8.

The historical privacy/design-export material was removed from the active pull
request ancestry. Local recovery refs and the external recovery bundle remain
outside the active branch and must not be pushed. This audit did not rewrite
history, force-push, merge the pull request, or query credentials.

## Verified implementation evidence

| Area | Verified local evidence | What the evidence does not prove |
| --- | --- | --- |
| Continuous integration | .github/workflows/ci.yml defines read-only, concurrency-controlled Security & hygiene, Static quality, and Browser tests jobs for PRs, main, the feature branch, and manual dispatch. The browser job uses a production build and Chromium; reports upload only on failure. PR CI run 30423560530 completed successfully for this branch head, including all three named jobs. | Branch protection cannot be enabled for this private repository under the current GitHub plan; the GitHub API returned its documented upgrade-or-public-repository restriction. |
| Dependency monitoring | .github/dependabot.yml schedules weekly npm and GitHub Actions checks with conservative open-PR limits and no automatic merge setting. | Dependabot has not yet created or validated an update PR. |
| Environment and feature gates | Typed public/server validation and server-only gates exist for authentication, membership applications, private documents, manual payments, newsletters, email delivery, and each portal. A gate defaults unavailable and requires preview-safe mode to be explicitly disabled, its server-only enablement setting, and its relevant prerequisites. Health returns only availability states and sets no-store caching. | Environment flags are attestations, not evidence that a database, bucket, RLS policy, provider, or server workflow is live and safe. |
| Authentication and portals | Auth UI requires both a browser-safe approval flag and the server-side authentication gate. Server portal checks use the appropriate portal gate, a Supabase session, account status, and database role/membership data. Safe return-path and authorization helper tests are present. | Registration, verification, sign-in/out, refresh, reset, suspension, invitation acceptance, and role access have not been validated against Supabase. |
| Supabase schema and RLS foundations | Six forward SQL migrations are present. The static verifier passed on 29 July 2026 and checked the migration chain, required tables, RLS-enablement statements, browser write-lock text, private-storage restrictions, finance queue minimisation, and invitation/notification foundations. | Static SQL inspection does not execute SQL, apply migrations, validate PostgreSQL privileges, or prove live RLS behavior. |
| Private storage | The source contains MIME, extension, size, magic-byte, opaque-path, and UUID checks. Migration text creates private bucket foundations and denies raw browser object access. | No real bucket, signed URL, upload, replacement, deletion, or cross-user access test has run. |
| Membership and payments | Application/payment state helpers and database foundations exist. Membership application, contact, and newsletter POST handlers still return 503 before reading a body. | No trusted server operation creates drafts, writes personal data, uploads files, approves applications, verifies payments, or activates memberships. |
| Email and newsletter | Transactional templates and a Brevo adapter foundation have unit tests. The newsletter endpoint remains unavailable and the gate requires email, Turnstile, abuse-prevention, Supabase, migration, RLS, and service-role prerequisites. | No Brevo credential, sender-domain, provider response, consent record, unsubscribe, rate-limit, or Turnstile verification has run. |
| Partnership regression | TOPSBORG configuration and external-link tests remain in the suite, and the final production browser run passed all executable TOPSBORG assertions. | This does not validate the partner's external website or any unapproved assets. |

## Validation performed for this audit

The following commands were run locally on 29 July 2026:

| Command | Result |
| --- | --- |
| node scripts/verify-supabase-schema.mjs | Passed: 6 migration files checked by the static verifier. |
| node scripts/check-repository-hygiene.mjs | Passed for the then-tracked 124 paths: zero dotenv, key, node_modules, build, bundle, debug, design-export, or high-confidence credential-pattern findings. |
| node scripts/check-repository-hygiene.mjs (complete staged tree) | Passed for 167 paths: zero dotenv, key, node_modules, build, bundle, debug, design-export, or high-confidence credential-pattern findings. |
| npm audit --offline --json | Returned zero cached advisories. This is not authoritative. |
| npm audit --offline --json --omit=dev | Returned zero cached production advisories. This is not authoritative. |
| npm ci --no-audit --prefer-offline and npm ls --depth=0 --offline --json | Passed from the workspace lockfile; integrity verification found 29 top-level package entries. |
| npm run typecheck | Passed (exit 0). |
| npm run lint | Passed (exit 0). |
| npm test | Passed: 15 files and 40 tests. |
| npm run build | Passed: Next.js production build generated 57 routes. |
| Production Playwright against an externally owned built server | Passed: 10 tests, 1 intentional development-preview skip. |
| Browser-bundle sensitive-pattern scan | Passed: zero matching files in .next/static for high-confidence credential values or server-only environment names. |
| GitHub Actions PR CI run 30423560530 | Passed: Static quality, Security & hygiene, and Browser tests all completed successfully. |

The hygiene command uses Git tracked paths. The complete staged tree was
scanned after every final source, migration, workflow, and documentation file
was present, which is the exact file set committed by this audit. CI must rerun
the same check after push. The expanded implementation itself has now passed a
clean locked installation, typecheck, lint, unit suite, production build,
production browser suite, and browser-bundle scan.

On this Windows workstation, Playwright's managed webServer teardown did not
exit after every assertion completed. The same production build was therefore
validated with PLAYWRIGHT_BASE_URL against a manually owned local server, which
exited cleanly with the result recorded above. This is a local test-harness
lifecycle observation to verify in remote CI, not an assertion failure.

## Dependency-audit status

The earlier clean installation reported 12 high-severity advisories, but its
JSON report was not retained. The affected packages, paths, vulnerable ranges,
patched versions, production reachability, and remediation options therefore
cannot be reconstructed safely from the aggregate count.

An online npm audit is unavailable in this environment because it would send
lockfile-derived dependency metadata to the npm service. The zero-result
offline audit only reflects cached advisory metadata; it does not resolve or
contradict the earlier 12-high finding. No forced audit fix, dependency
override, or speculative package upgrade was applied.

**Dependency status: unresolved merge blocker pending a reviewed online audit
for all dependencies and a production-only analysis.**

## Live Supabase and RLS validation: not run

No local Supabase/PostgreSQL runtime or disposable remote project was available
for this audit. The following evidence is explicitly absent:

1. Migration application, rollback planning, and schema inspection in a
   disposable database.
2. Cross-user and cross-chapter RLS tests, including denied reads and writes.
3. Applicant, member, executive, finance, national, administrator, suspended,
   and unauthenticated access tests.
4. Private Storage upload, signed-URL, expiry, replacement, deletion, and
   unrelated-user denial tests.
5. Supabase Auth redirect, email, session refresh, recovery, suspension, and
   invitation-flow tests.

Do not set SESC_DATABASE_MIGRATIONS_READY,
SESC_ROW_LEVEL_SECURITY_READY, or SESC_PRIVATE_STORAGE_READY to true until
this evidence exists in a non-production environment. Do not enable any
SESC_*_ENABLED gate in production while the associated server operation remains
unimplemented or unverified.

## Current safeguards

- Public pages remain available without requiring Supabase configuration.
- Default configuration is preview-safe and every sensitive feature gate is
  unavailable.
- Production portal requests fail closed when their server-side gate is
  unavailable; development previews contain no private data.
- Membership applications, contact delivery, and newsletter subscriptions
  return 503 before accepting a request body.
- The service-role key is server-only; health readiness never returns keys,
  URLs, database details, recipients, or gate diagnostics.
- CI contains no production Supabase, Brevo, Cloudflare, Firebase, payment, or
  other provider credentials and uses the safe default configuration.

## Remaining merge blockers

1. **Live Supabase migration and RLS validation has not run.**
2. **No trusted server-side membership, document, payment, newsletter, or
   notification operation is implemented and validated end to end.**
3. **Supabase Auth and invitation flows have not been validated against a
   configured non-production project.**
4. **Private Storage and signed URLs have not been validated with separate
   identities.**
5. **Brevo, Turnstile, rate limiting, sender-domain, and delivery controls
   have not been configured or tested.**
6. **A current online dependency audit has not been obtained; the prior
   high-severity finding remains unresolved.**
7. **The new GitHub Actions workflow has a successful PR run, but main branch
   protection cannot be enabled for this private repository under the current
   GitHub plan.**
8. **The complete local validation suite has passed, but final committed-tree
   hygiene and remote CI results are still pending.**
9. **Approved legal, operational, retention, support, finance-instruction, and
   incident-response content still requires owner confirmation.**

## Required next phase

1. Commit the focused implementation changes without rewriting history, then
   push normally to the feature branch. Do not merge PR #1.
2. Keep the named CI checks required once repository visibility or the GitHub
   plan permits branch protection; do not bypass the platform restriction.
3. Run an approved online npm audit for all and production dependencies, retain
   a redacted report outside source control, and remediate each advisory based
   on exact dependency paths and production reachability.
4. Start a disposable Supabase environment, apply all migrations, and run
   reproducible cross-identity RLS, storage, and Auth tests.
5. Implement and test trusted, idempotent server operations one workflow at a
   time. Keep public mutation routes unavailable until their gate prerequisites
   and operational controls are independently verified.
6. Configure providers and environment values through secret storage, prove
   the intended gate behavior in staging with synthetic data only, and rerun
   the complete validation, hygiene, and client-bundle scans.
7. Obtain product, security, privacy, and operations approval for a new audit.

## Final recommendation

**DO NOT MERGE.** The current work materially improves the production-readiness
foundation and preserves fail-closed behavior, but it does not yet have the
live Supabase/RLS, provider, dependency, CI, and end-to-end workflow evidence
required for a production merge.

## 30 July 2026 implementation addendum

The working branch subsequently added guarded server-owned routes and service-role-only RPC contracts for authentication actions, public contact/newsletter collection and confirmation, membership drafting/submission, private document registration, application/payment review, membership status, profile/content/contact updates, and role invitations. It also added a durable Supabase-RPC rate-limit contract, Turnstile integration paths, contact-retention gating, local synthetic seed/RLS harnesses, a browser-bundle scan, and updated operational documentation.

These additions supersede the earlier statement that no trusted server operation exists. They do **not** supersede the audit's release decision: no local Docker/Supabase runtime, remote staging project, provider credential, private-storage exercise, live Auth exercise, or online npm audit has been completed in this workspace. The feature branch and PR must remain unmerged while those external prerequisites and the exact candidate-revision CI evidence are outstanding.

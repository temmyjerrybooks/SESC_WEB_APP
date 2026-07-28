# Pre-merge audit: PR #1

**Audit date:** 28 July 2026
**Pull request:** #1, feat/full-platform-implementation into main
**Decision:** **DO NOT MERGE**

## Executive summary

The current working tree is materially safer and more reliable than the
pre-audit state. Public routes render cleanly, production portal access fails
closed without Supabase configuration, preview data-entry paths reject
submissions before reading them, and browser checks passed at every requested
viewport.

The pull request must nevertheless remain unmerged. Its reachable Git history
contains removed design-export files with identifiable imagery, named-role
content, and unverified commercial material. Commit metadata also contains one
individual email identity. The files are absent from the current tip, but they
remain reachable in PR history. No history rewrite, force-push, or rotation was
performed during this audit.

No credential exposure was found in the targeted full-history scan, so no
credential rotation is currently indicated. The historical privacy and
unverified-content exposure still requires an approved remediation before
merge.

## Scope and method

- Reviewed the complete main-to-feature diff, current worktree changes, public
  routes, portal guards, Supabase migrations, environment documentation, and
  TOPSBORG placements.
- At audit start, scanned all reachable source refs: local main and feature
  branches plus their origin refs. That source history contained 13 reachable
  commits, no tags, and clean Git object integrity. The subsequent audit-report
  commits do not change the historical finding.
- Ran targeted credential-pattern scans across reachable history. Gitleaks,
  trufflehog, and detect-secrets are not installed in this workspace, so this
  is not a substitute for an organisation-approved scanner in CI.
- Performed production-browser checks at 320x568, 390x844, 430x932, 768x1024,
  1024x768, 1280x800, 1440x900, and 1920x1080.
- Performed development-preview portal checks at the same eight viewport sizes
  only because the production configuration intentionally fails closed.

## Corrections made during the audit

- Made member, executive, and administrator routes fail closed to maintenance
  when production Supabase configuration is unavailable.
- Added server-side role and active-membership checks, including rejection of
  revoked or expired role assignments.
- Locked pre-production browser writes for RBAC, applications, payments,
  memberships, and private Storage objects in a new migration.
- Made contact, membership, newsletter, and membership-verification previews
  refuse personal-data collection until secure workflows are implemented.
- Added an explicit Auth action gate and documented the required Supabase-side
  signup, SMTP, template, and redirect controls.
- Marked privileged Supabase client code server-only.
- Corrected mobile drawer focus restoration in both public and portal chrome.
- Removed third-party font and image dependencies, and fixed the homepage
  countdown hydration mismatch.
- Corrected environment, deployment, RLS, contribution, lint-output, and
  whitespace documentation issues.

## Security and repository hygiene

### Current tip

The current tracked tree contains no committed environment files, dependency
directories, build output, private-key files, payment credentials, uploaded
identity documents, PDFs, or known confidential asset exports. The current
content uses clearly labelled development/demo records rather than verified
member data. The tracked-file check found no .env, node_modules, .next, out,
dist, coverage, Playwright-report, or test-result paths.

The environment template contains blank or placeholder values only. The
current-tree targeted credential scan found no private-key, service-role,
common cloud-token, payment-token, or database-URL patterns.

### Full reachable history - blocker

This is not a clean repository-wide result:

- Commit 3680f8b introduced 29 files under the removed
  stitch_sesc_digital_home_the_eagles_voice directory, totalling about
  7.75 MB. It includes 14 screenshots, 14 HTML exports, and one design
  document.
- Those assets contain identifiable portraits and named-role information, and
  include unverified partnership/sponsorship content. They were deleted from
  the current tip in a later commit but remain reachable from the PR history.
- Commit author/committer metadata across reachable history contains one
  individual email identity. Treat this as PII when the repository policy
  requires no personal identity in commit metadata.
- No targeted credential patterns were found in reachable content. Historical
  environment templates contain placeholders only. No key rotation is
  recommended from this evidence.

Do not rewrite Git history without explicit approval. The approved remediation
should either rebuild the feature branch from main with only reviewed commits,
or use a reviewed history-filter procedure to remove the export directory and
replace commit identities with an approved shared/no-reply identity. After an
approved force-push, request host-side object cleanup if required, have
contributors re-clone, and run a fresh full-history secret and privacy scan.

## Environment and deployment safeguards

docs/environment.example now documents local, isolated-preview, and production
use. It matches the variables read by the application:

- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_AUTH_ACTIONS_ENABLED
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL
- Turnstile, Brevo, Sentry, and Paystack optional integration settings

The production deployment must set a canonical HTTPS site URL and keep Auth
invite-only, or disable public signup and email delivery, until approved SMTP,
templates, redirect URLs, and account-operation controls exist. The UI flag
alone cannot disable Supabase Auth REST endpoints.

## Access control and data safeguards

- Production requests to /member, /executive, and /admin redirect to
  /maintenance?reason=configuration when Supabase is absent. They do not expose
  development dashboard content.
- With Supabase configured, portal checks require a verified session; member
  access also requires a member role or an active unexpired membership.
  Executive and administrator routes require the corresponding role sets.
- The new pre-production migration removes direct authenticated-browser writes
  to sensitive RBAC and workflow resources. It has not been applied to a real
  Supabase project during this audit.
- Contact, membership, and newsletter previews reject requests before reading
  body data. Membership verification is a clear unavailable screen, not a
  no-op form.
- Direct database/RLS behaviour, file handling, rate limiting, and actual
  Supabase Auth provider settings remain unverified until a disposable staging
  project and approved configuration are supplied.

## Public, responsive, and TOPSBORG review

The home page, membership routes, contact route, TOPSBORG route, login,
registration, password, email-verification, maintenance, and 404 route were
checked in the production build. Across 112 page/viewport checks there were no
horizontal-overflow findings, broken image elements, console errors, hydration
errors, or failed internal links. Twenty-four internal links were checked.
There are no external anchors to validate in the reviewed route set.

Development-only member, executive, and administrator previews passed the same
viewport sweep. Mobile public and portal drawers opened, trapped focus, closed
on Escape, restored launcher focus, and unlocked scrolling.

TOPSBORG placement is accurate and restrained. It identifies TOPSBORG
Technologies Limited only as the technology implementation partner under the
stated Goods/Services Sponsorship Agreement. It does not invent a logo, URL,
commercial amount, duration, testimonial, exclusivity, legal claim, or
performance claim. The dedicated page remains visibly labelled as editable
development content.

## Test and build results

| Check | Result |
| --- | --- |
| Clean dependency installation | Passed; 479 packages installed from the lockfile. One transitive deprecation warning was reported. |
| npm run typecheck | Passed |
| npm run lint | Passed |
| npm test | Passed: 1 file, 2 tests |
| npm run build | Passed; production route generation completed |
| npm run test:e2e against the production build | Passed: 4 of 4 |
| Production browser sweep | Passed: 112 page/viewport checks, zero console/hydration errors |
| Development portal preview sweep | Passed across all requested viewport sizes |
| Git diff check | Passed: no whitespace errors |
| Git object integrity | Passed: no unreachable-object errors reported |

## CI and PR status

No GitHub Actions workflow is committed in this repository, so these checks are
not currently enforced by remote CI. Before merge, add protected-branch CI for
clean install, typecheck, lint, unit tests, build, Playwright, history-aware
secret scanning, and an approval gate for migrations/security changes.

Live GitHub status at the end of this audit: PR #1 is open, unmerged, and
targets main from feat/full-platform-implementation. Its head is the audit
commit, GitHub reports zero check runs and zero status contexts, and the
combined status is pending because no CI context exists.

The pull request must remain open and unmerged pending the blockers below.

## Known limitations and merge blockers

1. **Blocker - reachable historical privacy and unverified-content exposure.**
   The removed design-export directory and commit metadata must be remediated
   through an explicitly approved history-cleaning process.
2. **Blocker - external Supabase validation is incomplete.** The migrations,
   RLS lockdown, role queries, private Storage policies, Auth settings, and
   redirect allow-list have not been applied and tested against a disposable
   staging project.
3. **Blocker - Auth provider controls are external.** The code gates UI
   actions, but the Supabase project itself must be configured invite-only or
   with public signup/email disabled before deployment.
4. **Release limitation - workflows remain intentionally unavailable.**
   Membership, contact, newsletter, payment, upload, verification, and
   operational mutation workflows must stay disabled until reviewed server-side
   implementations exist.
5. **Release limitation - no remote CI gate.** The current passing local checks
   do not protect the branch on GitHub.
6. **Content limitation.** Official legal text, contacts, crest/logo assets,
   social destinations, and other operational inputs still require authorised
   confirmation before public launch.

## Recommended next implementation phase

1. Obtain explicit approval for history remediation, rebuild/filter the branch,
   force-push only after approval, and re-run full-history privacy/secret scans.
2. Create a disposable Supabase staging project; apply the complete migration
   chain including the pre-production write lockdown; execute allowed/denied
   RLS and Storage scenarios using separate test identities.
3. Configure Auth as invite-only or otherwise disable public signup and email
   delivery; add approved SMTP, templates, redirect allow-list, and monitoring
   only after review.
4. Implement reviewed server-side workflows one at a time for membership,
   contact, consented newsletter delivery, payments, uploads, verification, and
   privileged operations. Add integration and abuse-prevention coverage before
   each is enabled.
5. Add GitHub CI and branch protections, then obtain security and product
   approval for a new pre-merge audit.

## Final recommendation

**DO NOT MERGE.** The application-level fixes and local validation are strong,
but current runtime quality cannot override reachable-history privacy exposure
or unverified external Supabase/Auth deployment controls.

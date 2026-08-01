# Candidate release evidence

**Date:** 31 July 2026

**Branch:** `feat/full-platform-implementation`
**Decision:** suitable for a controlled Preview deployment after remote CI; not authorised for a production launch or merge.

## Local validation

| Command | Result |
| --- | --- |
| `npm run supabase:verify` | Passed: 15 migrations checked, including ordered payment snapshots and private-upload intent safeguards. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed. |
| `npm test -- --pool=forks --maxWorkers=1` | Passed: 29 files, 84 tests. |
| `npm run build` | Passed: optimized build with 63 routes. |
| `npm run check:bundle` | Passed: 23 static assets and no sensitive browser-pattern finding. |
| Playwright against a manually owned local production server | Passed: 10 tests, 1 intentional development-portal skip. |
| Tracked-tree hygiene review | Passed: 221 paths with no committed dotenv, secret/key, node_modules, build/bundle, debug/design-export, or high-confidence credential-pattern finding. |

The default Playwright managed server completed every assertion but did not exit
on this Windows host during teardown. The same built artifact then passed with
`PLAYWRIGHT_BASE_URL` against an explicitly owned local server, which was
stopped by its exact process ID. This is a runner-lifecycle observation, not a
failed browser assertion.

## Security changes included

- An applicant cannot review their own application and a payer cannot review
  their own payment.
- A payment captures the original membership plan and chapter, and activation
  requires matching plan, chapter, amount, and currency.
- Private uploads use short-lived server-authorised intents, opaque paths,
  4 MiB limits, MIME/extension/magic-byte checks, idempotent registration, and
  service-side orphan cleanup.
- Newsletter unsubscribe uses a fragment-only capability and generic responses
  to avoid address enumeration.

## Remaining external gates

Hosted Supabase migration/RLS/Storage/Auth testing, provider configuration,
remote CI for the final commit, and any authorised online dependency audit are
not complete. They must use an isolated non-production project with synthetic
data. Keep PR #1 open and unmerged, and keep production out of scope.

# Continuous integration

The repository uses the CI workflow in .github/workflows/ci.yml. It runs on pull requests targeting main, pushes to main, pushes to feat/full-platform-implementation, and manual dispatches. It has read-only GitHub permissions and cancels superseded runs for the same pull request or branch.

## Required checks

| GitHub check name | What it verifies |
| --- | --- |
| Static quality | Locked dependency install, TypeScript, ESLint, unit tests, and a production build. |
| Browser tests | Locked install, Chromium installation, production build/start, Playwright public-route, responsive, hydration, overflow, disabled-workflow, TOPSBORG, 404, and production-gate checks. |
| Security & hygiene | Static Supabase schema/RLS verification plus tracked-path and high-confidence credential-pattern checks with redacted count-only output. |

CI has no Supabase, Brevo, Firebase, Cloudflare, Paystack, or production credentials. Feature gates default to unavailable, so CI cannot collect user data or call a live payment system.

## Local equivalents

    npm ci
    npm run typecheck
    npm run lint
    npm test
    npm run build
    node scripts/check-repository-hygiene.mjs
    node scripts/verify-supabase-schema.mjs

For an explicit production browser run, start the built app on a local port and set PLAYWRIGHT_BASE_URL before npm run test:e2e.

## Branch protection

Repository administrators should configure main in GitHub:

1. Open Settings, Branches, and add a branch protection rule for main.
2. Require a pull request before merging and require conversation resolution.
3. Require branches to be up to date before merging where the team workflow allows it.
4. Require the checks named Static quality, Browser tests, and Security & hygiene.
5. Disable force pushes and branch deletion.
6. Do not enable automatic merge until dependency, Supabase, and production-readiness blockers have been independently closed.

If repository policy prevents configuring these controls through the API, use the GitHub UI steps above and record the result in the release ticket.

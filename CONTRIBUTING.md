# Contributing to SESC Web App

Thank you for improving the SESC platform. This project handles supporter and membership workflows, so correctness, accessibility, privacy, and reviewability matter as much as presentation.

## Before you start

1. Read [README.md](README.md), [SECURITY.md](SECURITY.md), and the relevant document in `docs/`.
2. Create a focused branch, for example `feat/chapter-directory` or `fix/application-validation`.
3. Install the existing lockfile dependencies with `npm ci` and create a local `.env.local` from `docs/environment.example`.
4. Do not use real member data, credentials, bank details, identity documents, or unpublished club information in development or tests.

## Development standards

- Keep TypeScript strict. Avoid `any`; model inputs and responses explicitly.
- Prefer server components by default. Client components should exist only when interaction requires them.
- Validate every untrusted server input with Zod (or equivalent) and authorise every protected server operation.
- Treat UI permission checks as presentation only. Enforce access in server code and PostgreSQL RLS.
- Preserve the established SESC visual language, responsive layout patterns, keyboard operation, focus visibility, and reduced-motion support.
- Use approved club facts, contacts, links, logos, legal text, and photographs only. Clearly label development placeholders.

## Database changes

- Add a new timestamped file under `supabase/migrations/`; never rewrite a migration that may have been applied.
- Enable RLS in the same change for every sensitive table and write tests for allowed and denied access.
- Do not weaken policies, expose service-role credentials, or use a client-side role field as an authority boundary.
- Review the migration in a disposable project before linking or pushing to a remote project.

## Required checks

Run the checks relevant to your change before opening a pull request:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Use `npx playwright install` once when a workstation has no Playwright browser binary. For a database or authorisation change, also run the manual RLS scenarios in [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md).

## Pull requests

Keep pull requests small and explain:

- The problem and intended outcome.
- Routes, data objects, migrations, or permissions affected.
- Accessibility and responsive behaviour considered.
- Tests run and any manual verification performed.
- Configuration, operational, or rollout steps still required.

Include screenshots for visual changes and do not merge a security-sensitive change without a second reviewer. Never include `.env` files or screenshots containing private data.

## Reporting security issues

Do not open a public issue for a suspected vulnerability, credential leak, or private-data exposure. Follow the private reporting guidance in [SECURITY.md](SECURITY.md).

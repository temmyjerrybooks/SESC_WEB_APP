# Pre-merge audit: PR #1

**Audit date:** 28 July 2026
**Pull request:** #1, feat/full-platform-implementation into main
**Decision:** **DO NOT MERGE**

## Executive summary

The approved SESC application tree has been rebuilt onto origin/main with a clean feature history. The prior feature-only history included removed, unapproved design-export material that was absent from the approved tip but still reachable through the pull request. This remediation preserves the approved implementation tree exactly while replacing those feature commits with one reviewed implementation commit.

The active pull request must remain unmerged while external Supabase, Auth, deployment, workflow, dependency, and CI controls are completed and independently reviewed. No credential exposure was found, so credential rotation is not indicated by this audit.

## Clean-history remediation

### Reason and recovery

- Reason: remove feature-only historical privacy and unverified-content exposure from the active pull-request ancestry without changing the approved application state.
- Previous feature tip: ed8f4cf0d92f42602cb92e607b105f5ce37cc12e.
- Main baseline: eced6e1b435630567cf4c6b3b49dc0a77d4a5a30.
- Local-only recovery artifacts were created before reconstruction: backup/full-platform-before-history-cleanup, pre-history-cleanup-ed8f4cf, and an external Git bundle. They must not be pushed.
- New clean implementation commit: c7abd3fe765e91903f6f9f8ee4a5201d5adec0d1.
- The implementation commit uses the authenticated repository owner’s GitHub noreply identity rather than a personal email address.

### Reconstruction and tree equivalence

The clean branch was created directly from origin/main in an isolated worktree. Git read-tree transplanted the approved final tree into the new branch index, preserving paths, blobs, executable modes, additions, modifications, deletions, renames, and binary content without replaying earlier feature commits.

- Approved feature tree: 93edc86cc0d9704f7fe9b3e329bca5719468cca9.
- New implementation tree: 93edc86cc0d9704f7fe9b3e329bca5719468cca9.
- Result: exact tree-hash equality; 101 changed paths relative to origin/main; no untracked or generated file entered the index.
- Parent check: the new implementation commit has origin/main as its direct parent.
- Ancestry check: the previous feature tip is not reachable from the clean branch.

### Current-tree and reachable-history scan

A count-only scan was run without printing sensitive values.

| Scope | Result |
| --- | --- |
| origin/main reachable history | One commit, 29 unique paths, no blocked export, asset, dotenv, generated-output, private-key, bundle, credential, or payment-signature finding. |
| Clean branch before this audit update | Two reachable commits, 124 unique paths, zero blocked-path categories and zero high-confidence credential or payment signatures. |
| Production client bundles | No high-confidence secret signature found. |

The scan distinguishes inherited main history from the remediated feature history. No inherited origin/main blocker was found. Local recovery refs intentionally retain the former objects for recovery and are excluded from clean-branch reachability results.

### Verification commands and results

- npm ci completed from package-lock.json: 479 packages installed in the isolated worktree.
- npm run typecheck passed.
- npm run lint passed.
- npm test passed: 3 files and 5 tests.
- npm run build passed and generated the production route set.
- Playwright against the local production build passed: 6 tests passed and 1 production-only portal-preview test was intentionally skipped.
- The targeted development portal-credit test passed for member, executive, and administrator previews.
- Responsive, hydration, and horizontal-overflow checks passed at 390x844, 768x1024, 1024x768, and 1440x900.
- Production portal requests redirected to the configuration-maintenance gate. Synthetic membership and newsletter submissions both returned 503 before accepting data.
- TOPSBORG links were verified at https://topsborgtech.com with target=_blank and rel=sponsored noopener noreferrer.

### Main protection and host retention

Main was not rewritten, force-pushed, or otherwise modified. The original feature branch may be replaced only with a SHA-bound force-with-lease after the temporary remote branch and final audit checks pass.

A force-push removes prior feature commits from the active branch ancestry, but it does not prove immediate deletion of inaccessible GitHub backend objects, cached commit URLs, or pull-request event references. If complete host-side erasure is required, contact GitHub Support or consider repository recreation. No credential rotation is required from this audit.

## Current application safeguards

- Public routes, responsive layouts, and TOPSBORG partnership placements are present in the approved application tree.
- The official TOPSBORG destination is centrally maintained in src/config/site.ts. Public external links use semantic anchors, a visible focus treatment, target=_blank, and rel=sponsored noopener noreferrer.
- Production requests to /member, /executive, and /admin redirect to /maintenance?reason=configuration when Supabase configuration is unavailable.
- Membership, contact, and newsletter preview endpoints fail closed before collecting production data. The current audit confirmed 503 responses for synthetic membership and newsletter requests.
- Supabase client/server separation, RLS migrations, and role checks remain code-level foundations until a disposable staging project validates them.

## Remaining limitations and merge blockers

1. **Blocker - external Supabase validation is incomplete.** Migrations, RLS, Storage policies, role queries, and redirect settings have not been applied and tested against a disposable staging project.
2. **Blocker - Auth provider controls are external.** The code gates UI actions, but the Supabase project must be configured invite-only or with signup and email delivery disabled until approved controls are in place.
3. **Release limitation - protected workflows remain intentionally unavailable.** Membership, contact, newsletter, payment, upload, verification, and operational mutation workflows require reviewed server-side implementations before activation.
4. **Release limitation - no remote CI gate.** No GitHub Actions workflow or protected-branch check currently enforces the successful local verification suite.
5. **Dependency limitation.** The clean npm ci audit reported 12 high-severity dependency advisories. Review and remediate them before release.
6. **Content limitation.** Official legal text, contacts, crest/logo assets, social destinations, and other operational inputs still require authorised confirmation before public launch.

## Recommended next implementation phase

1. Push and review the temporary clean-history branch, then replace the feature branch only with the documented SHA-bound force-with-lease and re-check the pull request.
2. Create a disposable Supabase staging project; apply and test the migration chain, RLS, Storage, role, and redirect scenarios with separate non-production identities.
3. Configure Auth and delivery providers under approved policies, then enable reviewed server-side workflows one at a time with integration and abuse-prevention coverage.
4. Add GitHub CI, branch protection, dependency scanning, and organisation-approved history-aware secret scanning.
5. Obtain product, security, and operational approval for a new pre-merge audit after the external blockers are resolved.

## Final recommendation

**DO NOT MERGE.** The historical feature-branch privacy blocker is remediated in the clean branch, but the remaining external Supabase/Auth validation, disabled production workflows, dependency advisories, and missing remote CI gate still require resolution.

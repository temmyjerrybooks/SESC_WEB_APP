# Dependency audit

## Status

**Merge status: blocked pending a reproducible online advisory report.**

The prior clean installation recorded 12 high-severity advisories. Its JSON advisory report was not retained, so the affected package IDs, vulnerable ranges, paths, and patched versions cannot be reconstructed safely from the aggregate count alone.

An offline npm audit on 29 July 2026 reported 0 cached advisories across 611 lockfile packages (46 production, 529 development, 139 optional, and 8 peer dependencies). Offline output is not authoritative: it only reflects locally available advisory metadata and does not clear the historical 12-high result.

The environment did not permit the online npm audit request because it sends lockfile-derived dependency metadata to npm. No package upgrades, overrides, or forced audit fixes were applied without the advisory paths.

## Evidence ledger

| Required advisory field | Current evidence |
| --- | --- |
| Affected package and installed version | Not established; the original advisory JSON is unavailable. |
| Vulnerable range and dependency path | Not established; do not infer from a total count. |
| Direct or transitive classification | Not established. |
| Production or development exposure | Not established. |
| Whether vulnerable functionality is used | Not established. |
| Patched version and remediation | Not established. |
| Breaking-change risk | Not established. |
| Final status | Unresolved production-readiness blocker until a current online audit is reviewed. |

## Known lockfile context

Static inspection identifies a current lockfile with Next 16.2.12, React 19.2.8, Supabase JS 2.110.9, ESLint 9.39.5, Vitest 3.2.7, and Vite 7.3.6. A legacy minimatch 3.1.5 path is development tooling only through ESLint-related packages; that fact does not establish an advisory or remediation. The runtime lockfile also nests postcss 8.4.31 under Next. These observations are triage leads, not advisory findings.

## Required controlled remediation

1. Obtain explicit approval for one online npm audit --json --package-lock-only query and retain a redacted report outside source control.
2. Run equivalent all, production-only, and development-only analyses.
3. Classify each advisory by package, exact installed version, range, dependency path, exploitability, production reachability, patch, and compatibility risk.
4. Remove unused dependencies first; then update direct parents within supported ranges. Use an override only after compatibility verification.
5. Do not run npm audit fix --force and do not accept a lower numerical count as proof of remediation.
6. Re-run clean install, typecheck, lint, unit tests, production build, Playwright, bundle scan, and the online audit after every dependency change.

Unresolved production-runtime high findings remain merge blockers. Development-only findings may be accepted only with a documented path, non-reachability rationale, owner, review date, and compensating controls.

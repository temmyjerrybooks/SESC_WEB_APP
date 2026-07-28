# Changelog

All notable changes to this repository should be recorded here. The project follows the spirit of [Keep a Changelog](https://keepachangelog.com/) and uses Semantic Versioning once public releases begin.

## [Unreleased]

### Added

- Production operating documentation for architecture, deployment, email, content, administrators, members, testing, and the TOPSBORG partnership.
- A focused Vitest membership-validation test and Playwright public smoke coverage.

### Security

- Initial Supabase database foundation, scoped RBAC model, RLS policies, private-storage guidance, and security headers are present in the working tree. They require a reviewed Supabase deployment and integration tests before real-data use.

## Release policy

- Add an entry under `Unreleased` in the same pull request as the change.
- Record user-visible features, migrations, security changes, breaking changes, and deprecations.
- Do not put secrets, member information, incident details, or exploit descriptions in this file.
- Tag a release only after type checks, linting, tests, migration review, and deployment checks pass.

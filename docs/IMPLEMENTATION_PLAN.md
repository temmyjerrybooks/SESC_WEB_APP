# SESC Web Platform — Implementation Plan

## Delivery approach

The platform will be built incrementally at the workspace root, with the
original Stitch exports retained as visual source material. Each phase leaves a
runnable, deployable application; no phase depends on fabricated credentials
or sensitive live member data.

## Route and feature gap analysis

The design exports cover representative views only. All production routes,
data models, authenticated flows, and server behaviour are currently missing.

| Priority | Scope | Delivery target |
| --- | --- | --- |
| P0 | App shell, visual tokens, responsive header/footer, home page, 404/error, legal pages | Cohesive public foundation at 320px through wide desktop. |
| P0 | Membership overview and application-readiness experience | A safe public readiness route while the authenticated submission, private uploads, payment review, and retention workflow are staged. |
| P0 | Supabase schema/migrations, profiles, roles, permissions, scoped RLS, audit log | Database-enforced security foundation. |
| P0 | Auth pages/session guards, member dashboard, payment-review workflow, membership card verification | Core member and officer experience. |
| P1 | Chapters, leadership, match centre, news, events, gallery, sponsors, gala, TOPSBORG partnership, contact/search | Editable public content and complete navigable public platform. |
| P1 | Chapter, national executive, and super-admin portals | Scoped operations, responsive tables, reviews, content and reporting. |
| P1 | Notifications, email adapters/templates, support, uploads, monitoring and CI | Communication and operational readiness. |
| P2 | Optional Paystack, FCM push, MFA, advanced analytics and Cloudflare production integration | Credential-gated enhancements. |

## Phases

### 1. Audit and stabilisation

1. Preserve the design exports without modification.
2. Establish Git and the feature branch.
3. Create the strict Next.js/TypeScript/Tailwind base and environment contract.
4. Record this audit and plan.
5. Add application health endpoint, error handling, safe defaults, and quality tooling.

### 2. Design system and responsiveness

1. Formalise colour, type, spacing, elevation, motion, focus, and responsive tokens.
2. Build accessible primitives, public navigation, mobile drawer, footer, page heroes,
   cards, badges, form controls, and dashboard shell.
3. Test layout at 390, 768, 1024, and 1440 pixel viewports.

### 3. Public platform

1. Implement reusable content templates for club, leadership, chapters, matches,
   news, events, galleries, sponsors, gala, FAQ, legal, and search routes.
2. Build the cinematic home page from the strongest existing export traits.
3. Add the TOPSBORG partnership acknowledgement and editable partnership page.

### 4. Data, identity, and RBAC

1. Add Supabase migrations, enum/types, RLS policies, seed data, and storage buckets.
2. Add SSR-safe Supabase clients and guarded route patterns.
3. Model multiple roles and national/chapter scopes in join tables, not an editable
   profile text field.

### 5. Membership and payment verification

1. Build the 11-step application process with drafts, validation, uploads, consent,
   status timeline, and reference number.
2. Implement manual-bank-transfer receipt workflow, reviewer actions, audit events,
   activation, renewal, and public-safe card verification.
3. Keep a Paystack adapter disabled until keys are explicitly supplied.

### 6. Portals and operations

1. Deliver member, chapter, national, and super-administrator workspaces.
2. Add scoped reviews, content controls, payment checks, exports, support, and
   audit-visible operations.

### 7. Communication, security, and deployment

1. Add database notifications/realtime, React Email templates, development mail log,
   rate limits, Turnstile adapter, secure headers, upload validation, and monitoring.
2. Add unit, integration, accessibility, and Playwright coverage.
3. Configure Cloudflare/OpenNext, CI, deployment documentation, and final QA.

## Required production inputs

Before enabling live services, obtain official Supabase, email, Turnstile,
Sentry, analytics, bank-transfer, crest/logo, legal/contact, and TOPSBORG
profile/website values. None will be invented or committed.

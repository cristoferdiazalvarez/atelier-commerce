# Progress — 2026-11-13

## Delivery status

The existing Atelier Commerce application has been extended and validated in place. BusinessOS was not modified. The authenticated GitHub owner was verified as `cristoferdiazalvarez`. Public repository creation, commits and push are now authorized; the owner has now explicitly authorized a separate Vercel Hobby project and Neon Free database, without cards, paid services or changes to BusinessOS.

Repository target: https://github.com/cristoferdiazalvarez/atelier-commerce
Public application: **https://atelier-commerce-two.vercel.app**. Public HTTPS, actual Neon-backed shopping and role/session protections passed in desktop and mobile Chrome viewports. Only the authorized standalone Vercel Hobby project and Neon Free database were created. No paid plan, payment card, live payment or BusinessOS resource was modified.

## Completed functionality

- Real PostgreSQL catalog, search, category/collection/price/size/color/availability filters, sorting/pagination, variant detail, related products and gallery support.
- Account-isolated persistent bag/favorites, serialized database synchronization, guest-to-account merge and recovery of unsent local edits. Logging out or changing account cannot expose the preceding customer's selections.
- Registration/login/logout, hashed opaque sessions, secure-cookie configuration, customer-only isolated visitor demo identity, profile, address create/edit/delete, saved-address selection and paginated order history.
- Server quote before checkout, live catalog prices, percentage coupons/expiration, additive configurable tax and shipping, integer-cent accounting, explicit DEMO_UNPAID orders and no real charges.
- Serializable inventory reservation, conditional decrements, atomic movement records, bounded conflict retries, owned idempotency keys and immutable order-line snapshots.
- Stripe TEST-only Checkout scaffolding, stable retry expiration parameters, card-only method, signed raw-body webhooks, simultaneous-event deduplication and amount/session validation. No actual Stripe network payment is claimed.
- Private administration: database KPIs/charts; product create/edit/archive; variant create/edit/deactivate and safe unused deletion; image create/edit/order/remove; inventory movements; paid TEST fulfillment transitions; customer details; taxonomy CRUD with reference guards; coupons/settings; transactional audit.
- Search and independent pagination across products, orders, customers, coupons, inventory and audit. Public writes remain blocked by ALLOW_ADMIN_WRITES=false.
- Bounded request bodies, same-origin JSON checks, bcrypt byte limits, database-backed atomic rate limiting and expiring auth artifacts.
- Protected maintenance endpoint and daily Hobby-compatible deployment schedule prepared; English documentation, production examples, Docker configuration and PostgreSQL GitHub Actions workflow.

## Local results actually observed

- A fresh disposable PostgreSQL database was created, both migrations applied and fictional seed loaded. It was removed after verification; ordinary development orders/stock were not reset by the test suite.
- **16 unit/integration tests passed**, including concurrent final-unit purchase, repeated order-key ownership, coupon rollback, simultaneous webhook deduplication, amount/signature tampering, inactive variants, live-key rejection, role restrictions, public-write denial and atomic inventory/audit changes.
- **26 E2E checks passed** on a production Next.js server, in desktop Chrome and mobile Chrome emulation: storefront/search/variant bag, WELCOME10 totals and demo order, auth/CSRF/roles, private inventory changes, favorite persistence/account isolation, address ownership/edit/delete, demo identity, single-use password reset/session revocation, product/variant/image/coupon/taxonomy lifecycle and archived-product unavailability.
- The E2E total includes **10 axe accessibility/layout checks** across home, catalog, product, account and bag in both viewport profiles. No violations were reported for the selected WCAG tags. This is not full accessibility certification or field Core Web Vitals measurement.
- ESLint, strict TypeScript, production build and Prettier checks passed. npm audit reported **zero vulnerabilities**.
- Real desktop/mobile home, catalog and private-admin screenshots are included in docs. Private credentials, local PostgreSQL data, reports and logs are excluded from publication.
- The second migration was also applied to the normal existing development database without resetting its data.
- The local PostgreSQL launcher now closes its setup connection even when the database already exists, and the combined launcher reuses an already-running local database. A fresh npm run local startup returned HTTP 200 and its controlled shutdown was checked.

## Publication verification

- Public repository created: https://github.com/cristoferdiazalvarez/atelier-commerce
- Initial application commit `c42d6d627f9a3b60a887167b86f0f50a969aed52` was pushed to main. Git uses the owner's public no-reply author address; no private email was committed.
- Anonymous GitHub API and repository-page requests both returned HTTP 200. Public visibility, main branch and the requested technology topics were verified.
- GitHub Actions **Verify / application passed** for that commit, including clean npm installation, PostgreSQL 17 migrations/seed, secret/artifact scan, formatting, lint, typecheck, 16 unit/integration tests, production build, Chrome installation and all 26 E2E checks.
- Actual successful run: https://github.com/cristoferdiazalvarez/atelier-commerce/actions/runs/43444064357
- The staged/tracked-file review covered 100 files and reported no credential patterns or matches against private local environment values. `.env`, `.local`, node_modules, .next, generated reports, logs and TypeScript cache remained ignored. Screenshot review showed only fictional demonstration data.
- Environment examples default to no administrator credentials and public admin writes disabled. The final handoff documentation/configuration commit also triggers the same CI workflow; its current status is visible in the repository Actions tab.

## Public deployment — completed

- The owner explicitly authorized independent free resources and then completed a project-local Neon browser login. The earlier account-access blocker was resolved; there is no remaining hosting authorization request.
- Existing CLI account access was located outside global defaults. Vercel Hobby and Neon Free were verified through authenticated provider APIs before creation. BusinessOS credential files and deployed resources were not modified.
- Created only `atelier-commerce` in Vercel and `atelier-commerce` in Neon: PostgreSQL 17, AWS Frankfurt, lowest 0.25-CU range and the Free plan's default suspension. Neon rejected an explicit suspend-interval override; it was omitted without changing plans.
- Applied both versioned migrations and the fictional catalog seed on the new database. No public administrator was seeded. Direct migration and pooled runtime URLs were injected privately; production variables are encrypted in Vercel. No Stripe keys were configured.
- The first build was protected while configuration completed. The provider assigned `atelier-commerce-two.vercel.app`; APP_URL was set to that actual HTTPS origin before enabling public access. The runtime is pinned to Node 22 in project settings and package metadata.
- Production flags: DEMO_LOGIN=true, DEMO_CHECKOUT=true and ALLOW_ADMIN_WRITES=false. Daily maintenance is protected by a private CRON_SECRET; anonymous invocation returned 401.
- `npm run verify:hosted -- https://atelier-commerce-two.vercel.app` passed both public Chrome viewport profiles. Checks covered anonymous HTTP 200/trusted TLS, home/catalog/search, variant selection, bag/favorite persistence, isolated CUSTOMER demo login, HttpOnly/Secure/SameSite=Lax cookies, WELCOME10 total of EUR 275.81 for the seeded blazer, DEMO_UNPAID order/history, emptied bag, customer/anonymous admin denials, foreign-origin denial, protected maintenance and revoked-session replay after logout. Only fictional data was created; no payment was attempted.
- Actual public home, checkout and order screenshots were captured. The diagnostic report and browser artifacts remain ignored in test-results/hosted. The private local administration screenshot is labeled separately.
- Hosted acceptance uses an explicit cart URL wait before reloading and tolerates the actual accessible title line break. The initial strict title/navigation checks were corrected before recording a pass.
- Latest previously confirmed source CI: https://github.com/cristoferdiazalvarez/atelier-commerce/actions/runs/43449809020 (success, 16 unit/integration and 26 E2E checks). Final deployment/documentation commits trigger the same workflow; see the current result in the repository Actions tab.

## Remaining optional work

Stripe account-network verification still requires private TEST credentials; the public unpaid demo is complete without them. Operator monitoring, fictional-data retention/replenishment and the documented production-commerce exclusions remain in docs/LIMITATIONS.md. No paid upgrade or real transaction is authorized.

Docker execution is unverified because Docker is unavailable on this host. Physical-device/Safari review, production email delivery, real commerce/refunds/shipping, external monitoring/backups and advanced multi-device conflict resolution are documented boundaries in docs/LIMITATIONS.md.

## Run locally

`npm run local` starts the local PostgreSQL convenience runtime and Next.js. Open http://localhost:3000. The private local administrator remains configured only in ignored `.env`. `npm run verify:local` creates and drops a separate local test database and runs the full suite; direct test commands must only target a test database.

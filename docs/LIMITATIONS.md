# Verified scope and remaining limits

The storefront, authenticated customer flow, synchronized cart/favorites, addresses, server checkout and private back office are implemented and covered by local automated checks. This project is an unpaid portfolio demonstration, not a production commerce service.

## External verification still required

- Stripe TEST network Checkout/payment and webhook delivery need private test credentials. Local tests use genuine Stripe signature verification and real PostgreSQL transactions, but do not prove a payment was processed by Stripe.
- A public HTTPS demo requires explicit approval to create independent Free/Hobby resources and account access. No hosting resource or public app URL is claimed.
- Docker is configured but cannot be executed on this host because Docker is absent. GitHub Actions results are recorded separately in PROGRESS.md after actual remote execution.

## Deliberate boundaries

- Product deletion uses archival. Referenced/stocked variants are disabled, preserving order and inventory history; only empty unused variants can be deleted. Taxonomies cannot be deleted while products reference them.
- Images support add/edit/order/remove via local `/images/` paths or HTTPS URLs; binary file uploads and a separate object-storage service are not configured. Seeded products use one illustrative photograph each; gallery support accepts multiple images. Color choices and material descriptions describe fictional data, not verified merchandise.
- Administrators can move paid TEST orders through PROCESSING/SHIPPED. PENDING Stripe reservations are released by verified expiration or reconciliation, rather than unsafe manual restocking while a hosted payment session might remain open. Returns, refunds and real shipping integrations are outside the demonstration.
- Bags/favorites synchronize with serial writes, persist unsent edits locally and isolate account changes. Multi-device simultaneous edits use last-writer semantics; collaborative real-time conflict resolution is not implemented.
- Recovery tokens are single-use and revoke sessions. Local recovery prints a server-console link; production email delivery is unavailable and explicitly reports that limitation. Email verification, MFA and account export/deletion are not implemented.
- Vercel-overwritten IP headers are trusted only when running on Vercel. Elsewhere, auth requests use a conservative shared rate bucket. Public endpoints also validate payload size, origin, role and ownership. This is not an enterprise bot/fraud system.
- The tax model is an additive configurable demo percentage, not jurisdiction-specific tax compliance. Coupons support percentage, enabled state and expiration; redemption caps and complex promotions are not implemented.
- Demo orders consume demo inventory. Automated local verification uses an isolated disposable database; CI uses its own PostgreSQL service. The regular development database is not reset by tests using `npm run verify:local`.
- Daily authenticated maintenance is prepared in vercel.json; it does not run until hosting is authorized and deployed. At most 100 expired pending orders are reconciled per invocation. Late payments after released reservations remain manual exceptions, not silently fulfilled.
- Axe checks cover selected storefront/account/bag pages in desktop/mobile Chromium. This is not full WCAG 2.2 AA certification, physical-device/Safari testing or measured field Core Web Vitals. Manual keyboard/screen-reader and performance review remain advisable.
- Next.js may stream not-found content after HTTP headers have been sent, producing status 200 with noindex. Browser tests verify the unavailable-product screen and robots directive; this is the framework's documented streaming behavior.
- No external backups, error monitoring, email or asset-storage service is provisioned. Dependency overrides patch transitive tooling; keep full regression checks when upgrading.

# Security policy

This is an unpaid fictional portfolio demonstration. Never use real customer data, real cards or live Stripe secrets. Report security issues privately through the repository's GitHub private vulnerability reporting when available; do not publish secrets or real-account exploit details.

## Controls

- Bcrypt cost 12; passwords limited to 72 UTF-8 bytes to prevent silent truncation.
- Random 256-bit opaque sessions and single-use reset tokens; only SHA-256 hashes are stored. Reset revokes old sessions. Session cookies are HttpOnly, SameSite=Lax and Secure on the configured HTTPS origin.
- Mutation Origin/JSON checks, bounded streaming request bodies, Zod validation, server-enforced roles and resource ownership. Public registration/demo sessions only create CUSTOMER accounts.
- Database-backed atomic rate counters. Vercel's overwritten client IP header is trusted only on Vercel; direct deployments use a shared bucket. Expired counters/tokens/sessions are removed by authenticated maintenance.
- Serializable stock reservation, nonnegative stock constraints, immutable order lines, server-computed prices and idempotent order keys. Stripe keys/events must be Test-only; signed raw-body webhooks are deduplicated atomically.
- Successful admin mutations and audits commit together. Public deployment must set ALLOW_ADMIN_WRITES=false. STAFF is limited to inventory and fulfillment; ADMIN can manage store resources.
- Per-visitor demo identities and account-isolated browser state avoid sharing order histories or public admin credentials. No real card data passes through the application.
- `npm run security:scan` checks tracked/staged paths, credential patterns and matches against private local environment values without printing those values. It complements manual review and is not a guarantee that no secret can exist.

## Deployment boundaries

Do not commit `.env`, `.local`, reports, database dumps, tokens or private credentials. Public examples contain placeholders and intentionally local fictitious database values only. Generate private production values and the CI admin password at runtime. Production recovery email is explicitly disabled. No payment success is inferred from a redirect.

Before hosting, review HTTPS, provider limits, CRON_SECRET, database privileges, operational monitoring and data retention. See docs/LIMITATIONS.md for remaining production hardening. Paid services and live payment activation are outside the authorized project scope.

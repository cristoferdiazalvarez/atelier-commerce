# Contributing

Use Node 22.13+ and an isolated PostgreSQL database. Install with npm ci; generate Prisma, apply migrations and seed. Never use real customer data, live Stripe secrets or public administrator passwords.

Before proposing changes run lint, typecheck, unit/integration tests, production build and Playwright. Integration tests exercise PostgreSQL rather than mocks. Browser tests mutate fictional records. Update migrations, architecture, limitations and PROGRESS.md when behavior changes. Format with npm run format. Do not modify migrations already applied to shared databases; add a new migration.

Keep monetary amounts in integer cents. Validate every mutation on the server, authorize roles and ownership, preserve idempotency and never derive order totals from browser state. Public demo admin writes must remain disabled.

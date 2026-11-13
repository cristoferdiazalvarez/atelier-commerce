# ATELIER COMMERCE

An editorial fashion storefront with a real PostgreSQL backend, variant inventory, authenticated customer accounts, a private back office and an explicitly unpaid demonstration checkout.

[![Verify](https://github.com/cristoferdiazalvarez/atelier-commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/cristoferdiazalvarez/atelier-commerce/actions/workflows/ci.yml)

**[Open the live HTTPS demo](https://atelier-commerce-two.vercel.app)** — choose “Explorar con una cuenta demo” to start an isolated visitor session.

**Portfolio demonstration. No real sales, deliveries or live payments.** Deployed on Vercel Hobby with a separate Neon Free PostgreSQL database. Public desktop/mobile shopping acceptance passed against the real deployment: server totals, a discounted unpaid demo order, persistent bag/favorites, Secure cookies, permission denials and logout/session revocation. No card is needed; administration writes are disabled. [Deployment and operations](docs/DEPLOYMENT.md).

![ATELIER desktop storefront](docs/home-desktop.png)

## Stack

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4 with an original CSS design system, Prisma 6 / PostgreSQL, Zod, Zustand, Recharts, Stripe Test SDK, Vitest, Playwright, Docker Compose and GitHub Actions. Versions resolved in `package-lock.json` are authoritative. Use Node 22 LTS (22.13+); production and CI are pinned to the 22.x major.

## Run locally

```sh
npm ci
cp .env.example .env
# Set DATABASE_URL and DIRECT_URL to your PostgreSQL instance.
# Optional private admin: set ADMIN_EMAIL + ADMIN_PASSWORD (16+ characters).
# Keep ALLOW_ADMIN_WRITES=false for public demos; enable it only for private/local admin testing.
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Visit http://localhost:3000. Create a customer account with fictional data; select a product size and color; add to your bag; create a demo order. The optional “Explorar con una cuenta demo” button creates an isolated CUSTOMER session without a shared password. `WELCOME10` applies a 10% server-validated discount. Checkout displays server-validated totals before confirmation. Prices are in integer euro cents; VAT is added at checkout and the UI discloses this.

No PostgreSQL installation? `npm run db:local` starts an isolated PostgreSQL binary with data in ignored `.local/postgres` on port **54329**. Use `postgresql://atelier:atelier@localhost:54329/atelier` for both `DATABASE_URL` and `DIRECT_URL`. This is a local development convenience, not a hosting database. Its binary packaging dependency has a prerelease version; PostgreSQL itself is version 18. Docker uses stable PostgreSQL 17.

After configuring and seeding, start both the isolated database and Next.js with `npm run local` (stop with Ctrl+C). Administrator values in the examples are blank, so the seed creates no administrator by default. Provision a private account only by supplying your own private values in ignored `.env`. Customer sign-up never grants elevated roles. Do not publish the local environment or database.

## Docker

```sh
docker compose up --build
# In another terminal, initialize fictional catalog data:
docker compose exec app npm run db:seed
```

The container applies migrations on startup. Set administrator seed variables privately if a private admin account is needed. The Compose application disables admin writes by default. Docker configuration has been prepared but was not executed on the development host because Docker is unavailable.

## Features

- Editorial home, category and collection catalog, search, price/size/color/availability filters, sorting and pagination.
- Product detail, stock by variant, gallery support, related items and favorites.
- Browser-persisted bag and favorites with serialized PostgreSQL synchronization, recovery of unsent edits and account isolation. Server prices always override browser values.
- Registration, password login, isolated visitor demo login, opaque database-backed sessions, profile, address create/edit/delete, saved-address selection and paginated order history.
- Test password recovery: local server console link, expiring hashed token, single use and session revocation. Production email delivery is explicitly unavailable; the UI does not pretend to send email.
- Serializable order reservation, conditional stock updates, bounded retry, immutable line snapshots and idempotency keys.
- Explicit DEMO orders without a card; optional Stripe TEST Checkout and signed, deduplicated webhooks.
- Private STAFF/ADMIN back office: database KPIs, sales chart, product create/edit/archive, variant editing/visibility, image ordering/removal, inventory movements, fulfillment transitions, customer details, taxonomy CRUD, expiring coupons and settings. Search and pagination cover products, orders, clients, coupons, inventory and audit.
- Server authorization, ownership restrictions, bounded JSON payloads, origin checks, bcrypt byte limits, HttpOnly/Secure cookies, atomic database rate counters and inventory constraints. Protected maintenance is prepared for daily scheduling.

## Validation

```sh
npm run lint
npm run typecheck
npm test                 # Requires PostgreSQL and migrations; real integration tests
npm run build
npm run test:e2e         # Chrome desktop/mobile workflows and axe accessibility checks
npm run format:check
npm run security:scan    # Scan staged/tracked files before committing
npm run verify:hosted -- https://atelier-commerce-two.vercel.app # Creates fictional demo orders
```

For a complete isolated local verification, start `npm run db:local`, then run `npm run verify:local`. It creates, migrates, seeds and drops a disposable database on local PostgreSQL and tests a production server on port 3100, protecting normal development records.

See [PROGRESS.md](PROGRESS.md) for actual execution results and [known limitations](docs/LIMITATIONS.md). Direct `npm test` / `npm run test:e2e` commands target the configured database, so only use them with a test database. CI uses a disposable PostgreSQL service and generates its private admin password at runtime.

## Documentation

- [Delivery plan](PLAN.md) and [progress / next steps](PROGRESS.md)
- [Architecture and data model](docs/ARCHITECTURE.md)
- [Stripe Test setup and reconciliation](docs/STRIPE.md)
- [Deployment research](docs/DEPLOYMENT.md)
- [Image sources and license](docs/ASSETS.md)
- [Security policy](SECURITY.md) and [contributing](CONTRIBUTING.md)

## Architecture

```mermaid
flowchart LR
  Browser --> App[Next.js server components and route handlers]
  App --> Auth[Opaque database sessions and server roles]
  App --> Prisma --> DB[(PostgreSQL)]
  App --> Stripe[Stripe TEST only]
  Stripe --> Webhooks[Raw-body signature verification and idempotent events]
  Webhooks --> DB
```

Payments are optional. The unpaid demo flow uses the same server-price validation and transactional stock reservation as the test-payment flow, and always labels its order DEMO_UNPAID. No redirect is treated as proof of payment. [Architecture and invariants](docs/ARCHITECTURE.md).

## Screenshots

Screenshots below are real captures of the running application, not mockups.

![Catalog](docs/catalog-desktop.png)

![Verified public demo checkout](docs/checkout-demo.png)

Private local administration (public production writes are disabled):

![Private administration](docs/admin-desktop.png)

<details><summary>Mobile storefront</summary>

![Mobile storefront](docs/home-mobile.png)

</details>

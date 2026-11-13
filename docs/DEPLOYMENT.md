# Free HTTPS demo deployment

Status: **deployed and publicly verified** at https://atelier-commerce-two.vercel.app. The owner authorized creation and supplied a project-local Neon browser login. Existing Vercel account access was reused read-only; provider APIs confirmed Hobby/Free before creating independent Atelier resources. BusinessOS files, databases and deployments were not modified. No card, upgrade, paid service or live payment was activated.

## Existing deployment

| Resource         | Current setting                                               |
| ---------------- | ------------------------------------------------------------- |
| Public HTTPS app | https://atelier-commerce-two.vercel.app                       |
| Vercel project   | atelier-commerce, Hobby, Node 22.x, Frankfurt                 |
| Neon project     | atelier-commerce, Free, PostgreSQL 17, AWS Frankfurt          |
| Database         | atelier; separate pooled runtime/direct migration connections |
| Visitor access   | Isolated CUSTOMER demo identity, no shared password           |
| Payments         | Unpaid demo only; Stripe credentials omitted                  |
| Administration   | No public admin account; writes disabled in production        |
| Maintenance      | Daily at 04:00 UTC, authenticated with private CRON_SECRET    |

The Free account rejected overriding Neon suspension; creation succeeded using its enforced default. No account plan or billing setting was changed. Production variables were sent through authenticated HTTPS APIs and encrypted by Vercel; secrets, local credential files and browser reports were not published. Credentials remain outside Git and are not shown here.

Desktop and mobile Chrome viewport acceptance passed over trusted public HTTPS using `npm run verify:hosted -- https://atelier-commerce-two.vercel.app`. It creates only fictional visitor accounts and DEMO_UNPAID orders, verifies totals/stock-backed checkout and checks cookie, ownership/session and administrative denials. See PROGRESS.md for actual observed results and known verification limits.

## Future updates

Select the existing Atelier projects above rather than creating replacements. The initial publication used authenticated provider APIs with only tracked source files; Git auto-deployment was not connected. An operator can authenticate the official Vercel CLI independently and link this checkout to the existing Atelier project, or use the project's existing deployment controls. Never point this checkout at a BusinessOS project.

The database schema/data is provisioned separately: apply only committed migrations and idempotent fictional seeds from a private operator environment. Build/runtime startup never runs destructive resets. Do not create public admin credentials. After any deployment, repeat hosted acceptance and check the current GitHub Actions run. Two demo orders are created per acceptance run, consuming real demo stock; replenish only through controlled private operations.

## Current feasibility — checked 2026-11-13

Vercel Hobby is intended for personal/noncommercial use. This portfolio is explicitly an unpaid demonstration, never a real store. Confirm the existing personal account's Hobby eligibility and remaining allowance before creating an independent `atelier-commerce` project. Do not connect to, rename or alter BusinessOS.

Sources: [Hobby plan](https://vercel.com/docs/plans/hobby), [Hobby terms](https://vercel.com/legal/terms).

Neon Free currently advertises no card requirement, 100 CU-hours/month per project, 1 GB PostgreSQL storage per project and 5 GB/month network transfer. Inactive compute scales to zero. Hitting compute/transfer limits suspends compute until allowance resets; storage limits reject growth. These are provider limits, not measured application capacity. Keep the account on Free and monitor usage; do not enable a paid upgrade.

Sources: [Neon pricing](https://neon.com/pricing), [plan documentation](https://neon.com/docs/introduction/plans).

Vercel Hobby cron schedules are limited to daily execution and may run within the scheduled hour. `vercel.json` declares a single daily maintenance request at 04:00 UTC. This is suitable for the initial unpaid demo; it is not a promise of immediate Stripe reconciliation. Signed Stripe webhooks remain the primary payment/expiration mechanism.

Source: [Cron usage and pricing](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

## Reproducible provisioning reference (already completed)

1. Authenticate to the owner's existing Free/Hobby accounts. Current deployment access has already been verified; the steps below describe provisioning rather than an outstanding request to repeat it.
2. In Neon, create an independent **Free** project `atelier-commerce`, with database `atelier`, in a region near the chosen Vercel region. Do not reuse a BusinessOS database. Copy the pooled URL for DATABASE_URL and the unpooled URL for DIRECT_URL privately.
3. Import `cristoferdiazalvarez/atelier-commerce` into Vercel as a **new Hobby project**. Choose Next.js, project root `.`, Node 22 and `npm run build`. Disable the initial deployment until its database is migrated/seeded, or keep it protected during setup.
4. Set production variables using `.env.production.example` as the reference:

   | Variable                                  | Production value                                             |
   | ----------------------------------------- | ------------------------------------------------------------ |
   | DATABASE_URL                              | Neon pooled URL, TLS, `connection_limit=2&pool_timeout=20`   |
   | DIRECT_URL                                | Unpooled Neon migration URL with TLS                         |
   | APP_URL                                   | The exact assigned HTTPS production origin                   |
   | DEMO_CHECKOUT                             | `true`                                                       |
   | DEMO_LOGIN                                | `true`                                                       |
   | ALLOW_ADMIN_WRITES                        | `false`                                                      |
   | CRON_SECRET                               | Privately generated random value, at least 32 characters     |
   | STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET | Leave blank for the initial unpaid demo                      |
   | ADMIN_EMAIL / ADMIN_PASSWORD              | Leave blank unless separately provisioning a private account |

5. Apply `npm run db:migrate` and `npm run db:seed` from a trusted shell with the production database URLs loaded privately. Never paste them into issues, commits or public logs. Seeding without administrator variables creates only fictional catalog/settings/coupon data. The schema's DIRECT_URL is used for migrations; runtime uses DATABASE_URL. See [Neon/Prisma](https://neon.com/docs/guides/prisma).
6. Deploy, then verify the provider-generated `https://...vercel.app` URL from the internet. The hostname is assigned by Vercel and must not be invented. No custom domain purchase is needed.
7. Verify home/catalog/detail, filters, guest favorites, isolated demo sign-in, bag persistence, coupon totals and DEMO_UNPAID order history. Check that anonymous/customer requests cannot mutate `/api/admin/*`, that admin writes remain disabled and that the session cookie is HttpOnly/Secure/SameSite=Lax.
8. Verify CRON_SECRET protects `/api/ops/maintenance`. The endpoint removes expired sessions/reset tokens/rate counters and reconciles up to 100 expired pending reservations. It exposes no user records. Review its counters and provider usage routinely.
9. Refresh screenshots from the public URL and update the repository homepage/README only after HTTP and shopping-flow verification succeeds.

## Safe visitor identity

The “Explorar con una cuenta demo” button creates a random, private CUSTOMER identity for that visitor with an unguessable password. There is no shared public customer password, no shared order history and no demo administrator. Public registration remains available for fictional accounts. Production email recovery is explicitly unavailable; it does not pretend to send email.

## Optional Stripe TEST activation

An actual Stripe test-account checkout remains blocked by missing private test credentials. The public unpaid demo does not need them. If provided later, follow docs/STRIPE.md, retain Test-only guards and verify real signed events and expiration. Never enable live keys or real charges. Do not rely on the daily Hobby cron for timely reservation recovery when a webhook is unavailable.

## Resource and operations limits

The application uses PostgreSQL TCP through Prisma on Vercel's Node runtime; there is no local filesystem database in production. Images are packaged static assets. Pool limits must be tuned against the actual Neon account limit after deployment. Visitor accounts and demo orders accumulate fictional data and consume demo stock; monitor storage and replenish through controlled private maintenance. No automatic destructive order cleanup is enabled. Docker is an alternative local runtime, not a hosted resource created by this task.

# Free HTTPS demo deployment

Status: **authorized, awaiting account access; not deployed**. The owner has explicitly authorized creating a separate Vercel Hobby project and Neon Free database. GitHub publication is already complete. Neither provider is currently connected and no local CLI/API credentials are available. Install/connect the Vercel and Neon integrations using the intended existing personal accounts to continue. No card, upgrade, paid service or BusinessOS resource may be used.

## Current feasibility — checked 2026-11-13

Vercel Hobby is intended for personal/noncommercial use. This portfolio is explicitly an unpaid demonstration, never a real store. Confirm the existing personal account's Hobby eligibility and remaining allowance before creating an independent `atelier-commerce` project. Do not connect to, rename or alter BusinessOS.

Sources: [Hobby plan](https://vercel.com/docs/plans/hobby), [Hobby terms](https://vercel.com/legal/terms).

Neon Free currently advertises no card requirement, 100 CU-hours/month per project, 1 GB PostgreSQL storage per project and 5 GB/month network transfer. Inactive compute scales to zero. Hitting compute/transfer limits suspends compute until allowance resets; storage limits reject growth. These are provider limits, not measured application capacity. Keep the account on Free and monitor usage; do not enable a paid upgrade.

Sources: [Neon pricing](https://neon.com/pricing), [plan documentation](https://neon.com/docs/introduction/plans).

Vercel Hobby cron schedules are limited to daily execution and may run within the scheduled hour. `vercel.json` declares a single daily maintenance request at 04:00 UTC. This is suitable for the initial unpaid demo; it is not a promise of immediate Stripe reconciliation. Signed Stripe webhooks remain the primary payment/expiration mechanism.

Source: [Cron usage and pricing](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

## Exact activation steps after secure account access

1. Sign in to the owner's existing Neon and Vercel personal accounts if available. Account access has not been verified or provisioned by this local build.
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

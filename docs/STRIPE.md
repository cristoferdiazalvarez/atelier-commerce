# Stripe Test only

The unpaid demo flow works without a Stripe account or card. Stripe Checkout is hidden unless STRIPE_SECRET_KEY starts with `sk_test_`. The server rejects all other secret keys and refuses livemode webhook events. No card details are received or stored by this app.

## Local verification with your test account

1. Privately set STRIPE_SECRET_KEY to a test secret in `.env`.
2. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` using Stripe CLI in test mode.
3. Set STRIPE_WEBHOOK_SECRET to the listener's `whsec_...` secret and restart Next.js.
4. Sign in, add a product and choose Stripe TEST at checkout. Use Stripe's documented test cards only, such as `4242 4242 4242 4242` with a future expiry.
5. Verify the order moves from PENDING to PAID only after the signed event. Returning to the success URL is never proof of payment.
6. Resend the event and verify payment and stock remain unchanged. Expired sessions restore reserved stock once.

Docs: https://docs.stripe.com/testing and https://docs.stripe.com/webhooks/signature

## Reconciliation

Run `npm run reconcile` from a controlled process. The same operation is exposed at a constant-time bearer-protected `/api/ops/maintenance` endpoint. `vercel.json` prepares a once-daily Hobby-compatible schedule that remains inactive before authorized deployment. Set a private CRON_SECRET with at least 32 characters. It checks expired PENDING orders, retrieves their Stripe session, applies paid events, expires unpaid open sessions and releases stock transactionally. It defers complete-but-unpaid sessions, failed lookups and unresolved payment errors instead of releasing their stock. It reports deferred counts. It does not refund paid orders or silently accept payments arriving after cancellation; those require manual investigation. Configure a reliable schedule before enabling a hosted test demo.

Actual local verification covers signature generation/tampering, event idempotency, amount mismatch, stock contention and reservation release against real PostgreSQL. No network request to Stripe's payment API or actual test-card payment has been performed because credentials were not supplied.

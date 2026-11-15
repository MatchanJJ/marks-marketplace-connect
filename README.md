# Mark's Marketplace Connect — Test 4

A standalone copy of the Test 3 marketplace with sandbox Stripe Connect payments. It has a separate repository, Supabase project and Vercel project; the wall and original marketplace stay unchanged.

## Features
- Public photo listings, category filters, title search, listing detail pages and private buyer messages.
- Seller email starts Stripe-hosted onboarding with the full Stripe Dashboard and Stripe-managed risk; the connected account is stored privately in Supabase.
- Only ready sellers' items priced at least $0.50 can open Stripe-hosted Checkout. Free/lower-priced items use messaging.
- Direct charges on the seller's connected account collect a 10% application fee, rounded down to cents. Stripe processing fees are separate.
- Signed Connect webhooks verify the exact app, account, order, session, total and currency, then atomically confirm the order and mark the listing Sold. Replays are idempotent.
- Concurrent buyers share one active Checkout Session per listing. Only a Stripe-confirmed expired session can be replaced. Redirects never confirm orders.

## Setup
Use Node.js 24, run `npm ci`, and copy `.env.example` to `.env.local`. Public Supabase values belong in `NEXT_PUBLIC_` variables. The Supabase secret, Stripe secret and webhook signing secret are server-only. Never commit real credentials. Live Stripe keys and events are rejected.

In a fresh Supabase project, apply `supabase/marketplace.sql` followed by `supabase/connect.sql`. Sellers and orders have RLS and no public grants. Payment functions use invoker privileges and can only be called by the server role. Buyer messages have insert permission but no public reads.

Enable Connect in your selected Stripe sandbox before starting seller onboarding. Set `APP_URL` to the exact application origin. Run `npm run dev -- --port 3003` for local work. Create and deploy the app's own Vercel project with all environment values except the webhook secret, then run:

```powershell
node --env-file=.env.local scripts/create-webhook.mjs
```

The script registers only this app's Connect endpoint, verifies its connected-account scope, and saves its one-time signing secret directly into the ignored local environment file without printing it. It disables only this app's earlier account-scoped endpoints when replacing an incorrectly scoped registration. Add `STRIPE_WEBHOOK_SECRET` to Vercel and redeploy. Never delete another candidate's endpoint from the shared sandbox.

Run `npm run seed:mock` to populate six labelled stock-photo listings. Image sources are in PHOTO-CREDITS.md. Connect `demo@example.com` with Stripe using sandbox identity/bank data to make those listings purchasable.

## Verify
```powershell
npm test
npm run typecheck
npm run build
```

Run `supabase/verify-connect.sql` as an administrator for transactional database assertions. It rolls back its fixtures. Verify onboarding, Checkout with 4242 4242 4242 4242, the confirmation page, private order persistence, fee split and Sold status on the production site. Final verification status is recorded in TESTING.md. Screenshots and sanitized payment proof are delivered privately to the app owner.

## Limits
This hiring challenge uses email-only seller identity. The app now uses a separate sandbox because the provided shared sandbox reached its webhook-endpoint limit. It does not verify email ownership. Add real authentication, seller ownership checks, abuse controls, refunds/disputes and production operational controls before accepting real money. No shipping, tax, email notification, seller inbox or real payout to a bank is included. No application is submitted automatically.

Brief: https://tremendous-tiger-a4a.notion.site/Test-4-Stripe-Connect-41400bbdfc3b80a2909add50ab807591

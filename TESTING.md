# Verified sandbox integration

[Live app](https://marks-marketplace-connect.vercel.app)

## Verified behavior

- Standalone repository, Vercel project and Supabase database; the wall and Test 3 marketplace remain unchanged.
- Stripe-hosted Accounts v2 onboarding completed using synthetic identity and bank fixtures. Seller details, payments and payouts are enabled; account identifiers remain private.
- Six stock-photo listings remain. One listing is Sold after a paid sandbox order; the other five remain available. No diagnostic demo listings were added.
- Buy Now opens Stripe-hosted Checkout. Cancellation returns to the listing without confirming an order. Concurrent checkout requests reuse one session and one pending order.
- Client-supplied price, fee and connected-account overrides are ignored. The server uses its stored price and a 10% application fee, verified against Stripe's actual application-fee and seller balance records.
- A Stripe test-card payment succeeded. Adaptive Pricing presented the buyer's local currency while the Checkout Session, PaymentIntent, application fee and saved order retained USD amounts.
- Stripe delivered the signed payment event to production with HTTP 200. The webhook atomically saved the order as paid and the listing as Sold at the same timestamp; no manual database payment confirmation was used.
- A second Stripe-delivered replay returned HTTP 200, preserved the original timestamp and kept one order. A new purchase attempt for the Sold listing returns HTTP 409.
- Public receipts omit buyer email, connected-account ID, Checkout Session ID, payment-intent ID and checkout URL.
- Seller readiness and the paid receipt were checked at a 390-pixel viewport. The receipt has no horizontal overflow.

## Checks

- `npm test`: 9 focused tests pass for integer prices, validation, photo constraints, fee rounding, all seller-readiness combinations and exact payment-event matching.
- `npm run typecheck` and `npm run build`: pass.
- `npm run test:http`: passes public/private access, availability, invalid input, cross-origin, private receipt lookup and unsigned webhook checks. These checks create no records.
- `supabase/verify-connect.sql`: transactional reservation, permissions, fee, atomic fulfillment and replay assertions pass; fixtures roll back.
- A correctly signed unrelated-account event is ignored. A tampered payload is rejected with HTTP 400.
- Actual Stripe, Supabase and webhook secrets are absent from tracked source and browser assets. Local environment files, CLI tools and evidence files are ignored.
- Supabase security advisor reported no warnings or errors; two informational notices cover intentionally private RLS tables with no public policies.

## Webhook setup

The provided shared sandbox reached its endpoint limit. This app uses the owner's separate US sandbox instead; other candidates' endpoints were not changed.

An endpoint created before Connect activation was account-scoped. The setup script now requires a Connect application association and reuses only an enabled connected-account endpoint. The earlier app-owned endpoint is disabled and retained; one connected-account endpoint is active.

The first payment happened before that scope was corrected, so its real event was resent using Stripe's official CLI after the corrected signing secret was deployed. A second resend verified idempotency. The CLI was used only for these one-time commands; the app receives webhooks directly on Vercel and needs no local listener.

## Evidence and limits

Thirteen screenshots, a gallery, a sanitized payment proof and a read-only database query were delivered privately to the app owner. Screenshots of account onboarding and payment records are excluded from the public repository.

Sandbox only: no real charge or real bank payout was tested. Seller identity follows the challenge's email-only model and does not verify email ownership. Add authentication, ownership checks, abuse controls and production operations before accepting real money. No application was submitted.

# Verification status

- Standalone Test 4 Supabase project created in the marks organization, Singapore. Six stock-photo listings remain; no seller or order records have been created.
- Baseline marketplace schema and private seller/order schema applied through migrations. Transactional database assertions pass and roll back their fixtures.
- Nine focused unit tests, TypeScript checks, and the production build pass.
- Supabase security advisor: no warnings or errors; two informational notices document intentionally private RLS tables without public policies.
- Production HTTP checks pass for private tables, availability, cross-origin protection, invalid input, unready sellers, private receipts and unsigned webhook rejection.
- Replaced the shared Stripe sandbox with the user's separate US sandbox. The original sandbox had reached its 16-webhook-endpoint limit; no other candidate's endpoint was changed.
- Registered one enabled sandbox Connect webhook for this app. Saved its signing secret privately and updated the production and preview environment. The production deployment is Ready.
- A correctly signed event for an unrelated account is ignored. A tampered payload is rejected with HTTP 400. No payment was fabricated for these checks.
- Actual private sandbox, database and webhook values are absent from tracked source and browser assets.
- Onboarding uses Accounts v2 and Stripe-managed risk. Stripe currently returns `non_connect_platform_accounts_v2_access_blocked`: the user needs to enable Connect in the new sandbox dashboard.
- Hosted seller onboarding, a test-card Checkout purchase, signed payment fulfillment, the receipt, seller fee split and Sold status remain to be verified after Connect is enabled.

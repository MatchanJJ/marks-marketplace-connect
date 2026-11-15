# Mark's Marketplace Connect
Standalone Test 4 extension of the Test 3 marketplace. React, Next.js, TypeScript, Tailwind, shadcn/ui, Supabase and the official Stripe SDK. Separate GitHub repository, Supabase project and Vercel project.

Visitors browse/search photo listings, publish listings and save private messages. Sellers use their listing email to launch Stripe-hosted sandbox onboarding. Onboarded sellers' paid items expose Buy Now. Stripe-hosted Checkout uses direct charges and a 10% application fee rounded down to cents. Stripe's processing fees are separate. A signature-verified Connect webhook records the order and marks the item Sold atomically. The success page waits for webhook confirmation.

This is a sandbox-only hiring challenge. No login is required by the brief. Email-only seller identity is not ownership verification and must be replaced before any real-money launch. The shared Stripe sandbox receives unrelated candidates' events; ignore unknown accounts/orders. No application is submitted automatically.

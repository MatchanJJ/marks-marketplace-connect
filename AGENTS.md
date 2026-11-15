# Test 4 marketplace payments
- Keep this a standalone app and repository. Never modify the Test 2 or Test 3 databases or deployments.
- Preserve the inherited marketplace UI and photo/message flows. All payments must use Stripe sandbox mode; reject live keys and live events.
- Server determines price, account and fee; only a signed webhook may mark an order paid and its listing sold.
- Keep seller accounts, orders, buyer emails, and secrets private. Browser clients may not mutate payment state.
- Small conventional commits and conventional branches; no coauthor trailers.
- Run npm test, npm run typecheck, and npm run build before finishing.
- Never commit .env.local, Stripe keys, Supabase secret keys, or webhook secrets.

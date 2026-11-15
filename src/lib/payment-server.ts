import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { MarketplaceDatabase } from "./marketplace.types";
import { validEmail } from "./marketplace";
import { PAYMENT_APP } from "./payments";

export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key?.startsWith("sb_secret_")) throw new PaymentError("Payments are not configured yet.",503);
  return createClient<MarketplaceDatabase>(url,key,{ auth: { persistSession: false,autoRefreshToken: false } });
}
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new PaymentError("Only Stripe sandbox keys are allowed.",503);
  return new Stripe(key,{ maxNetworkRetries: 2,timeout: 15000 });
}
export function appUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new PaymentError("The application URL is not configured.",503);
  const url = new URL(value);
  if (url.protocol !== "https:" && !["localhost","127.0.0.1"].includes(url.hostname)) throw new PaymentError("The application URL must use HTTPS.",503);
  return url.origin;
}
export async function requestBody(request: Request) {
  if (request.headers.get("origin") !== appUrl()) throw new PaymentError("This request must come from the marketplace.",403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PaymentError("Send JSON.",415);
  const body = await request.text();
  if (body.length > 2048) throw new PaymentError("Request is too large.",413);
  let value: unknown;
  try { value = JSON.parse(body); } catch { throw new PaymentError("Invalid request body."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PaymentError("Invalid request body.");
  return value as Record<string,unknown>;
}
export function sellerEmail(value: unknown) {
  if (typeof value !== "string" || !validEmail(value)) throw new PaymentError("Enter a valid seller email.");
  return value.trim().toLowerCase();
}
export function paymentResponseError(error: unknown) {
  if (error instanceof PaymentError) return Response.json({ error: error.message },{ status: error.status });
  console.error("Payment request failed",error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: "Payments are temporarily unavailable. Please try again." },{ status: 503 });
}
export async function refreshSeller(email: string) {
  const db = adminClient();
  const found = await db.from("sellers").select("*").eq("email",email).maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) return null;
  const account = await stripeClient().accounts.retrieve(found.data.stripe_account_id);
  const flags = { charges_enabled: account.charges_enabled,payouts_enabled: account.payouts_enabled,details_submitted: account.details_submitted };
  const saved = await db.from("sellers").update(flags).eq("email",email);
  if (saved.error) throw saved.error;
  return { ...found.data,...flags };
}
export async function onboardingLink(email: string, create: boolean) {
  const db = adminClient(); const stripe = stripeClient(); const origin = appUrl();
  const existing = await db.from("sellers").select("*").eq("email",email).maybeSingle();
  if (existing.error) throw existing.error;
  let accountId = existing.data?.stripe_account_id;
  if (!accountId) {
    if (!create) throw new PaymentError("Start seller onboarding first.",404);
    const account = await stripe.v2.core.accounts.create({ contact_email: email,dashboard: "full",identity: { country: "US" },
      defaults: { responsibilities: { fees_collector: "stripe",losses_collector: "stripe" } },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { app: PAYMENT_APP },
    },{ idempotencyKey: PAYMENT_APP+":v2:"+createHash("sha256").update(email).digest("hex") });
    accountId = account.id;
    const saved = await db.from("sellers").upsert({ email,stripe_account_id: accountId },{ onConflict: "email",ignoreDuplicates: true });
    if (saved.error) throw saved.error;
  }
  return stripe.v2.core.accountLinks.create({ account: accountId,use_case: { type: "account_onboarding",account_onboarding: {
    refresh_url: origin+"/api/connect/refresh?email="+encodeURIComponent(email),
    return_url: origin+"/connect?returned=1&email="+encodeURIComponent(email) } } });
}

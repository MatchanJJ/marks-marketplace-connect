import type Stripe from "stripe";
import type { Order } from "./marketplace.types";

export const PAYMENT_APP = "marks-marketplace-connect";
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const platformFee = (amount: number) => Math.floor(amount / 10);
export const sellerReady = (seller: { charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean } | null) => Boolean(seller?.charges_enabled && seller.payouts_enabled && seller.details_submitted);

export function paymentMatchesOrder(session: Stripe.Checkout.Session, account: string, order: Order) {
  return !session.livemode && session.payment_status === "paid" && session.status === "complete"
    && session.metadata?.app === PAYMENT_APP && session.metadata.order_id === order.id
    && session.id === order.stripe_session_id && account === order.stripe_account_id
    && session.amount_total === order.amount_cents && session.currency === order.currency;
}

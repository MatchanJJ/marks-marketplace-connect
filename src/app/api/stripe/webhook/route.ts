import type Stripe from "stripe";
import { adminClient,paymentResponseError,refreshSeller,stripeClient } from "@/lib/payment-server";
import { isUuid,PAYMENT_APP,paymentMatchesOrder } from "@/lib/payments";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return Response.json({ error: "Webhook not configured." },{ status: 503 });
  const body = await request.text();
  if (body.length > 524288) return new Response("Payload too large",{ status: 413 });
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(body,request.headers.get("stripe-signature") ?? "",secret); }
  catch { return Response.json({ error: "Invalid webhook signature." },{ status: 400 }); }
  if (event.livemode || !event.account) return Response.json({ received: true });
  try {
    const db = adminClient();
    const owner = await db.from("sellers").select("email").eq("stripe_account_id",event.account).maybeSingle();
    if (owner.error) throw owner.error;
    if (!owner.data) return Response.json({ received: true });
    if (event.type === "account.updated") await refreshSeller(owner.data.email);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.app !== PAYMENT_APP || session.payment_status !== "paid") return Response.json({ received: true });
      const orderId = session.metadata.order_id ?? "";
      if (!isUuid(orderId)) return Response.json({ received: true });
      const order = await db.from("orders").select("*").eq("id",orderId).maybeSingle();
      if (order.error) throw order.error;
      if (!order.data) return Response.json({ received: true });
      if (!paymentMatchesOrder(session,event.account,order.data)) throw new Error("Payment snapshot mismatch");
      const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (!paymentIntent) throw new Error("Missing payment intent");
      const email = session.customer_details?.email;
      const confirmed = await db.rpc("confirm_order",{ p_order_id: orderId,p_session_id: session.id,p_account_id: event.account,
        p_total: session.amount_total!,p_currency: session.currency!,p_payment_intent: paymentIntent,p_buyer_email: email && email.length <= 254 ? email : null });
      if (confirmed.error) throw confirmed.error;
    }
    return Response.json({ received: true });
  } catch (error) { return paymentResponseError(error); }
}

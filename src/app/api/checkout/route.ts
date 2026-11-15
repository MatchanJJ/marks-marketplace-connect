import { adminClient,appUrl,PaymentError,paymentResponseError,refreshSeller,requestBody,stripeClient } from "@/lib/payment-server";
import { isUuid,PAYMENT_APP,sellerReady } from "@/lib/payments";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("listing_id") ?? "";
    if (!isUuid(id)) throw new PaymentError("Invalid listing.");
    const db = adminClient();
    const listing = await db.from("listings").select("seller_email,sold_at,price_cents").eq("id",id).maybeSingle();
    if (listing.error) throw listing.error;
    if (!listing.data) throw new PaymentError("Listing not found.",404);
    const seller = await db.from("sellers").select("charges_enabled,payouts_enabled,details_submitted").eq("email",listing.data.seller_email.trim().toLowerCase()).maybeSingle();
    if (seller.error) throw seller.error;
    return Response.json({ ready: sellerReady(seller.data),sold: Boolean(listing.data.sold_at),minimumMet: listing.data.price_cents >= 50 },{ headers: { "Cache-Control": "no-store" } });
  } catch (error) { return paymentResponseError(error); }
}
export async function POST(request: Request) {
  try {
    const body = await requestBody(request);
    if (typeof body.listingId !== "string" || !isUuid(body.listingId)) throw new PaymentError("Invalid listing.");
    const db = adminClient(); const stripe = stripeClient(); const origin = appUrl();
    const listing = await db.from("listings").select("*").eq("id",body.listingId).maybeSingle();
    if (listing.error) throw listing.error;
    if (!listing.data || listing.data.sold_at) throw new PaymentError("This item has already sold or is unavailable.",409);
    if (listing.data.price_cents < 50) throw new PaymentError("Stripe Checkout requires a price of at least $0.50.");
    if (!sellerReady(await refreshSeller(listing.data.seller_email.trim().toLowerCase()))) throw new PaymentError("This seller has not finished Stripe onboarding.",409);
    for (let attempt = 0; attempt < 2; attempt++) {
      const reserved = await db.rpc("reserve_order",{ p_listing_id: body.listingId }).single();
      if (reserved.error) throw reserved.error;
      const order = reserved.data;
      let session = order.stripe_session_id ? await stripe.checkout.sessions.retrieve(order.stripe_session_id,{},{ stripeAccount: order.stripe_account_id }) : null;
      if (!session) {
        session = await stripe.checkout.sessions.create({ mode: "payment",allowed_payment_method_types: ["card"],
          line_items: [{ quantity: 1,price_data: { currency: "usd",unit_amount: order.amount_cents,product_data: { name: order.listing_title } } }],
          payment_intent_data: { application_fee_amount: order.fee_cents,metadata: { app: PAYMENT_APP,order_id: order.id } },
          metadata: { app: PAYMENT_APP,order_id: order.id },
          success_url: origin+"/success?order_id="+order.id,
          cancel_url: origin+"/listings/"+order.listing_id+"?checkout=cancelled",
        },{ stripeAccount: order.stripe_account_id,idempotencyKey: "checkout:"+order.id });
        const saved = await db.from("orders").update({ stripe_session_id: session.id,checkout_url: session.url }).eq("id",order.id);
        if (saved.error) throw saved.error;
        // Idempotency can replay an older creation response; retrieve its current state.
        session = await stripe.checkout.sessions.retrieve(session.id,{},{ stripeAccount: order.stripe_account_id });
      }
      if (session.livemode) throw new PaymentError("Live payments are disabled.",503);
      if (session.status === "expired") {
        const expired = await db.from("orders").update({ status: "expired" }).eq("id",order.id).eq("status","pending");
        if (expired.error) throw expired.error;
        continue;
      }
      if (session.status !== "open" || session.payment_status === "paid") throw new PaymentError("Payment was received and is awaiting webhook confirmation. Open your order confirmation page.",409);
      if (!session.url?.startsWith("https://checkout.stripe.com/")) throw new PaymentError("Checkout could not be opened.",503);
      return Response.json({ url: session.url,orderId: order.id });
    }
    throw new PaymentError("Checkout expired. Please try again.",409);
  } catch (error) { return paymentResponseError(error); }
}

import { paymentResponseError,refreshSeller,sellerEmail } from "@/lib/payment-server";
import { sellerReady } from "@/lib/payments";
export async function GET(request: Request) {
  try {
    const seller = await refreshSeller(sellerEmail(new URL(request.url).searchParams.get("email")));
    return Response.json({ exists: Boolean(seller),ready: sellerReady(seller),detailsSubmitted: Boolean(seller?.details_submitted),chargesEnabled: Boolean(seller?.charges_enabled),payoutsEnabled: Boolean(seller?.payouts_enabled) },{ headers: { "Cache-Control": "no-store" } });
  } catch (error) { return paymentResponseError(error); }
}

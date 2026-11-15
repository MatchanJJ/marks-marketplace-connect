import { adminClient,PaymentError,paymentResponseError } from "@/lib/payment-server";
import { isUuid } from "@/lib/payments";
export async function GET(_request: Request,{ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new PaymentError("Invalid order.");
    const order = await adminClient().from("orders").select("id,listing_id,listing_title,amount_cents,fee_cents,status,paid_at").eq("id",id).maybeSingle();
    if (order.error) throw order.error;
    if (!order.data) throw new PaymentError("Order not found.",404);
    return Response.json(order.data,{ headers: { "Cache-Control": "no-store" } });
  } catch (error) { return paymentResponseError(error); }
}

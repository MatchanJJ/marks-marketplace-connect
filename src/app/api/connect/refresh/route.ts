import { onboardingLink,paymentResponseError,sellerEmail } from "@/lib/payment-server";
export async function GET(request: Request) {
  try { const link = await onboardingLink(sellerEmail(new URL(request.url).searchParams.get("email")),false); return Response.redirect(link.url,303); }
  catch (error) { return paymentResponseError(error); }
}

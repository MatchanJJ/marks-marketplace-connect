import { onboardingLink,paymentResponseError,requestBody,sellerEmail } from "@/lib/payment-server";
export async function POST(request: Request) {
  try { const body = await requestBody(request); const link = await onboardingLink(sellerEmail(body.email),true); return Response.json({ url: link.url }); }
  catch (error) { return paymentResponseError(error); }
}

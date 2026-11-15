import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/payments";
import { OrderConfirmation } from "@/components/marketplace/order-confirmation";
export const metadata:Metadata={title:"Order confirmation"};
export default async function SuccessPage({searchParams}:{searchParams:Promise<{order_id?:string}>}) {
  const {order_id}=await searchParams;if(!order_id||!isUuid(order_id))notFound();
  return <OrderConfirmation orderId={order_id}/>;
}

import type { Metadata } from "next";
import { ConnectSeller } from "@/components/marketplace/connect-seller";
export const metadata:Metadata={title:"Seller payments"};
export default async function ConnectPage({searchParams}:{searchParams:Promise<{email?:string;returned?:string}>}) {
  const query=await searchParams;
  return <ConnectSeller initialEmail={typeof query.email==="string"?query.email.slice(0,254):""} returned={query.returned==="1"}/>;
}

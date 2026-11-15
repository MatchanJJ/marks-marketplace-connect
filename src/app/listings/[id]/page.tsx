import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingDetail } from "@/components/marketplace/listing-detail";
import { isUuid } from "@/lib/payments";
export const metadata:Metadata={title:"Listing"};
export default async function ListingPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{checkout?:string}>}) {
  const {id}=await params;if(!isUuid(id))notFound();
  return <ListingDetail id={id} cancelled={(await searchParams).checkout==="cancelled"}/>;
}

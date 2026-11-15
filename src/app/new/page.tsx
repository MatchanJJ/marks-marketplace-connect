import type { Metadata } from "next";
import { CreateListing } from "@/components/marketplace/create-listing";

export const metadata: Metadata = { title: "Create a listing" };

export default function NewListingPage() {
  return <CreateListing />;
}

export const CATEGORIES = ["Electronics", "Furniture", "Clothing", "Books", "Sports", "Other"] as const;
export const LISTING_IMAGE_BUCKET = "listing-images";
export const PAGE_SIZE = 24;

export type ListingDraft = {
  title: string;
  description: string;
  price: string;
  category: string;
  seller_email: string;
};

export function priceInCents(value: string) {
  const price = value.trim();
  if (!/^(?:\d{1,6}|\d{0,6}\.\d{1,2})$/.test(price)) return null;
  const [whole, fraction = ""] = price.split(".");
  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function validEmail(value: string) {
  return value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function listingError(draft: ListingDraft) {
  const titleLength = Array.from(draft.title.trim()).length;
  if (!titleLength || titleLength > 120) return "Use a title between 1 and 120 characters.";
  const descriptionLength = Array.from(draft.description.trim()).length;
  if (!descriptionLength || descriptionLength > 3000) return "Use a description between 1 and 3,000 characters.";
  if (priceInCents(draft.price) === null) return "Enter a price from $0.00 to $999,999.99 with up to two decimal places.";
  if (!CATEGORIES.some(category => category === draft.category)) return "Choose a category for your listing.";
  if (!validEmail(draft.seller_email)) return "Enter a valid seller email address.";
  return null;
}

export function buyerMessageError(email: string, message: string) {
  if (!validEmail(email)) return "Enter a valid email address so the seller can reply.";
  const length = Array.from(message.trim()).length;
  if (!length || length > 2000) return "Write a message between 1 and 2,000 characters.";
  return null;
}

export function searchPattern(value: string) {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

export type Listing = {
  id: string; title: string; description: string; price_cents: number; category: string;
  seller_email: string; image_path: string; created_at: string; sold_at: string | null;
};
export type Seller = {
  email: string; stripe_account_id: string; charges_enabled: boolean;
  payouts_enabled: boolean; details_submitted: boolean; created_at: string;
};
export type Order = {
  id: string; listing_id: string; seller_email: string; stripe_account_id: string; listing_title: string;
  amount_cents: number; fee_cents: number; currency: string; status: "pending" | "paid" | "expired";
  stripe_session_id: string | null; checkout_url: string | null; payment_intent_id: string | null;
  buyer_email: string | null; created_at: string; paid_at: string | null;
};
export type MarketplaceDatabase = {
  public: {
    Tables: {
      listings: { Row: Listing; Insert: Omit<Listing,"id" | "created_at" | "sold_at">; Update: Partial<Listing>; Relationships: [] };
      messages: {
        Row: { id: string; listing_id: string; buyer_email: string; message: string; created_at: string };
        Insert: { listing_id: string; buyer_email: string; message: string };
        Update: { message?: string }; Relationships: [];
      };
      sellers: { Row: Seller; Insert: Pick<Seller,"email" | "stripe_account_id"> & Partial<Seller>; Update: Partial<Seller>; Relationships: [] };
      orders: { Row: Order; Insert: Omit<Order,"id" | "created_at">; Update: Partial<Order>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      reserve_order: { Args: { p_listing_id: string }; Returns: Order[] };
      confirm_order: { Args: { p_order_id: string; p_session_id: string; p_account_id: string; p_total: number; p_currency: string; p_payment_intent: string; p_buyer_email: string | null }; Returns: boolean };
    };
    Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never };
  };
};

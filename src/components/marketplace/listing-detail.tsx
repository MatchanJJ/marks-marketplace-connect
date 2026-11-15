"use client";

import Link from "next/link";
import { BuyNow } from "./buy-now";
import { useEffect, useState, type FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { createMarketplaceClient } from "@/lib/marketplace-client";
import { LISTING_IMAGE_BUCKET, buyerMessageError, formatPrice } from "@/lib/marketplace";
import type { Listing } from "@/lib/marketplace.types";

export function ListingDetail({ id,cancelled=false }: { id: string;cancelled?:boolean }) {
  const [client] = useState(createMarketplaceClient);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!client) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    void (async () => {
      try {
        const { data, error } = await client.from("listings").select("*").eq("id", id).abortSignal(controller.signal).maybeSingle();
        if (error) throw error;
        if (!controller.signal.aborted) setListing(data);
      } catch {
        if (!controller.signal.aborted) setLoadError("This listing couldn't load. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [client, id, retry]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !listing || saving) return;
    const problem = buyerMessageError(email, message);
    if (problem) { setMessageError(problem); return; }
    setSaving(true);
    setMessageError("");
    try {
      const { error } = await client.from("messages").insert({ listing_id: listing.id, buyer_email: email.trim().toLowerCase(), message: message.trim() });
      if (error) throw error;
      setSaved(true);
      setMessage("");
    } catch {
      setMessageError("Your message wasn't saved. Your draft is still here — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return <main id="market-main" className="market-detail-page">
    <Link className="market-back" href="/">Back to marketplace</Link>
    {cancelled?<p className="market-notice" role="status">Checkout was canceled. Check the listing below for availability.</p>:null}
    {loading ? <p className="market-loading" role="status">Loading this good find…</p> : null}
    {loadError ? <div className="market-error" role="alert"><p>{loadError}</p><button className="text-button" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : null}
    {!loading && !loadError && !listing ? <div className="market-empty"><h1>{client ? "This listing is no longer available." : "The marketplace is getting ready."}</h1><Link href="/">Browse other listings</Link></div> : null}
    {listing && client ? <div className="market-detail-grid">
      <div className="market-detail-photo"><img src={client.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(listing.image_path).data.publicUrl} alt={listing.title} /></div>
      <article className="market-detail-copy"><h1>{listing.title}</h1><p className="market-detail-price">{formatPrice(listing.price_cents)}</p><p className="market-detail-category">{listing.category}</p>
        <p className="market-description">{listing.description}</p>
        <p className="market-listed">Listed <time dateTime={listing.created_at}>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</time></p>
        <BuyNow listingId={listing.id}/>
        <div className="market-seller"><h2>Contact the seller</h2><a className="market-seller-email" href={`mailto:${encodeURIComponent(listing.seller_email)}`}>{listing.seller_email}</a>
          <button className="market-button" type="button" aria-expanded={contactOpen} aria-controls="seller-message-form" onClick={() => setContactOpen(value => !value)}>Message Seller</button>
        </div>
        {contactOpen ? <form id="seller-message-form" className="market-message-form" onSubmit={sendMessage}>
          <h2>Start the conversation.</h2><p className="market-help">Ask a question or let the seller know you're interested.</p>
          {saved ? <p className="market-success" role="status">Your message is saved for this listing. Email notifications aren’t enabled for this demo.</p> : <>
            <fieldset disabled={saving}><div className="market-field"><label htmlFor="buyer-email">Your email</label><input id="buyer-email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} /></div>
              <div className="market-field"><label htmlFor="buyer-message">Message</label><Textarea id="buyer-message" required value={message} onChange={event => setMessage(event.target.value)} placeholder="Hi! Is this still available?" /><p className="market-help">Up to 2,000 characters. Your message and email are private.</p></div></fieldset>
            {messageError ? <p className="market-error" role="alert">{messageError}</p> : null}
            <button className="market-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Send message"}</button>
          </>}
        </form> : null}
      </article>
    </div> : null}
  </main>;
}

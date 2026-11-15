"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { createMarketplaceClient } from "@/lib/marketplace-client";
import { CATEGORIES, LISTING_IMAGE_BUCKET, listingError, priceInCents, type ListingDraft } from "@/lib/marketplace";
import { PHOTO_TYPES, photoError } from "@/lib/photos";

export function CreateListing() {
  const router = useRouter();
  const [client] = useState(createMarketplaceClient);
  const [draft, setDraft] = useState<ListingDraft>({ title: "", description: "", price: "", category: "", seller_email: "" });
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const uploadedPhoto = useRef<{ file: File; path: string } | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview); }, [photo]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const problem = photoError(file);
    setError(problem ?? "");
    if (problem) return;
    uploadedPhoto.current = null;
    setPhotoReady(false);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || submitting.current) return;
    const problem = listingError(draft);
    if (problem) { setError(problem); return; }
    if (!photo || !photoReady) { setError("Choose a photo and wait for its preview before publishing."); return; }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      if (uploadedPhoto.current?.file !== photo.file) {
        const path = `${crypto.randomUUID()}.${PHOTO_TYPES.get(photo.file.type)}`;
        const uploaded = await client.storage.from(LISTING_IMAGE_BUCKET).upload(path, photo.file, { contentType: photo.file.type, upsert: false });
        if (uploaded.error) throw uploaded.error;
        uploadedPhoto.current = { file: photo.file, path };
      }
      if (!mounted.current) return;
      // shortcut: abandoned uploads require admin cleanup; schedule cleanup if storage grows.
      const { data, error } = await client.from("listings").insert({
        title: draft.title.trim(), description: draft.description.trim(), price_cents: priceInCents(draft.price)!,
        category: draft.category, seller_email: draft.seller_email.trim().toLowerCase(), image_path: uploadedPhoto.current.path,
      }).select("id").single();
      if (error) throw error;
      if (mounted.current) router.push(`/listings/${data.id}?published=1`);
    } catch {
      if (mounted.current) setError("Your listing wasn't published. Your draft and photo are still here — please try again.");
    } finally {
      submitting.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return <main id="market-main" className="market-form-page">
    <Link className="market-back" href="/">Back to marketplace</Link>
    <div className="market-page-heading"><h1>Give it a new home.</h1><p>A photo, a few details, and your listing is ready to meet its next owner.</p></div>
    {!client ? <p className="market-error" role="status">Publishing is temporarily unavailable. Please check back soon.</p> : null}
    <form className="market-listing-form" onSubmit={publish}>
      <fieldset disabled={saving || !client}>
        <div className="market-photo-field">
          <label htmlFor="listing-photo">Listing photo <span>Required</span></label>
          <input id="listing-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} aria-describedby="listing-photo-help" />
          <p id="listing-photo-help" className="market-help">One JPG, PNG, or WebP image, up to 5 MB. Your photo will be public.</p>
          {photo ? <div className="market-photo-preview"><img key={photo.preview} src={photo.preview} alt="Listing photo preview"
            onLoad={() => setPhotoReady(true)} onError={() => { setPhoto(null); setPhotoReady(false); setError("This photo couldn't be opened. Please choose another."); }} />
            <button type="button" className="text-button" onClick={() => { setPhoto(null); setPhotoReady(false); uploadedPhoto.current = null; }}>Remove photo</button></div> : null}
        </div>
        <div className="market-field"><label htmlFor="listing-title">Title</label><input id="listing-title" required value={draft.title} placeholder="What are you passing on?" onChange={event => setDraft({ ...draft, title: event.target.value })} /><p className="market-help">Up to 120 characters.</p></div>
        <div className="market-field"><label htmlFor="listing-description">Description</label><Textarea id="listing-description" required value={draft.description} placeholder="Tell people about its condition, size, and what makes it useful." onChange={event => setDraft({ ...draft, description: event.target.value })} /><p className="market-help">Up to 3,000 characters.</p></div>
        <div className="market-field-row">
          <div className="market-field"><label htmlFor="listing-price">Price (USD)</label><input id="listing-price" required inputMode="decimal" placeholder="0.00" value={draft.price} onChange={event => setDraft({ ...draft, price: event.target.value })} /><p className="market-help">Enter 0 for a free item.</p></div>
          <div className="market-field"><label htmlFor="listing-category">Category</label><select id="listing-category" required value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Choose a category</option>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></div>
        </div>
        <div className="market-field"><label htmlFor="seller-email">Seller email</label><input id="seller-email" type="email" required maxLength={254} autoComplete="email" value={draft.seller_email} placeholder="you@example.com" onChange={event => setDraft({ ...draft, seller_email: event.target.value })} aria-describedby="seller-email-help" /><p id="seller-email-help" className="market-help">Displayed publicly on your listing so buyers can contact you.</p></div>
      </fieldset>
      {error ? <p className="market-error" role="alert">{error}</p> : null}
      <div className="market-form-actions"><Link href="/">Cancel</Link><button className="market-button" type="submit" disabled={saving || !client || Boolean(photo && !photoReady)}>{saving ? "Publishing…" : "Publish listing"}</button></div>
      <p className="market-help">Your listing and contact email will be public. No account is needed.</p>
    </form>
  </main>;
}

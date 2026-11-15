"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createMarketplaceClient } from "@/lib/marketplace-client";
import { CATEGORIES, LISTING_IMAGE_BUCKET, PAGE_SIZE, formatPrice, searchPattern } from "@/lib/marketplace";
import type { Listing } from "@/lib/marketplace.types";

export function MarketplaceBrowse() {
  const [client] = useState(createMarketplaceClient);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(Boolean(client));
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const latestRequest = useRef(0);

  const loadListings = useCallback(async (cursor?: Listing) => {
    if (!client) return;
    const request = ++latestRequest.current;
    setLoading(true);
    setError("");
    try {
      let requestQuery = client.from("listings").select("*")
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
      if (category !== "All") requestQuery = requestQuery.eq("category", category);
      if (search) requestQuery = requestQuery.ilike("title", searchPattern(search));
      if (cursor) requestQuery = requestQuery.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
      const { data, error } = await requestQuery;
      if (error) throw error;
      if (latestRequest.current !== request) return;
      setListings(current => cursor ? [...current, ...data.slice(0, PAGE_SIZE)] : data.slice(0, PAGE_SIZE));
      setHasMore(data.length > PAGE_SIZE);
    } catch {
      if (latestRequest.current === request) setError("Listings couldn't load. Check your connection and try again.");
    } finally {
      if (latestRequest.current === request) setLoading(false);
    }
  }, [client, category, search]);

  useEffect(() => {
    setListings([]);
    setHasMore(false);
    void loadListings();
    return () => { ++latestRequest.current; };
  }, [loadListings]);

  function searchListings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(query.trim());
  }

  return <main id="market-main" className="market-browse">
    <aside className="market-sidebar">
      <h1>Marketplace</h1><p>Something good, closer to home.</p>
      <Link className="market-button" href="/new">Create a listing</Link>
      <h2 id="category-heading">Categories</h2>
      <div className="market-categories" role="group" aria-labelledby="category-heading">
        {["All", ...CATEGORIES].map(item => <button key={item} type="button"
          aria-controls="listing-results" aria-pressed={category === item}
          onClick={() => setCategory(item)}>{item === "All" ? "All listings" : item}</button>)}
      </div>
      <p className="market-sidebar-note">No account needed.<br />Just people, passing good things on.</p>
    </aside>
    <section className="market-results" aria-labelledby="browse-heading">
      <div className="market-intro"><div><h2 id="browse-heading">Find your next good thing.</h2><p>Browse a little. Find something worth keeping.</p></div></div>
      <form className="market-search" onSubmit={searchListings} role="search">
        <label className="sr-only" htmlFor="listing-search">Search listing titles</label>
        <input id="listing-search" type="search" placeholder="Search listing titles…" maxLength={100}
          value={query} onChange={event => setQuery(event.target.value)} />
        <button type="submit" className="market-button">Search</button>
      </form>
      <div className="market-results-heading"><h3>{category === "All" ? "Fresh on the marketplace" : category}</h3><span>Newest first</span></div>
      <div id="listing-results" aria-busy={loading}>
        {!client ? <div className="market-empty"><h3>The marketplace is getting ready.</h3><p>Please check back soon.</p></div> : null}
        {error ? <div className="market-error" role="alert"><p>{error}</p><button type="button" className="text-button" onClick={() => void loadListings(listings.at(-1))}>Try again</button></div> : null}
        {!loading && client && !error && listings.length === 0 ? <div className="market-empty"><h3>{search || category !== "All" ? "Nothing here just yet." : "Good things start with a first listing."}</h3><p>{search ? "Try another title or browse all categories." : "Have something useful to pass on? Give it a new home."}</p><Link href="/new">Create a listing</Link></div> : null}
        <div className="market-grid">
          {listings.map(listing => <Link key={listing.id} className="listing-card" href={`/listings/${listing.id}`}>
            <img src={client!.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(listing.image_path).data.publicUrl}
              alt={listing.title} loading="lazy" decoding="async" />
            <div>{listing.sold_at?<span className="market-sold-label">Sold</span>:null}<p className="listing-price">{formatPrice(listing.price_cents)}</p><h3>{listing.title}</h3><p className="listing-category">{listing.category}</p></div>
          </Link>)}
        </div>
        {loading ? <p className="market-loading" role="status">Finding listings…</p> : null}
        {hasMore ? <button type="button" className="market-secondary market-more" disabled={loading} onClick={() => void loadListings(listings.at(-1))}>Load more listings</button> : null}
      </div>
    </section>
  </main>;
}

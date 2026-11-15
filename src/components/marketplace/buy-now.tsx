"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
export function BuyNow({ listingId }: { listingId: string }) {
  const [status,setStatus] = useState<{ ready: boolean; sold: boolean; minimumMet: boolean } | null>(null);
  const [error,setError] = useState(""); const [busy,setBusy] = useState(false); const [retry,setRetry] = useState(0);
  useEffect(()=>{
    const controller = new AbortController(); setError("");
    void fetch("/api/checkout?listing_id="+listingId,{ signal:controller.signal,cache:"no-store" })
      .then(async response=>{ const data=await response.json(); if(!response.ok) throw new Error(data.error); return data; })
      .then(data=>{ if(!controller.signal.aborted) setStatus(data); })
      .catch(()=>{ if(!controller.signal.aborted) setError("Payment availability couldn't load. Please try again."); });
    return ()=>controller.abort();
  },[listingId,retry]);
  async function buy() {
    if(busy) return; setBusy(true); setError("");
    try {
      const response=await fetch("/api/checkout",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({listingId}) });
      const data=await response.json(); if(!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch(problem) { setError(problem instanceof Error?problem.message:"Checkout couldn't open. Please try again."); setBusy(false); }
  }
  return <div className="market-purchase">
    {status?.sold ? <p className="market-sold" role="status">Sold</p> : status?.ready && status.minimumMet ? <>
      <button type="button" className="market-button" disabled={busy} onClick={()=>void buy()}>{busy?"Opening secure checkout…":"Buy Now"}</button>
      <p className="market-help">Pay securely with Stripe in sandbox mode. No real money moves.</p>
    </> : status ? <p className="market-help">{!status.minimumMet?"For items below $0.50, message the seller directly.":<>This seller hasn’t enabled checkout yet. <Link href="/connect">Seller payments</Link></>}</p> : !error ? <p className="market-help" role="status">Checking seller payments…</p> : null}
    {error?<div className="market-error" role="alert"><p>{error}</p><button type="button" className="text-button" disabled={busy} onClick={()=>setRetry(value=>value+1)}>Check again</button></div>:null}
  </div>;
}

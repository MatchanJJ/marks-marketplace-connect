"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { formatPrice } from "@/lib/marketplace";
type Receipt={id:string;listing_id:string;listing_title:string;amount_cents:number;fee_cents:number;status:"pending"|"paid"|"expired";paid_at:string|null};
export function OrderConfirmation({orderId}:{orderId:string}) {
  const [order,setOrder]=useState<Receipt|null>(null);const [error,setError]=useState("");const [retry,setRetry]=useState(0);const [delayed,setDelayed]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let checks=0;setError("");setDelayed(false);
    async function load(){
      try{
        const response=await fetch("/api/orders/"+orderId,{signal:controller.signal,cache:"no-store"});const data=await response.json();
        if(!response.ok)throw new Error(data.error);if(controller.signal.aborted)return;setOrder(data);
        if(data.status==="pending"){if(++checks<15)timer=setTimeout(()=>void load(),2000);else setDelayed(true);}
      }catch(problem){if(!controller.signal.aborted)setError(problem instanceof Error?problem.message:"Your order couldn't load. Please try again.");}
    }
    void load();return()=>{controller.abort();clearTimeout(timer);};
  },[orderId,retry]);
  return <main id="market-main" className="market-form-page">
    <Link className="market-back" href="/">Back to marketplace</Link>
    <div className="market-page-heading"><h1>{order?.status==="paid"?"It’s yours.":order?.status==="expired"?"Checkout has expired.":"Waiting for payment confirmation."}</h1><p>{order?.status==="paid"?"Your test payment is confirmed. The order is saved and this listing is now Sold.":order?.status==="expired"?"No order was confirmed through this checkout. You can check the listing’s current availability.":"We’ll show your receipt once Stripe’s signed webhook confirms the payment."}</p></div>
    {error?<div className="market-error" role="alert"><p>{error}</p><button className="text-button" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>:null}
    {order?<article className="market-listing-form market-confirmation"><h2>{order.listing_title}</h2><dl className="market-receipt"><div><dt>Order</dt><dd>{order.id}</dd></div><div><dt>Status</dt><dd>{order.status==="paid"?"Paid — sandbox":order.status==="expired"?"Expired":"Awaiting Stripe webhook"}</dd></div><div><dt>Total</dt><dd>{formatPrice(order.amount_cents)}</dd></div>{order.status==="paid"?<><div><dt>Platform fee (10%)</dt><dd>{formatPrice(order.fee_cents)}</dd></div><div><dt>Seller share before Stripe fees</dt><dd>{formatPrice(order.amount_cents-order.fee_cents)}</dd></div></>:null}</dl>
      {delayed?<p className="market-help" role="status">Confirmation is taking longer than usual. Keep your order link and refresh in a moment.</p>:null}
      {order.status==="pending"?<button className="market-secondary" onClick={()=>setRetry(value=>value+1)}>Refresh confirmation</button>:null}
      <Link className="market-button" href={"/listings/"+order.listing_id}>View listing</Link>
      <p className="market-help">Sandbox payment only. No real money was charged.</p>
    </article>:!error?<p className="market-loading" role="status">Checking your order…</p>:null}
  </main>;
}

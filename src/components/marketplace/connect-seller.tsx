"use client";
import Link from "next/link";
import { useEffect,useState,type FormEvent } from "react";
import { validEmail } from "@/lib/marketplace";
type SellerStatus = { exists:boolean;ready:boolean;detailsSubmitted:boolean;chargesEnabled:boolean;payoutsEnabled:boolean };
export function ConnectSeller({ initialEmail,returned }: { initialEmail:string;returned:boolean }) {
  const [email,setEmail]=useState(initialEmail); const [status,setStatus]=useState<SellerStatus|null>(null);
  const [busy,setBusy]=useState(false); const [checking,setChecking]=useState(false); const [error,setError]=useState("");
  useEffect(()=>{
    if(!returned||!validEmail(initialEmail)) return;
    const controller=new AbortController(); setChecking(true);
    void fetch("/api/connect/status?email="+encodeURIComponent(initialEmail),{signal:controller.signal,cache:"no-store"})
      .then(async response=>{const data=await response.json();if(!response.ok) throw new Error(data.error);return data;})
      .then(data=>{if(!controller.signal.aborted)setStatus(data);})
      .catch(()=>{if(!controller.signal.aborted)setError("Your Stripe status couldn't load. Please check again.");})
      .finally(()=>{if(!controller.signal.aborted)setChecking(false);});
    return ()=>controller.abort();
  },[initialEmail,returned]);
  async function connect(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    if(!validEmail(email)){setError("Enter the email used on your listings.");return;}
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      window.location.assign(data.url);
    }catch(problem){setError(problem instanceof Error?problem.message:"Onboarding couldn't open. Please try again.");setBusy(false);}
  }
  async function check() {
    if(!validEmail(email)){setError("Enter the email used on your listings.");return;}
    setChecking(true);setError("");
    try{
      const response=await fetch("/api/connect/status?email="+encodeURIComponent(email),{cache:"no-store"});const data=await response.json();
      if(!response.ok)throw new Error(data.error);setStatus(data);
    }catch(problem){setError(problem instanceof Error?problem.message:"Status couldn't load. Please try again.");}
    finally{setChecking(false);}
  }
  return <main id="market-main" className="market-form-page">
    <Link className="market-back" href="/">Back to marketplace</Link>
    <div className="market-page-heading"><h1>Get ready to get paid.</h1><p>Connect your seller email to Stripe. When onboarding is complete, your listings can accept test payments.</p></div>
    <div className="market-listing-form">
      <form onSubmit={connect}><div className="market-field"><label htmlFor="connect-email">Seller email</label><input id="connect-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={event=>{setEmail(event.target.value);setStatus(null);}} placeholder="you@example.com" disabled={busy}/><p className="market-help">Use the same email displayed on your listings. No marketplace login is needed for this sandbox challenge.</p></div>
        <div className="market-connect-actions"><button className="market-button" type="submit" disabled={busy||checking}>{busy?"Opening Stripe…":status?.exists?"Continue with Stripe":"Connect with Stripe"}</button><button className="market-secondary" type="button" disabled={busy||checking} onClick={()=>void check()}>{checking?"Checking…":"Check status"}</button></div>
      </form>
      {error?<p className="market-error" role="alert">{error}</p>:null}
      {status?<section className="market-connect-status" aria-label="Stripe onboarding status"><h2>{status.ready?"You’re ready to sell.":status.exists?"A little more to finish.":"Connect your seller account."}</h2><p>{status.ready?"Your listings with this email now show Buy Now. Stripe takes care of checkout and the seller payment.":status.exists?"Continue on Stripe to finish any remaining information, then check your status again.":"Start Stripe onboarding to enable payments on your listings."}</p>
        {status.exists?<dl className="market-receipt"><div><dt>Seller details</dt><dd>{status.detailsSubmitted?"Submitted":"Needed"}</dd></div><div><dt>Accept payments</dt><dd>{status.chargesEnabled?"Enabled":"Pending"}</dd></div><div><dt>Seller payouts</dt><dd>{status.payoutsEnabled?"Enabled":"Pending"}</dd></div></dl>:null}
        {status.ready?<Link className="market-button" href="/">Browse your listings</Link>:null}
      </section>:null}
      <p className="market-help market-connect-note">Sandbox only: use Stripe’s test details, never your real identity or bank information. The marketplace keeps a 10% platform fee, rounded down to cents. Stripe processing fees are separate.</p>
    </div>
  </main>;
}

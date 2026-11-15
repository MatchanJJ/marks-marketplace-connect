import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mark's Marketplace Connect", template: "%s | Mark's Marketplace Connect" },
  description: "Find something useful, give something a second life. Browse listings or share something for sale.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div className="market-app">
    <a className="skip-link" href="#market-main">Skip to marketplace</a>
    <header className="market-masthead"><div>
      <Link className="market-brand" href="/">mark&apos;s marketplace<span aria-hidden="true">.</span></Link>
      <nav aria-label="Site"><Link href="/connect">Seller payments</Link><Link href="/new">Sell something</Link><Image src="/mark-portrait.png" alt="Mark" width={36} height={36} /></nav>
    </div></header>
    <p className="market-sandbox">Stripe sandbox. Test payments only — no real money moves.</p>
    {children}
    <footer className="market-footer"><span>Mark&apos;s Marketplace</span><span>A little less new. A little more useful.</span></footer>
  </div></body></html>;
}

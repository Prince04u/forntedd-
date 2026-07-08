import Link from "next/link";
import { BRAND_NAME, brandPageTitle } from "@/lib/brand";

export const metadata = {
  title: brandPageTitle("About us"),
};

export default function AboutPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/account" className="legal-back">‹</Link>
        <h1>About us</h1>
        <span />
      </header>

      <article className="legal-content">
        <p>
          <strong>{BRAND_NAME}</strong> is a gaming platform focused on fast Wingo rounds, secure wallet
          management, and a transparent referral program for players and partners.
        </p>

        <section>
          <h2>What we offer</h2>
          <ul>
            <li>Wingo games — 30s, 1m, 3m, and 5m durations</li>
            <li>UPI deposits with proof upload and admin verification</li>
            <li>UPI and bank withdrawals with status tracking</li>
            <li>Referral rewards and partner commission tools</li>
          </ul>
        </section>

        <section>
          <h2>Responsible play</h2>
          <p>
            Play within your limits. If you need help with your account, deposits, or withdrawals,
            contact our support team during service hours.
          </p>
        </section>

        <section>
          <h2>Legal & support</h2>
          <ul>
            <li><Link href="/privacy" className="legal-link">Privacy policy</Link></li>
            <li><Link href="/support" className="legal-link">Customer service</Link></li>
          </ul>
        </section>

        <div className="legal-actions">
          <Link href="/account" className="legal-btn">Back to account</Link>
          <Link href="/" className="legal-btn secondary">Go to home</Link>
        </div>
      </article>
    </main>
  );
}

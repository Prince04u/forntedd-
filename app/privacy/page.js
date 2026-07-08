import Link from "next/link";
import { BRAND_NAME, SUPPORT_EMAIL, brandPageTitle } from "@/lib/brand";

export const metadata = {
  title: brandPageTitle("Privacy Agreement"),
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/register" className="legal-back">‹</Link>
        <h1>Privacy Agreement</h1>
        <span />
      </header>

      <article className="legal-content">
        <p className="legal-updated">Last updated: June 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            {BRAND_NAME} (&quot;we&quot;, &quot;our&quot;) operates the gaming platform. By registering
            and using our services, you agree to this Privacy Agreement and our data practices
            described below.
          </p>
        </section>

        <section>
          <h2>2. Information we collect</h2>
          <ul>
            <li>Mobile number and account credentials for authentication</li>
            <li>Wallet, deposit, withdrawal, and gameplay transaction records</li>
            <li>Referral or partner codes used at registration</li>
            <li>Payment references (UTR) and proof images you submit for deposits</li>
            <li>Device and usage data required to operate the service securely</li>
          </ul>
        </section>

        <section>
          <h2>3. How we use your information</h2>
          <ul>
            <li>To create and manage your account</li>
            <li>To process deposits, withdrawals, and bets</li>
            <li>To prevent fraud, abuse, and duplicate accounts</li>
            <li>To provide customer support and comply with applicable law</li>
          </ul>
        </section>

        <section>
          <h2>4. Sharing</h2>
          <p>
            We do not sell your personal data. We may share information with payment processors,
            fraud-prevention partners, or authorities when required by law or to protect the platform.
          </p>
        </section>

        <section>
          <h2>5. Security</h2>
          <p>
            We use industry-standard measures to protect your account. You are responsible for
            keeping your password confidential and logging out on shared devices.
          </p>
        </section>

        <section>
          <h2>6. Responsible play</h2>
          <p>
            Gaming involves financial risk. Play responsibly. You must be of legal age in your
            jurisdiction to use this platform.
          </p>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            Questions about this agreement:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="legal-link">
              {SUPPORT_EMAIL}
            </a>{" "}
            or visit our <Link href="/support">Customer Service</Link> page.
          </p>
        </section>

        <div className="legal-actions">
          <Link href="/register" className="legal-btn">Back to register</Link>
        </div>
      </article>
    </main>
  );
}

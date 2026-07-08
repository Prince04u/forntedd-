import Link from "next/link";
import { SUPPORT_EMAIL, brandPageTitle } from "@/lib/brand";

export const metadata = {
  title: brandPageTitle("Customer Service"),
};

export default function SupportPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/login" className="legal-back">‹</Link>
        <h1>Customer Service</h1>
        <span />
      </header>

      <article className="legal-content">
        <p>
          Need help with login, deposits, withdrawals, or your account? Contact our support
          team with your registered mobile number and UID (from Account page).
        </p>

        <section>
          <h2>Support hours</h2>
          <p>10:00 AM – 10:00 PM (IST), seven days a week.</p>
        </section>

        <section>
          <h2>Email</h2>
          <p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="legal-link">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>

        <section>
          <h2>Common issues</h2>
          <ul>
            <li><strong>Deposit pending</strong> — allow up to 30 minutes after UTR submission; check Deposit history.</li>
            <li><strong>Withdrawal delay</strong> — approved requests are processed in order; see Withdrawal history.</li>
            <li><strong>Forgot password</strong> — contact customer support; admin can reset your account.</li>
          </ul>
        </section>

        <div className="legal-actions">
          <Link href="/login" className="legal-btn">Back to login</Link>
          <Link href="/account" className="legal-btn secondary">Go to account</Link>
        </div>
      </article>
    </main>
  );
}

"use client";

import Link from "next/link";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { BRAND_NAME } from "@/lib/brand";

const STEPS = [
  {
    title: "Create your account",
    body: "Register with your mobile number and set a password. Keep your UID from the Account page for support.",
    links: [{ href: "/register", label: "Register" }],
  },
  {
    title: "Add funds",
    body: "Open Wallet → Deposit, choose a channel, pay via UPI, then enter UTR and upload payment proof.",
    links: [
      { href: "/wallet/deposit", label: "Deposit" },
      { href: "/wallet/deposit/history", label: "Deposit history" },
    ],
  },
  {
    title: "Play Wingo",
    body: "Pick 30s, 1m, 3m, or 5m rounds from Home. Place bets before the countdown ends and watch results live.",
    links: [{ href: "/wingo/30s", label: "Play Wingo 30s" }],
  },
  {
    title: "Withdraw winnings",
    body: "From Wallet, request a withdrawal with UPI or bank details. Track status in Withdrawal history.",
    links: [
      { href: "/wallet", label: "Wallet" },
      { href: "/wallet/withdraw/history", label: "Withdraw history" },
    ],
  },
  {
    title: "Invite friends",
    body: "Share your referral link from the Invite page and earn rewards when friends join and play.",
    links: [{ href: "/referral", label: "Invite friends" }],
  },
];

export default function GuidePage() {
  return (
    <main className="account-page account-sub-page">
      <AccountSubHeader title="Beginner's guide" />

      <section className="account-guide-intro">
        <p>New to {BRAND_NAME}? Follow these steps to get started quickly and safely.</p>
      </section>

      <ol className="account-guide-list">
        {STEPS.map((step, index) => (
          <li key={step.title} className="account-guide-item">
            <span className="account-guide-step">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
              <div className="account-guide-links">
                {step.links.map((link) => (
                  <Link key={link.href} href={link.href} className="account-inline-link">
                    {link.label} →
                  </Link>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

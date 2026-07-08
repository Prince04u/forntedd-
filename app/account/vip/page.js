"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getVipProgram } from "@/lib/platformApi";

export default function VipPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getVipProgram()
      .then((res) => {
        if (!cancelled) setConfig(res?.data || { enabled: false });
      })
      .catch(() => {
        if (!cancelled) setConfig({ enabled: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="account-page account-sub-page">
        <AccountSubHeader title="VIP club" />
        <div className="account-loading">Loading VIP program...</div>
      </main>
    );
  }

  if (!config?.enabled) {
    return (
      <main className="account-page account-sub-page">
        <AccountSubHeader title="VIP club" />
        <section className="account-vip-hero">
          <p>VIP program is currently unavailable.</p>
          <Link href="/account" className="account-inline-link">
            Back to account
          </Link>
        </section>
      </main>
    );
  }

  const tiers = Array.isArray(config.tiers) ? config.tiers : [];
  const activeLevel = config.defaultLevel || tiers[0]?.level || "VIP0";

  return (
    <main className="account-page account-sub-page">
      <AccountSubHeader title={config.pageTitle || "VIP club"} />

      <section className="account-vip-hero">
        <div className="account-vip-current">
          <span>Your level</span>
          <strong>{activeLevel}</strong>
        </div>
        {config.heroSubtitle ? <p>{config.heroSubtitle}</p> : null}
      </section>

      <div className="account-vip-list">
        {tiers.map((tier) => (
          <article
            key={tier.id || tier.level}
            className={`account-vip-card ${tier.level === activeLevel ? "active" : ""}`}
          >
            <header>
              <strong>{tier.level}</strong>
              <span>Min. deposits ₹{Number(tier.minDeposit || 0).toLocaleString("en-IN")}</span>
            </header>
            <ul>
              {(tier.benefits || []).map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {config.ctaLabel && config.ctaHref ? (
        <div className="account-form-footer-note">
          <Link href={config.ctaHref} className="account-form-submit account-vip-cta">
            {config.ctaLabel}
          </Link>
        </div>
      ) : null}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPromoCard } from "@/lib/designAssets";
import { getPromoBanners } from "@/lib/platformApi";

const HOME_PROMO_ORDER = ["referral", "deposit"];

const HOME_PROMO_TITLES = {
  referral: "REFER & EARN",
  deposit: "DEPOSIT & WIN",
};

const DEFAULT_CARDS = [
  {
    id: "referral",
    icon: "🤝",
    title: "Invite & earn",
    detail: "Share your code and earn referral rewards",
    href: "/referral",
    cta: "Invite friends",
    theme: "blue",
  },
  {
    id: "deposit",
    icon: "💰",
    title: "First deposit bonus",
    detail: "Up to ₹488 on your first top-up",
    href: "/wallet/deposit",
    cta: "Deposit now",
    theme: "gold",
  },
  {
    id: "wingo",
    icon: "🎱",
    title: "WinGo live",
    detail: "30s, 1m, 3m, 5m — bet on color, size, or number",
    href: "/wingo/30s",
    cta: "Play now",
    theme: "pink",
  },
];

export default function PromoSection() {
  const [cards, setCards] = useState(DEFAULT_CARDS);

  useEffect(() => {
    let cancelled = false;
    getPromoBanners()
      .then((res) => {
        if (cancelled) return;
        const nextCards = res?.data?.cards;
        if (Array.isArray(nextCards) && nextCards.length) {
          setCards(nextCards);
        }
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#promo") return;
    const el = document.getElementById("promo");
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const displayCards = useMemo(() => {
    const picked = HOME_PROMO_ORDER.map((id) => cards.find((card) => card.id === id)).filter(Boolean);
    return picked.length >= 2 ? picked : cards.slice(0, 2);
  }, [cards]);

  return (
    <section id="promo" className="club-promo-section" aria-label="Promotions">
      <div className="club-promo-heading">
        <h2>Promotions</h2>
      </div>
      <div className="club-promo-grid">
        {displayCards.map((promo) => {
          const image = getPromoCard(promo.id)?.image;
          const title = HOME_PROMO_TITLES[promo.id] || promo.title.toUpperCase();

          return (
            <Link
              key={promo.id}
              href={promo.href}
              className={`club-promo-card ${promo.theme}${image ? " club-promo-card-has-image" : ""}`}
              style={image ? { backgroundImage: `url(${image})` } : undefined}
            >
              <strong>{title}</strong>
              {!image && (
                <div className="club-promo-body">
                  <span className="club-promo-icon">{promo.icon}</span>
                  <p>{promo.detail}</p>
                </div>
              )}
              <span className="club-promo-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

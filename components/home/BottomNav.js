"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAgentStatus } from "@/lib/agentApi";
import { getToken, getUser, isPartnerUser } from "@/lib/auth";
import { getNavIcon } from "@/lib/designAssets";
import NavIcon from "./NavIcon";

const SIDE_NAV = [
  { href: "/", label: "Home", iconId: "home", match: "exact" },
  { href: "/referral", label: "Invite", iconId: "invite", match: "referral" },
  { href: "/wallet", label: "Wallet", iconId: "wallet", match: "wallet" },
  { href: "/account", label: "Account", iconId: "account", match: "account" },
];

const isActive = (pathname, match, href) => {
  if (match === "exact") return pathname === "/";
  if (match === "referral") return pathname.startsWith("/referral");
  if (match === "wallet") return pathname.startsWith("/wallet");
  if (match === "account") {
    return pathname.startsWith("/account") && !pathname.startsWith("/agent");
  }
  return pathname.startsWith(href);
};

export default function BottomNav() {
  const pathname = usePathname();
  const [isPartner, setIsPartner] = useState(false);
  const [promoActive, setPromoActive] = useState(false);
  const promoIcon = getNavIcon("promo-btn");
  const partnerIcon = getNavIcon("partner-btn");

  useEffect(() => {
    const syncPromoHash = () => {
      setPromoActive(window.location.pathname === "/" && window.location.hash === "#promo");
    };
    syncPromoHash();
    window.addEventListener("hashchange", syncPromoHash);
    return () => window.removeEventListener("hashchange", syncPromoHash);
  }, [pathname]);

  useEffect(() => {
    if (!getToken()) {
      setIsPartner(false);
      return;
    }

    if (isPartnerUser(getUser())) {
      setIsPartner(true);
      return;
    }

    let cancelled = false;
    getAgentStatus()
      .then((res) => {
        if (!cancelled) setIsPartner(Boolean(res.data?.isAgent));
      })
      .catch(() => {
        if (!cancelled) setIsPartner(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const centerActive = isPartner ? pathname.startsWith("/agent") : promoActive;

  return (
    <nav className="club-bottom-nav">
      {SIDE_NAV.slice(0, 2).map((item) => {
        const active = isActive(pathname, item.match, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`club-nav-item ${active ? "active" : ""}`}
          >
            <span className="club-nav-icon">
              <NavIcon id={item.iconId} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      {isPartner ? (
        <div className={`club-nav-item promo ${centerActive ? "active" : ""}`}>
          <Link href="/agent" className="club-nav-promo-btn club-nav-partner-btn" aria-label="Partner portal">
            {partnerIcon?.image ? (
              <Image
                src={partnerIcon.image}
                alt=""
                width={52}
                height={52}
                className="club-nav-promo-img"
                aria-hidden
              />
            ) : null}
          </Link>
          <span>Partner</span>
        </div>
      ) : (
        <div className={`club-nav-item promo ${centerActive ? "active" : ""}`}>
          <Link href="/#promo" className="club-nav-promo-btn" aria-label="Promotions">
            {promoIcon?.image ? (
              <Image
                src={promoIcon.image}
                alt=""
                width={52}
                height={52}
                className="club-nav-promo-img"
                aria-hidden
              />
            ) : null}
          </Link>
          <span>PROMO</span>
        </div>
      )}

      {SIDE_NAV.slice(2).map((item) => {
        const active = isActive(pathname, item.match, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`club-nav-item ${active ? "active" : ""}`}
          >
            <span className="club-nav-icon">
              <NavIcon id={item.iconId} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

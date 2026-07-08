"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND_NAME } from "@/lib/brand";

export default function AnnouncementsModal({
  open,
  onClose,
  items = [],
  marquee = null,
  maintenanceMode = false,
  maintenanceMessage = "",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const hasItems = items.length > 0;
  const showMarquee = marquee?.text && !maintenanceMode;

  return createPortal(
    <div className="club-announce-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="club-announce-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="club-announce-modal-title"
      >
        <div className="club-announce-modal-header">
          <div className="club-announce-modal-header-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(212, 175, 55, 0.12)", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "24px", height: "24px", color: "var(--theme-gold-bright)" }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <p className="club-announce-modal-kicker">{BRAND_NAME}</p>
            <h2 id="club-announce-modal-title">Announcements</h2>
          </div>
          <button
            type="button"
            className="club-announce-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="club-announce-modal-body">
          {maintenanceMode && (
            <article className="club-announce-modal-item maintenance">
              <span className="club-announce-modal-tag">Maintenance</span>
              <strong>Platform notice</strong>
              <p>
                {maintenanceMessage ||
                  "Platform is under maintenance. Betting, deposits, and withdrawals may be unavailable."}
              </p>
            </article>
          )}

          {showMarquee && (
            <article className="club-announce-modal-item featured">
              <span className="club-announce-modal-tag">Latest</span>
              <p className="club-announce-modal-marquee-text">{marquee.text}</p>
              {marquee.link ? (
                <Link href={marquee.link} className="club-announce-modal-link" onClick={onClose}>
                  {marquee.linkLabel || "Learn more"} →
                </Link>
              ) : null}
            </article>
          )}

          {hasItems ? (
            items.map((item) => (
              <article key={item.id} className="club-announce-modal-item">
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                {item.link ? (
                  <Link href={item.link} className="club-announce-modal-link" onClick={onClose}>
                    Learn more →
                  </Link>
                ) : null}
              </article>
            ))
          ) : !maintenanceMode && !showMarquee ? (
            <article className="club-announce-modal-item">
              <strong>Welcome to {BRAND_NAME}</strong>
              <p>
                Wingo 30s, 1m, 3m, and 5m games are live. Deposit to play and invite friends from
                the Referral page to earn rewards.
              </p>
              <Link href="/referral" className="club-announce-modal-link" onClick={onClose}>
                Invite friends →
              </Link>
            </article>
          ) : null}
        </div>

        <div className="club-announce-modal-footer">
          <button type="button" className="club-announce-modal-ok" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

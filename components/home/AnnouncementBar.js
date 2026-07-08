"use client";

import { useEffect, useState } from "react";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getAnnouncements } from "@/lib/platformApi";
import { BRAND_NAME } from "@/lib/brand";
import AnnouncementsModal from "./AnnouncementsModal";

const DEFAULT_MARQUEE = {
  text: `Welcome to ${BRAND_NAME} • Play Wingo • Deposit & Win`,
  link: "/wallet",
  linkLabel: "Detail",
};

export default function AnnouncementBar() {
  const { maintenanceMode, message } = usePlatformStatus();
  const [marquee, setMarquee] = useState(DEFAULT_MARQUEE);
  const [marqueeEnabled, setMarqueeEnabled] = useState(true);
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAnnouncements()
      .then((res) => {
        if (cancelled) return;
        const nextMarquee = res?.data?.marquee;
        const nextItems = Array.isArray(res?.data?.items) ? res.data.items : [];

        if (nextMarquee === null) {
          setMarqueeEnabled(false);
        } else if (nextMarquee?.text) {
          setMarqueeEnabled(true);
          setMarquee({
            text: nextMarquee.text,
            link: nextMarquee.link || "/wallet",
            linkLabel: nextMarquee.linkLabel || "Detail",
          });
        }

        setItems(nextItems);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!maintenanceMode && !marqueeEnabled && items.length === 0) {
    return null;
  }

  const displayText = maintenanceMode
    ? message || "Platform is under maintenance. Betting, deposits, and withdrawals may be unavailable."
    : marquee.text;

  const detailLabel = maintenanceMode ? "View" : marquee.linkLabel || "Detail";

  return (
    <>
      <div
        className={`club-announce ${maintenanceMode ? "maintenance" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => setModalOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setModalOpen(true);
          }
        }}
      >
        <div className="club-announce-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {maintenanceMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "var(--theme-warning)" }}>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", color: "var(--theme-gold-bright)" }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </div>
        <div className="club-marquee">
          <span>{displayText}</span>
        </div>
        <button
          type="button"
          className="club-announce-detail"
          onClick={(event) => {
            event.stopPropagation();
            setModalOpen(true);
          }}
        >
          {detailLabel}
        </button>
      </div>

      <AnnouncementsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        items={items}
        marquee={marqueeEnabled ? marquee : null}
        maintenanceMode={maintenanceMode}
        maintenanceMessage={message}
      />
    </>
  );
}

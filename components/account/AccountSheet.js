"use client";

import Link from "next/link";
import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export default function AccountSheet({ sheet, onClose, maintenanceMessage, announcementItems = [] }) {
  if (!sheet) return null;

  const titleMap = {
    "coming-soon": "Coming soon",
    announcement: "Announcements",
    support: "Customer service",
  };

  return (
    <div className="account-sheet-overlay" onClick={onClose}>
      <div className="account-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="account-sheet-header">
          <h3>{titleMap[sheet.type] || "Info"}</h3>
          <button type="button" className="account-sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {sheet.type === "coming-soon" && (
          <p className="account-sheet-text">
            {sheet.text || "This feature is coming soon. Check back later."}
          </p>
        )}

        {sheet.type === "announcement" && (
          <div className="account-sheet-announcements">
            {maintenanceMessage ? (
              <article className="account-sheet-announce-item maintenance">
                <strong>Maintenance notice</strong>
                <p>{maintenanceMessage}</p>
              </article>
            ) : null}
            {announcementItems.length ? (
              announcementItems.map((item) => (
                <article key={item.id} className="account-sheet-announce-item">
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  {item.link ? (
                    <Link href={item.link} className="account-sheet-link">
                      Learn more
                    </Link>
                  ) : null}
                </article>
              ))
            ) : (
              <article className="account-sheet-announce-item">
                <strong>Welcome to {BRAND_NAME}</strong>
                <p>
                  Wingo 30s, 1m, 3m, and 5m games are live. Deposit to play and invite friends
                  from the Referral page to earn rewards.
                </p>
              </article>
            )}
          </div>
        )}

        {sheet.type === "support" && (
          <div className="account-sheet-support">
            <p className="account-sheet-text">
              Need help with deposits, withdrawals, or your account? Visit the support page or
              email us with your registered mobile and UID.
            </p>
            <p className="account-sheet-meta">Hours: 10:00 AM – 10:00 PM (IST)</p>
            <a href="/support" className="account-sheet-link">
              Open customer service
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="account-sheet-link">
              {SUPPORT_EMAIL}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

export default function ComingSoonModal({ game, onClose }) {
  if (!game) return null;

  return (
    <div className="club-modal-overlay" onClick={onClose}>
      <div className="club-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="club-modal-header">
          <span className="club-modal-art">{game.art}</span>
          <div>
            <p className="club-modal-eyebrow">Coming soon</p>
            <h3>{game.label}</h3>
          </div>
          <button type="button" className="club-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <p className="club-modal-text">
          {game.comingSoonNote ||
            `${game.label} is not available yet. We're working on bringing it to ${BRAND_NAME}.`}
        </p>

        <p className="club-modal-hint">Play Wingo or top up your wallet while you wait.</p>

        <div className="club-modal-actions">
          <Link href="/wingo/30s" className="club-modal-btn primary" onClick={onClose}>
            Play Wingo
          </Link>
          <Link href="/wallet/deposit" className="club-modal-btn secondary" onClick={onClose}>
            Deposit
          </Link>
        </div>
      </div>
    </div>
  );
}

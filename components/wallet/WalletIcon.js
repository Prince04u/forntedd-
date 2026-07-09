"use client";

const ICONS = {
  hero: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden stroke="var(--theme-gold, #D4AF37)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H4v12h16v-4" />
      <rect x="16" y="12" width="6" height="4" rx="1" />
      <circle cx="19" cy="14" r="1" fill="var(--theme-gold, #D4AF37)" />
    </svg>
  ),
  deposit: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 8.5v7M8.8 12h6.4" />
    </svg>
  ),
  withdraw: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M8.8 12h6.4" />
    </svg>
  ),
  "deposit-history": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="12" rx="2.2" />
      <path d="M4 10h16" />
      <path d="M12 13.5v4M9.5 15.5 12 18.2 14.5 15.5" />
    </svg>
  ),
  "withdraw-history": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="12" rx="2.2" />
      <path d="M4 10h16" />
      <path d="M12 14.7V10.5M9.5 12.7 12 10 14.5 12.7" />
    </svg>
  ),
  transactions: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3 21 7 17 11M3 7h18M7 21 3 17 7 13M21 17H3" />
    </svg>
  ),
  "total-deposit": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  ),
};

export default function WalletIcon({ id, size = 40, className = "" }) {
  const icon = ICONS[id];
  if (!icon) return null;

  return (
    <span
      className={`wallet-icon-svg wallet-icon-${id} ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      {icon}
    </span>
  );
}

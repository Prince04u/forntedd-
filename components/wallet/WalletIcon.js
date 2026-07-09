"use client";

const ICONS = {
  hero: (
    <svg viewBox="0 0 72 72" fill="none" aria-hidden>
      <defs>
        <linearGradient id="wallet-body" x1="18" y1="18" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="wallet-coin" x1="42" y1="16" x2="58" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="24" rx="10" ry="8" fill="url(#wallet-coin)" />
      <ellipse cx="44" cy="20" rx="7" ry="5.5" fill="#fbbf24" opacity="0.85" />
      <path
        d="M16 28c0-3.3 2.7-6 6-6h24c3.3 0 6 2.7 6 6v22c0 3.3-2.7 6-6 6H22c-3.3 0-6-2.7-6-6V28Z"
        fill="url(#wallet-body)"
      />
      <path
        d="M22 22h20v4H22c-2.2 0-4 1.8-4 4v2c0-2.2 1.8-4 4-4h28c2.2 0 4 1.8 4 4v14c0 2.2-1.8 4-4 4H22c-2.2 0-4-1.8-4-4V26c0-2.2 1.8-4 4-4Z"
        fill="#6d28d9"
      />
      <circle cx="46" cy="38" r="4" fill="#c4b5fd" />
      <text x="46" y="40.5" textAnchor="middle" fill="#4c1d95" fontSize="6" fontWeight="700">
        ₹
      </text>
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
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M11 10h10M11 16h6M11 22h8"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 8l3 3-3 3M12 24l-3-3 3-3"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "total-deposit": (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <ellipse cx="16" cy="22" rx="9" ry="3" fill="#92400e" opacity="0.45" />
      <ellipse cx="16" cy="19" rx="7" ry="2.5" fill="#fbbf24" />
      <ellipse cx="16" cy="16" rx="5.5" ry="2" fill="#fde68a" />
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

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
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 8c-7 6-12 11.5-12 18.5C12 33.4 17.6 39 24 39s12-5.6 12-12.5C36 19.5 31 14 24 8Z"
        fill="#fbbf24"
      />
      <path
        d="M24 12c-5.5 4.5-9 8.8-9 14.5 0 5.2 4 9.5 9 9.5s9-4.3 9-9.5C33 20.8 29.5 16.5 24 12Z"
        fill="#f59e0b"
        opacity="0.35"
      />
      <text x="24" y="27" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="700">
        ₹
      </text>
    </svg>
  ),
  withdraw: (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="8" y="14" width="32" height="22" rx="4" fill="#3b82f6" />
      <rect x="8" y="20" width="32" height="6" fill="#1d4ed8" />
      <rect x="12" y="30" width="10" height="2" rx="1" fill="#bfdbfe" />
      <circle cx="34" cy="31" r="4" fill="#fde68a" />
      <circle cx="34" cy="31" r="2.2" fill="#f59e0b" />
    </svg>
  ),
  "deposit-history": (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="12" y="8" width="24" height="32" rx="3" fill="#ef4444" />
      <rect x="16" y="6" width="16" height="6" rx="2" fill="#fca5a5" />
      <path d="M18 20h12M18 26h12M18 32h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  "withdraw-history": (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="16" fill="#22c55e" />
      <path
        d="M16 24.5 21.5 30 32 18.5"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

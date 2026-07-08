"use client";

const ICONS = {
  "stat-friends": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 19v-.7c0-2.2 2-3.8 5-3.8h.1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="16.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M13.5 19v-.5c0-1.7 1.5-2.9 3.5-2.9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  "stat-wallet": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V18a2 2 0 0 1-2 2H7.5A2.5 2.5 0 0 1 5 17.5V8.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M5 11h14" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="15.5" cy="14.5" r="1.25" fill="currentColor" />
    </svg>
  ),
  "stat-pending": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 7V6a4 4 0 0 1 8 0v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 12v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  "user-circle": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 17c.9-1.8 2.4-2.7 4.5-2.7s3.6.9 4.5 2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 8l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5 9.2 6.8 14.5 8 9.2 9.2 8 14.5 6.8 9.2 1.5 8 6.8 6.8 8 1.5Z" fill="currentColor" />
    </svg>
  ),
};

export default function ReferralIcon({ id, size = 20, className = "" }) {
  const icon = ICONS[id];
  if (!icon) return null;

  return (
    <span
      className={`referral-icon ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {icon}
    </span>
  );
}

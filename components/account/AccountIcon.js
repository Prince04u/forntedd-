"use client";

const SVG_ICONS = {
  "game-history": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 9.5h2.2v5H7.5v-5Zm3.6 0H13v5h-1.9v-5Zm3.7 0h2.2v5h-2.2v-5Z"
        fill="currentColor"
      />
      <path
        d="M6 8.2c0-1.2 1-2.2 2.2-2.2h7.6c1.2 0 2.2 1 2.2 2.2v7.6c0 1.2-1 2.2-2.2 2.2H8.2c-1.2 0-2.2-1-2.2-2.2V8.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M9.8 6.3V5.2M14.2 6.3V5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  transaction: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 17V7M9 17V11M13 17V9M17 17V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6 8.5 10 6.5 13.5 10.5 18 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 5.5h2V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  "deposit-history": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 13.5v4M9.5 15.5 12 18.2 14.5 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "withdraw-history": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 14.7V10.5M9.5 12.7 12 10 14.5 12.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A2 2 0 0 1 6 6.5h11a2 2 0 0 1 2 2v1.5H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h13v-9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect x="4" y="10" width="16" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16.5" cy="15" r="1.1" fill="currentColor" />
    </svg>
  ),
  deposit: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.5v7M8.8 12h6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  withdraw: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.8 12h6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  vip: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 17.5 8.2 9.5l3.8 3.2 4-5.2 4 5.2 3.8-3.2L18 17.5H6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
  "edit-profile": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 19.5v-.7c0-2.8 2.6-4.8 6.5-4.8s6.5 2 6.5 4.8v.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5 6.5 7v5.2c0 3.4 2.3 6.6 5.5 7.8 3.2-1.2 5.5-4.4 5.5-7.8V7L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.8 12.2 11.4 13.8 14.8 10.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  kyc: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="4.5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="10" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 16.5c.8-1.8 2.2-2.7 4-2.7s3.2.9 4 2.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 18.5a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.5 9.8c0-3 2.5-5.8 5.5-5.8s5.5 2.8 5.5 5.8v4.2l1.5 2.3H5l1.5-2.3V9.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  "invite-friends": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.5 18.5v-.8c0-2.2 2-3.9 4.5-3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16.5 8.8v6.7M13.2 12.2h6.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  gifts: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10v9M5 10h14" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 6.5c-1.6 0-2.5-.8-2.5-2s1.2-2 2.5-1.1c1.3-.9 2.5-.1 2.5 1.1s-.9 2-2.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  "game-stats": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 17V11M10 17V8M14 17V13M18 17V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  partner: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18.5V8.5l7-4 7 4v10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 18.5v-5h5v5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
  announcement: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 10.5h2.5l4.5-3.5v11l-4.5-3.5H5v-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14.5 9.5a3 3 0 0 1 0 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  "customer-service": (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 10.5V8.8a5.5 5.5 0 0 1 11 0v1.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect x="4.5" y="10.5" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="15" y="10.5" width="4.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  feedback: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 7.5h12v8H10l-2.5 2.5V15.5H6v-8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 11h6M9 13.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  guide: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 5.5h11v13H7V5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10.2v5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5H17a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5.5 12h8M12.5 9l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function AccountIcon({ id, size = 24, className = "" }) {
  const icon = SVG_ICONS[id];
  if (!icon) return null;

  return (
    <span
      className={`account-icon-svg account-icon-${id} ${className}`.trim()}
      style={{ width: size, height: size, color: "currentColor" }}
      aria-hidden
    >
      {icon}
    </span>
  );
}

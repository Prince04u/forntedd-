"use client";

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 10.2 12 4.5l7.5 5.7V19a1.5 1.5 0 0 1-1.5 1.5H15v-6.2H9V20.5H6A1.5 1.5 0 0 1 4.5 19v-8.8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  ),
  invite: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8.5" r="3.1" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4 19.5v-.8c0-2.4 2-4.2 5-4.2h.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M13.5 19.5v-.6c0-1.8 1.6-3.1 3.8-3.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
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
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="16.5" cy="15" r="1.1" fill="currentColor" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.2" r="3.6" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.8v-.6c0-3.2 2.8-5.6 6.5-5.6s6.5 2.4 6.5 5.6v.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export default function NavIcon({ id, className = "" }) {
  const icon = ICONS[id];
  if (!icon) return null;

  return <span className={`club-nav-icon-svg ${className}`.trim()}>{icon}</span>;
}

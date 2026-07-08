"use client";

import { getDepositIcon } from "@/lib/designAssets";

const SVG_ICONS = {
  "wallet-pill": (
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
  document: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 5.5h8v13H8V5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 9.5h4M10 12h4M10 14.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5.5 9.5h3l1.5-2h4l1.5 2h3v9h-13v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6.5" y="11" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 11V8.8a3 3 0 0 1 6 0V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  "upi-badge": (
    <svg viewBox="0 0 48 16" fill="none" aria-hidden>
      <rect x="1" y="1" width="46" height="14" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <text x="24" y="11" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="700">
        UPI
      </text>
    </svg>
  ),
};

export default function DepositIcon({ id, size = 40, className = "" }) {
  const svgIcon = SVG_ICONS[id];
  if (svgIcon) {
    return (
      <span
        className={`deposit-icon deposit-icon-${id} ${className}`.trim()}
        style={{ width: size, height: size, color: "#38bdf8" }}
        aria-hidden
      >
        {svgIcon}
      </span>
    );
  }

  const icon = getDepositIcon(id);
  if (!icon?.image) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon.image}
      alt={icon.label || ""}
      width={size}
      height={size}
      className={`deposit-icon deposit-icon-${id} ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}

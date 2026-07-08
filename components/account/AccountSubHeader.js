"use client";

import Link from "next/link";

export default function AccountSubHeader({ title, backHref = "/account" }) {
  return (
    <header className="account-sub-header">
      <Link href={backHref} className="account-sub-back" aria-label="Back">
        ‹
      </Link>
      <h1>{title}</h1>
      <span className="account-sub-spacer" />
    </header>
  );
}

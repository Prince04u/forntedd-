"use client";

import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AuthTopBar() {
  return (
    <div className="auth-topbar">
      <Link href="/" className="auth-back" aria-label="Go back">
        ‹
      </Link>
      <div className="auth-topbar-logo">
        <BrandLogo href="/" size="sm" />
      </div>
      <span className="auth-topbar-spacer" aria-hidden="true" />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

import BrandLogo from "@/components/brand/BrandLogo";

export default function AppHeader() {
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthenticated(isAuthenticated());
  }, []);

  return (
    <header className="club-header">
      <BrandLogo href="/" size="md" priority />

      <div className="club-header-actions">
        {mounted && authenticated ? (
          <Link href="/wallet" className="club-btn-wallet">
            <span className="club-btn-wallet-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "16px", height: "16px", display: "inline-block", verticalAlign: "middle" }}>
                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h14v4" />
                <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
                <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6z" />
              </svg>
            </span>
            Wallet
          </Link>
        ) : (
          <>
            <Link href="/login" className="club-btn-outline">
              Login
            </Link>
            <Link href="/register" className="club-btn-gradient">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

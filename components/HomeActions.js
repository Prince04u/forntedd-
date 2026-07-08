"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";

const GAMES = [
  { label: "30 Seconds", href: "/wingo/30s" },
  { label: "1 Minute", href: "/wingo/1m" },
  { label: "3 Minutes", href: "/wingo/3m" },
  { label: "5 Minutes", href: "/wingo/5m" },
];

export default function HomeActions() {
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthenticated(isAuthenticated());
  }, []);

  return (
    <>
      <div className="home-actions">
        {!mounted ? (
          <>
            <span className="nav-placeholder">Login</span>
            <span className="nav-placeholder secondary">Register</span>
          </>
        ) : authenticated ? (
          <Link href="/wallet">Wallet</Link>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/otp">OTP Login</Link>
            <Link href="/register" className="secondary">
              Register
            </Link>
          </>
        )}
      </div>

      <div className="game-grid">
        {GAMES.map((game) => (
          <Link key={game.href} href={game.href} className="game-card">
            <span>Wingo</span>
            <strong>{game.label}</strong>
          </Link>
        ))}
      </div>
    </>
  );
}

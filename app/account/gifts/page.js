"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { redeemGiftCode, getRedemptionHistory } from "@/lib/giftsApi";

const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

const formatClaimDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function GiftsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getRedemptionHistory();
      if (res?.success && Array.isArray(res.data)) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error("Failed to load gift history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadHistory();
  }, [loadHistory, router]);

  const handleClaim = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setClaiming(true);
    setError("");
    setSuccess("");
    try {
      const res = await redeemGiftCode(code);
      if (res?.success) {
        setSuccess(res.message || `Successfully redeemed ₹${res.data?.rewardAmount}!`);
        setCode("");
        await loadHistory();
      } else {
        setError(res?.message || "Failed to redeem code");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to redeem gift code");
    } finally {
      setClaiming(false);
    }
  };

  if (!mounted) {
    return (
      <main className="account-page">
        <div className="account-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="account-page account-sub-page">
      {/* Header with back button */}
      <header className="gift-subheader">
        <button type="button" className="gift-back-btn" onClick={() => router.back()} aria-label="Go back">
          ‹
        </button>
        <h1>Gift</h1>
      </header>

      {/* Styled top banner */}
      <div className="gift-banner-wrap">
        <img 
          src="/images/gift-banner.jpg" 
          alt="Gift Box Bonus Banner" 
          className="gift-banner-img"
        />
      </div>

      {/* Main card */}
      <section className="gift-card-content">
        <div className="gift-card-hi">Hi</div>
        <div className="gift-card-sub">We have a gift for you</div>
        
        <form onSubmit={handleClaim} className="gift-card-form">
          <label htmlFor="giftCodeInput" className="gift-input-label">
            Please enter the gift code below
          </label>
          <input
            id="giftCodeInput"
            type="text"
            className="gift-input-box"
            placeholder="Please enter gift code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={claiming}
            required
            autoComplete="off"
          />

          {error && <div className="gift-msg error">{error}</div>}
          {success && <div className="gift-msg success">{success}</div>}

          <button
            type="submit"
            className="gift-submit-btn"
            disabled={claiming || !code.trim()}
          >
            {claiming ? "Processing..." : "Receive"}
          </button>
        </form>
      </section>

      {/* History card */}
      <section className="gift-history-card">
        <div className="gift-history-head">
          {/* Document gold icon */}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--theme-gold, #D4AF37)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <h2>History</h2>
        </div>

        {loadingHistory ? (
          <div className="gift-history-loading">Loading redemption history...</div>
        ) : history.length === 0 ? (
          <div className="gift-history-empty">
            <svg viewBox="0 0 200 140" width="120" height="84" fill="none" style={{ opacity: 0.35, color: "#64748b" }}>
              <rect x="60" y="20" width="80" height="100" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
              <path d="M75 45 h50 M75 65 h50 M75 85 h30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="140" cy="95" r="16" fill="rgba(212, 175, 55, 0.08)" stroke="var(--theme-gold, #D4AF37)" strokeWidth="2"/>
              <path d="M135 95 h10 M140 90 v10" stroke="var(--theme-gold, #D4AF37)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>No data</p>
          </div>
        ) : (
          <ul className="gift-history-list">
            {history.map((item) => (
              <li key={item._id} className="gift-history-item">
                <div className="gift-history-left">
                  <span className="gift-history-code">{item.description.replace("Gift Code Redeemed: ", "")}</span>
                  <span className="gift-history-time">{formatClaimDate(item.createdAt)}</span>
                </div>
                <strong className="gift-history-amount">+{formatMoney(item.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Styled encapsulation */}
      <style>{`
        .account-page.account-sub-page {
          background-color: var(--theme-bg, #080808);
          min-height: 100vh;
          padding-bottom: 2rem;
          color: #fff;
          font-family: var(--font-inter, sans-serif);
        }

        .gift-subheader {
          height: 48px;
          display: flex;
          align-items: center;
          background-color: var(--theme-bg-soft, #0d0d0d);
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .gift-back-btn {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #fff;
          font-size: 1.8rem;
          font-weight: 300;
          cursor: pointer;
        }

        .gift-subheader h1 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-left: 0.5rem;
        }

        .gift-banner-wrap {
          width: 100%;
          overflow: hidden;
          background-color: #ffe8cc;
          aspect-ratio: 16 / 9;
        }

        .gift-banner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .gift-card-content {
          margin: 0.75rem;
          background-color: var(--theme-bg-card, #191919);
          border-radius: 12px;
          padding: 1.25rem 1rem;
          text-align: left;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }

        .gift-card-hi {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--theme-gold, #D4AF37);
          margin-bottom: 0.25rem;
        }

        .gift-card-sub {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 1.25rem;
        }

        .gift-card-form {
          display: flex;
          flex-direction: column;
        }

        .gift-input-label {
          font-size: 0.8rem;
          color: #f8fafc;
          margin-bottom: 0.625rem;
          font-weight: 500;
        }

        .gift-input-box {
          background-color: var(--theme-bg-input, #131313);
          border: 1px solid var(--theme-border-strong, rgba(255, 255, 255, 0.12));
          border-radius: 99px;
          padding: 0.875rem 1.25rem;
          font-size: 0.85rem;
          color: #fff;
          margin-bottom: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .gift-input-box:focus {
          border-color: var(--theme-gold, #D4AF37);
        }

        .gift-input-box::placeholder {
          color: #4b5563;
        }

        .gift-msg {
          font-size: 0.8rem;
          border-radius: 8px;
          padding: 0.625rem 0.875rem;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .gift-msg.error {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .gift-msg.success {
          background-color: rgba(212, 175, 55, 0.08);
          border: 1px solid rgba(212, 175, 55, 0.18);
          color: var(--theme-gold-bright, #F4D77D);
        }

        .gift-submit-btn {
          background: linear-gradient(135deg, var(--theme-gold-bright, #F4D77D) 0%, var(--theme-gold, #D4AF37) 100%);
          color: #000;
          font-weight: 800;
          font-size: 0.9rem;
          padding: 0.875rem;
          border-radius: 99px;
          border: none;
          cursor: pointer;
          transition: filter 0.2s;
          text-align: center;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.25);
        }

        .gift-submit-btn:hover {
          filter: brightness(1.1);
        }

        .gift-submit-btn:disabled {
          background: rgba(255,255,255,0.06);
          color: #4b5563;
          cursor: not-allowed;
          box-shadow: none;
        }

        .gift-history-card {
          margin: 0 0.75rem;
          background-color: var(--theme-bg-card, #191919);
          border-radius: 12px;
          padding: 1.25rem 1rem;
          text-align: left;
        }

        .gift-history-head {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 0.75rem;
          margin-bottom: 1rem;
        }

        .gift-history-head h2 {
          font-size: 0.9rem;
          font-weight: 700;
          color: #fff;
        }

        .gift-history-loading {
          text-align: center;
          font-size: 0.8rem;
          color: #64748b;
          padding: 2rem 0;
        }

        .gift-history-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 0;
          color: #4b5563;
        }

        .gift-history-empty p {
          margin-top: 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .gift-history-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .gift-history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
        }

        .gift-history-item:last-child {
          border-bottom: none;
        }

        .gift-history-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .gift-history-code {
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
        }

        .gift-history-time {
          font-size: 0.7rem;
          color: #64748b;
        }

        .gift-history-amount {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--theme-gold, #D4AF37);
        }
      `}</style>
    </main>
  );
}

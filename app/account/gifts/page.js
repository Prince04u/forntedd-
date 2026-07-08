"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken } from "@/lib/auth";
import { claimDailyGift, getGiftStatus } from "@/lib/giftsApi";

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatClaimDate = (value) => {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function GiftsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getGiftStatus();
      setStatus(res.data || null);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load gifts");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadStatus();
  }, [loadStatus, router]);

  const handleClaim = async () => {
    setClaiming(true);
    setError("");
    setSuccess("");
    try {
      const res = await claimDailyGift();
      setSuccess(`Claimed ${formatMoney(res.data?.amount)} · Day ${res.data?.streak || 1} streak`);
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to claim gift");
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

  const history = status?.history || [];

  return (
    <main className="account-page account-sub-page">
      <AccountSubHeader title="Daily gifts" />

      {error && <div className="account-form-error">{error}</div>}
      {success && <div className="account-form-success">{success}</div>}

      {loading && !status ? (
        <div className="account-loading">Loading gifts...</div>
      ) : (
        <>
          <section className="account-gifts-hero">
            <div className="account-gifts-icon">🎁</div>
            <div>
              <span>Daily login reward</span>
              <strong>{formatMoney(status?.dailyAmount)}</strong>
              <p>
                {status?.enabled
                  ? "Claim once every day (IST). Keep your streak going!"
                  : "Daily gifts are currently unavailable."}
              </p>
            </div>
          </section>

          <section className="account-gifts-stats">
            <div>
              <span>Current streak</span>
              <strong>{status?.streak ?? 0} days</strong>
            </div>
            <div>
              <span>Total claimed</span>
              <strong>{formatMoney(status?.totals?.earned)}</strong>
            </div>
            <div>
              <span>Claims</span>
              <strong>{status?.totals?.claims ?? 0}</strong>
            </div>
          </section>

          <section className="account-gifts-action">
            {status?.claimedToday ? (
              <>
                <button type="button" className="account-form-submit" disabled>
                  Claimed today ✓
                </button>
                <p className="account-form-hint">
                  Come back tomorrow for your next {formatMoney(status?.dailyAmount)} gift.
                  {status?.todayClaim?.streak ? ` Day ${status.todayClaim.streak} streak active.` : ""}
                </p>
              </>
            ) : status?.canClaim ? (
              <>
                <button
                  type="button"
                  className="account-form-submit account-gifts-claim-btn"
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  {claiming ? "Claiming..." : `Claim ${formatMoney(status?.dailyAmount)} now`}
                </button>
                <p className="account-form-hint">
                  {status?.nextStreak > 1
                    ? `Claim today to reach a ${status.nextStreak}-day streak.`
                    : "Start a new streak with today's gift."}
                </p>
              </>
            ) : (
              <>
                <button type="button" className="account-form-submit" disabled>
                  Gifts unavailable
                </button>
                <p className="account-form-hint">
                  Admin has not enabled daily gifts yet. Check back later or explore{" "}
                  <Link href="/referral">referral rewards</Link>.
                </p>
              </>
            )}
          </section>

          <section className="account-gifts-history">
            <div className="account-gifts-history-head">
              <h2>Recent claims</h2>
              <span>{history.length} shown</span>
            </div>
            {history.length === 0 ? (
              <p className="account-empty-state">
                <span>🎁</span>
                No gifts claimed yet.
              </p>
            ) : (
              <ul className="account-gifts-list">
                {history.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{formatMoney(item.amount)}</strong>
                      <span>Day {item.streak} streak</span>
                    </div>
                    <time>{formatClaimDate(item.claimDate)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

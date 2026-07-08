"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getWithdrawals } from "@/lib/walletApi";
import {
  formatWithdrawAmount,
  formatWithdrawStatus,
  getWithdrawAccountLine,
  getWithdrawItemDate,
  getWithdrawItemId,
  getWithdrawMethodMeta,
} from "@/lib/withdrawHistory";

const STATUS_FILTERS = [
  { id: "All", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function WithdrawHistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithdrawals();
      setWithdrawals(res.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
      }
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
    loadWithdrawals();
  }, [router, loadWithdrawals]);

  const hasActiveFilters = statusFilter !== "All" || Boolean(dateFilter);

  const resetFilters = () => {
    setStatusFilter("All");
    setDateFilter("");
  };

  const filtered = withdrawals.filter((w) => {
    const matchStatus = statusFilter === "All" || w.status === statusFilter;
    const createdAt = getWithdrawItemDate(w);
    const matchDate =
      !dateFilter ||
      (createdAt && new Date(createdAt).toISOString().slice(0, 10) === dateFilter);
    return matchStatus && matchDate;
  });

  if (!mounted) {
    return (
      <main className="withdraw-page">
        <div className="wallet-screen-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="withdraw-page">
      <header className="withdraw-header center-title">
        <Link href="/wallet/withdraw" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Withdrawal history</h1>
        <button
          type="button"
          className="withdraw-history-refresh"
          onClick={loadWithdrawals}
          disabled={loading}
          aria-label="Refresh history"
        >
          ↻
        </button>
      </header>

      <section className="withdraw-history-toolbar">
        <div className="withdraw-history-toolbar-meta">
          <span className="withdraw-history-count">
            {loading ? "Loading..." : `${filtered.length} request${filtered.length === 1 ? "" : "s"}`}
          </span>
          {hasActiveFilters ? (
            <button type="button" className="withdraw-history-reset" onClick={resetFilters}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="withdraw-history-toolbar-fields">
          <select
            className="withdraw-history-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id === "All" ? "All status" : item.label}
              </option>
            ))}
          </select>
          <input
            className="withdraw-history-date-inline"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by date"
          />
        </div>
      </section>

      {loading && withdrawals.length === 0 ? (
        <div className="withdraw-history-empty">
          <div className="withdraw-history-empty-icon">↻</div>
          <p>Loading withdrawal history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="withdraw-history-empty">
          <div className="withdraw-history-empty-icon">📋</div>
          <p>No withdrawal requests found</p>
          <span className="withdraw-history-empty-hint">
            {statusFilter !== "All" || dateFilter
              ? "Try changing filters or pick another date."
              : "Your withdrawal requests will appear here."}
          </span>
          <Link href="/wallet/withdraw" className="withdraw-history-empty-link">
            New withdrawal
          </Link>
        </div>
      ) : (
        <ul className="withdraw-history-list">
          {filtered.map((w) => {
            const methodMeta = getWithdrawMethodMeta(w);
            const accountLine = getWithdrawAccountLine(w);
            const createdAt = getWithdrawItemDate(w);

            return (
              <li key={getWithdrawItemId(w)} className="withdraw-history-card">
                <div className="withdraw-history-card-icon">{methodMeta.icon}</div>
                <div className="withdraw-history-card-body">
                  <div className="withdraw-history-card-top">
                    <strong>₹{formatWithdrawAmount(w.amount)}</strong>
                    <span className={`withdraw-history-status ${w.status}`}>
                      {formatWithdrawStatus(w.status)}
                    </span>
                  </div>
                  <span className="withdraw-history-method">{methodMeta.label}</span>
                  {accountLine ? (
                    <span className="withdraw-history-account">{accountLine}</span>
                  ) : null}
                  <small>
                    {createdAt ? new Date(createdAt).toLocaleString("en-IN") : "—"}
                  </small>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

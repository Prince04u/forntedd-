"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import { getTransactions } from "@/lib/walletApi";
import {
  TRANSACTION_TYPE_OPTIONS,
  formatTransactionAmount,
  formatTransactionStatus,
  formatTransactionType,
  isCreditTransaction,
} from "@/lib/transactionUtils";

const STATUS_OPTIONS = ["all", "pending", "completed", "failed"];
const PAGE_SIZE = 25;

export default function TransactionHistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async (pageNum = 1, append = false) => {
    const isFirstPage = pageNum === 1 && !append;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);
    setError("");

    try {
      const res = await getTransactions({ page: pageNum, limit: PAGE_SIZE });
      const nextTransactions = res.data?.transactions || [];
      const pagination = res.data?.pagination || {};

      setTransactions((prev) => (append ? [...prev, ...nextTransactions] : nextTransactions));
      setPage(pageNum);
      setTotal(pagination.total ?? nextTransactions.length);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadTransactions(1);
  }, [loadTransactions, router]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchType = typeFilter === "all" || tx.type === typeFilter;
      const matchStatus = statusFilter === "all" || tx.status === statusFilter;
      return matchType && matchStatus;
    });
  }, [transactions, typeFilter, statusFilter]);

  const hasMore = transactions.length < total;

  if (!mounted) {
    return (
      <main className="deposit-history-page">
        <div className="wallet-screen-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="deposit-history-page txn-history-page">
      <header className="deposit-header center-title">
        <Link href="/wallet" className="wallet-screen-back">‹</Link>
        <h1>Transaction history</h1>
        <button
          type="button"
          className="txn-history-refresh"
          onClick={() => loadTransactions(1)}
          disabled={loading}
          aria-label="Refresh"
        >
          ↻
        </button>
      </header>

      <div className="txn-history-filters">
        {TRANSACTION_TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`txn-history-chip ${typeFilter === option.id ? "active" : ""}`}
            onClick={() => setTypeFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="deposit-history-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : formatTransactionStatus(status)}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="auth-error deposit-error">{error}</div>}

      {loading && transactions.length === 0 ? (
        <div className="wallet-screen-loading">Loading transactions...</div>
      ) : filtered.length === 0 ? (
        <div className="deposit-empty">
          <div className="deposit-empty-icon">📊</div>
          <p>No transactions found</p>
          <Link href="/wallet/deposit" className="deposit-empty-link">Make a deposit</Link>
        </div>
      ) : (
        <ul className="txn-history-list">
          {filtered.map((tx) => {
            const credit = isCreditTransaction(tx.type);
            return (
              <li key={tx.id || tx._id} className="txn-history-item">
                <div className="txn-history-main">
                  <strong>{formatTransactionType(tx.type)}</strong>
                  {tx.description ? <span className="txn-history-desc">{tx.description}</span> : null}
                  {tx.periodId ? (
                    <span className="txn-history-meta">Period #{tx.periodId.slice(-8)}</span>
                  ) : null}
                  <small>{new Date(tx.createdAt).toLocaleString("en-IN")}</small>
                </div>
                <div className="txn-history-side">
                  <span className={`txn-history-amount ${credit ? "credit" : "debit"}`}>
                    {formatTransactionAmount(tx)}
                  </span>
                  <span className={`deposit-status ${tx.status}`}>{formatTransactionStatus(tx.status)}</span>
                  {tx.balanceAfter != null && (
                    <span className="txn-history-balance">Bal ₹{Number(tx.balanceAfter).toFixed(2)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && typeFilter === "all" && statusFilter === "all" && filtered.length > 0 && (
        <div className="txn-history-more">
          <button type="button" onClick={() => loadTransactions(page + 1, true)} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </main>
  );
}

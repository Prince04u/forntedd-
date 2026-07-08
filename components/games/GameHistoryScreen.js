"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import { getToken } from "@/lib/auth";
import { getMyBets } from "@/lib/wingoApi";
import {
  DURATIONS,
  formatBetLabel,
  formatBetPnL,
  getDurationMeta,
  getDurationSlugFromSeconds,
} from "@/lib/wingoUtils";

const STATUS_OPTIONS = ["all", "pending", "won", "lost", "refunded"];
const PAGE_SIZE = 25;

export default function GameHistoryScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bets, setBets] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadBets = useCallback(async (pageNum = 1, append = false) => {
    const isFirstPage = pageNum === 1 && !append;
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError("");

    try {
      const res = await getMyBets({ page: pageNum, limit: PAGE_SIZE });
      const nextBets = res.data?.bets || [];
      const pagination = res.data?.pagination || {};

      setBets((prev) => (append ? [...prev, ...nextBets] : nextBets));
      setPage(pageNum);
      setTotal(pagination.total ?? nextBets.length);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load game history");
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
    loadBets(1);
  }, [loadBets, router]);

  const filteredBets = useMemo(() => {
    if (statusFilter === "all") return bets;
    return bets.filter((bet) => bet.status === statusFilter);
  }, [bets, statusFilter]);

  const hasMore = bets.length < total;

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadBets(page + 1, true);
    }
  };

  if (!mounted) {
    return (
      <main className="game-history-page">
        <div className="game-history-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="game-history-page">
      <header className="game-history-header">
        <Link href="/account" className="game-history-back">‹</Link>
        <h1>Game History</h1>
        <button
          type="button"
          className="game-history-refresh"
          onClick={() => loadBets(1)}
          disabled={loading}
          aria-label="Refresh"
        >
          ↻
        </button>
      </header>

      <section className="game-history-quick">
        <p>WinGo games</p>
        <div className="game-history-games">
          {DURATIONS.map((d) => (
            <Link key={d.slug} href={`/wingo/${d.slug}`} className="game-history-game-link">
              {d.short}
            </Link>
          ))}
        </div>
      </section>

      <div className="game-history-filters">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            className={`game-history-filter ${statusFilter === status ? "active" : ""}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="auth-error game-history-msg">{error}</div>}

      {loading && bets.length === 0 ? (
        <div className="game-history-loading">Loading bets...</div>
      ) : filteredBets.length === 0 ? (
        <div className="game-history-empty">
          <div className="game-history-empty-icon">🎮</div>
          <p>No bets found</p>
          <Link href="/wingo/30s" className="game-history-play-btn">Play WinGo</Link>
        </div>
      ) : (
        <section className="game-history-list">
          {filteredBets.map((bet) => {
            const slug = getDurationSlugFromSeconds(bet.duration);
            const durationMeta = getDurationMeta(slug);
            const pnl = formatBetPnL(bet);

            return (
              <article key={bet._id} className="game-history-card">
                <div className="game-history-card-top">
                  <div>
                    <strong>{durationMeta.short}</strong>
                    <span className="game-history-period">#{bet.periodId?.slice(-8)}</span>
                  </div>
                  <span className={`game-history-status wg-status-${bet.status}`}>{bet.status}</span>
                </div>

                <div className="game-history-card-body">
                  <div>
                    <span className="game-history-label">Bet</span>
                    <p>{formatBetLabel(bet.betType, bet.betValue)}</p>
                  </div>
                  <div>
                    <span className="game-history-label">Amount</span>
                    <p>₹{bet.amount}</p>
                  </div>
                  <div>
                    <span className="game-history-label">P/L</span>
                    <p className={`game-history-pnl ${pnl.className}`}>{pnl.text}</p>
                  </div>
                  {bet.resultNumber != null && (
                    <div>
                      <span className="game-history-label">Result</span>
                      <p>{bet.resultNumber}</p>
                    </div>
                  )}
                </div>

                <div className="game-history-card-foot">
                  <time dateTime={bet.createdAt}>
                    {new Date(bet.createdAt).toLocaleString("en-IN")}
                  </time>
                  <Link href={`/wingo/${slug}`}>Play again</Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {hasMore && filteredBets.length > 0 && statusFilter === "all" && (
        <div className="game-history-more">
          <button type="button" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

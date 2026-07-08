"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import InviteQrModal from "@/components/share/InviteQrModal";
import ReferralIcon from "@/components/referral/ReferralIcon";
import { getToken } from "@/lib/auth";
import { buildInviteShareUrl, copyToClipboard } from "@/lib/clipboard";
import { BRAND_NAME } from "@/lib/brand";
import { getMyReferrals, getReferralEarnings } from "@/lib/referralApi";

const FRIENDS_PREVIEW = 5;

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (name) => {
  const parts = String(name || "P")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "P";
};

const getEarningLabel = (item) => {
  if (item.referredUser?.name) return `${item.referredUser.name} joined`;
  return item.title || "Referral reward";
};

const EARNINGS_FILTERS = [
  { id: "all", label: "All" },
  { id: "credited", label: "Credited" },
  { id: "pending", label: "Pending" },
];

export default function ReferralScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [data, setData] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [earningsFilter, setEarningsFilter] = useState("all");
  const [earnings, setEarnings] = useState([]);
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsPages, setEarningsPages] = useState(1);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState("");
  const [friendsExpanded, setFriendsExpanded] = useState(false);

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyReferrals({ limit: 20 });
      setData(res.data || null);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load referral info");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadEarnings = useCallback(
    async (page = 1, status = earningsFilter, append = false) => {
      setEarningsLoading(true);
      setEarningsError("");
      try {
        const params = { page, limit: 10 };
        if (status !== "all") params.status = status;
        const res = await getReferralEarnings(params);
        const nextItems = res.data?.earnings || [];
        setEarnings((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setEarningsPage(res.data?.pagination?.page || page);
        setEarningsPages(res.data?.pagination?.totalPages || 1);
      } catch (err) {
        if (err.response?.status === 401) {
          router.replace("/login");
          return;
        }
        setEarningsError(err.response?.data?.message || "Failed to load earnings");
        if (!append) setEarnings([]);
      } finally {
        setEarningsLoading(false);
      }
    },
    [earningsFilter, router]
  );

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadReferrals();
  }, [loadReferrals, router]);

  useEffect(() => {
    if (!mounted || !getToken()) return;
    loadEarnings(1, earningsFilter, false);
  }, [mounted, earningsFilter, loadEarnings]);

  const shareUrl = useMemo(
    () => buildInviteShareUrl(data?.inviteCode, data?.shareUrl),
    [data?.inviteCode, data?.shareUrl]
  );

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const handleCopy = useCallback(
    async (text, successMessage = "Copied!") => {
      const ok = await copyToClipboard(text);
      showToast(ok ? successMessage : "Copy failed — try again");
    },
    [showToast]
  );

  const handleShare = useCallback(async () => {
    if (!shareUrl) {
      showToast("Invite link unavailable");
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join ${BRAND_NAME}`,
          text: `Use my invite code ${data?.inviteCode} to register`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    await handleCopy(shareUrl, "Link copied!");
  }, [shareUrl, data?.inviteCode, handleCopy, showToast]);

  const summary = data?.summary;
  const agent = data?.agent;
  const referrals = data?.referrals || [];
  const isAgent = Boolean(agent);
  const visibleFriends = useMemo(
    () => (friendsExpanded ? referrals : referrals.slice(0, FRIENDS_PREVIEW)),
    [friendsExpanded, referrals]
  );
  const hasMoreFriends = referrals.length > FRIENDS_PREVIEW && !friendsExpanded;

  if (!mounted) {
    return (
      <main className="referral-page">
        <div className="referral-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="referral-page">
      <header className="referral-header">
        <div className="referral-header-top">
          <Link href="/account" className="referral-back" aria-label="Back">
            ‹
          </Link>
          <h1>Invite &amp; Earn</h1>
          <span className="referral-header-spacer" aria-hidden />
        </div>
        <p className="referral-header-sub">Share your code — friends join, you earn rewards</p>
      </header>

      {toast && <div className="referral-toast">{toast}</div>}
      {error && <div className="referral-error">{error}</div>}

      {loading && !data ? (
        <div className="referral-loading">Loading referral stats...</div>
      ) : (
        <>
          <section className="referral-code-card">
            <span className="referral-code-label">
              {data?.inviteType === "agent" ? "Partner agent code" : "Your invite code"}
            </span>
            <div className="referral-code-display">
              <ReferralIcon id="sparkle" size={12} className="referral-sparkle referral-sparkle--tl" />
              <ReferralIcon id="sparkle" size={10} className="referral-sparkle referral-sparkle--tr" />
              <ReferralIcon id="sparkle" size={8} className="referral-sparkle referral-sparkle--bl" />
              <strong className="referral-code-value">{data?.inviteCode || "—"}</strong>
            </div>
            <button
              type="button"
              className="referral-copy-main"
              onClick={() => handleCopy(data?.inviteCode || "", "Code copied!")}
              disabled={!data?.inviteCode}
            >
              Copy
            </button>
            {data?.inviteType === "agent" && (
              <p className="referral-code-hint">
                Agent partner code · Player code: <code>{data.referralCode}</code>
              </p>
            )}
            <div className="referral-share-actions">
              <button
                type="button"
                className="referral-share-btn primary"
                onClick={handleShare}
                disabled={!shareUrl}
              >
                Share link
              </button>
              <button
                type="button"
                className="referral-share-btn"
                onClick={() => handleCopy(shareUrl, "Link copied!")}
                disabled={!shareUrl}
              >
                Copy link
              </button>
              <button
                type="button"
                className="referral-share-btn"
                onClick={() => setQrOpen(true)}
                disabled={!shareUrl}
              >
                Show QR
              </button>
            </div>
            <p className="referral-share-url">{shareUrl || "Invite link loading..."}</p>
          </section>

          <InviteQrModal
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            shareUrl={shareUrl}
            code={data?.inviteCode}
            title={data?.inviteType === "agent" ? "Partner invite QR" : "Invite QR"}
          />

          <section className="referral-stats-grid">
            <div className="referral-stat-card referral-stat-card--friends">
              <ReferralIcon id="stat-friends" size={18} className="referral-stat-icon" />
              <strong>{summary?.totalReferrals ?? 0}</strong>
              <span>Friends joined</span>
            </div>
            <div className="referral-stat-card referral-stat-card--wallet">
              <ReferralIcon id="stat-wallet" size={18} className="referral-stat-icon" />
              <strong>{formatMoney(summary?.walletEarnings)}</strong>
              <span>Wallet earnings</span>
            </div>
            <div className="referral-stat-card referral-stat-card--pending">
              <ReferralIcon id="stat-pending" size={18} className="referral-stat-icon" />
              <strong>{summary?.pendingBonuses ?? 0}</strong>
              <span>Pending bonuses</span>
            </div>
          </section>

          <section className="referral-panel referral-earnings-section">
            <div className="referral-panel-head">
              <h2>Earnings history</h2>
              <div className="referral-earnings-filters">
                {EARNINGS_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`referral-earnings-filter ${earningsFilter === filter.id ? "active" : ""}`}
                    onClick={() => setEarningsFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            {earningsError && <div className="referral-earnings-error">{earningsError}</div>}
            {earningsLoading && earnings.length === 0 ? (
              <p className="referral-empty">Loading earnings...</p>
            ) : earnings.length === 0 ? (
              <p className="referral-empty">No earnings yet.</p>
            ) : (
              <ul className="referral-earnings-list">
                {earnings.map((item) => (
                  <li key={item.id} className="referral-earnings-item">
                    <span className="referral-row-icon">
                      <ReferralIcon id="user-circle" size={18} />
                    </span>
                    <div className="referral-earnings-main">
                      <div className="referral-earnings-top">
                        <strong>{getEarningLabel(item)}</strong>
                      </div>
                      <time>{formatDateTime(item.creditedAt || item.createdAt)}</time>
                    </div>
                    <div className="referral-earnings-side">
                      <span className={`referral-earnings-status status-${item.status}`}>
                        {item.status === "credited" ? "Credited" : "Pending"}
                      </span>
                      <strong className={`referral-earnings-amount ${item.status === "credited" ? "positive" : "pending"}`}>
                        {item.status === "credited" ? "+" : ""}
                        {formatMoney(item.amount)}
                      </strong>
                      <ReferralIcon id="chevron" size={16} className="referral-row-chevron" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {earningsPage < earningsPages && (
              <button
                type="button"
                className="referral-view-all"
                disabled={earningsLoading}
                onClick={() => loadEarnings(earningsPage + 1, earningsFilter, true)}
              >
                {earningsLoading ? "Loading..." : "View all ›"}
              </button>
            )}
          </section>

          {isAgent && (
            <section className="referral-agent-card">
              <div className="referral-agent-head">
                <h2>Partner earnings</h2>
                <span className={`referral-agent-status status-${agent.status}`}>{agent.status}</span>
              </div>
              <p className="referral-agent-meta">
                {agent.agentTypeLabel} · {agent.commissionRate}% commission
              </p>
              <div className="referral-agent-stats">
                <div>
                  <span>Direct players</span>
                  <strong>{agent.stats.directPlayers}</strong>
                </div>
                <div>
                  <span>Downline total</span>
                  <strong>{agent.stats.totalDownlinePlayers}</strong>
                </div>
                <div>
                  <span>Commission earned</span>
                  <strong>{formatMoney(agent.stats.totalCommissionEarned)}</strong>
                </div>
                <div>
                  <span>Commission events</span>
                  <strong>{agent.commission.eventCount}</strong>
                </div>
              </div>
              <Link href="/agent" className="referral-agent-portal-link">
                Open full partner portal →
              </Link>
            </section>
          )}

          {data?.referredBy && (
            <section className="referral-invited-by">
              <span>You were invited by</span>
              <strong>{data.referredBy.name}</strong>
              <code>{data.referredBy.referralCode}</code>
            </section>
          )}

          <section className="referral-panel referral-list-section">
            <div className="referral-panel-head referral-panel-head--split">
              <h2>Friends you invited</h2>
              {hasMoreFriends ? (
                <button type="button" className="referral-view-all-link" onClick={() => setFriendsExpanded(true)}>
                  View all
                </button>
              ) : referrals.length > 0 ? (
                <span className="referral-panel-count">{summary?.totalReferrals ?? referrals.length} total</span>
              ) : null}
            </div>
            {referrals.length === 0 ? (
              <p className="referral-empty">No friends joined yet.</p>
            ) : (
              <ul className="referral-list">
                {visibleFriends.map((item) => (
                  <li key={String(item.id)} className="referral-list-item">
                    <span className="referral-avatar" aria-hidden>
                      {getInitials(item.user?.name)}
                    </span>
                    <div className="referral-list-main">
                      <div className="referral-list-name-row">
                        <strong>{item.user?.name || "Player"}</strong>
                        <span className={`referral-status status-${item.status}`}>
                          {item.status === "active" ? "Active" : item.status}
                        </span>
                      </div>
                      <span className="referral-list-sub">
                        {item.joinedAt ? `Joined on ${formatDate(item.joinedAt)}` : item.user?.mobileMasked}
                      </span>
                    </div>
                    <div className="referral-list-meta">
                      {item.bonusStatus === "credited" && item.bonusAmount > 0 ? (
                        <span className="referral-bonus-tag credited">{formatMoney(item.bonusAmount)} Earned</span>
                      ) : item.bonusStatus === "pending" ? (
                        <span className="referral-bonus-tag pending">Pending</span>
                      ) : null}
                      <ReferralIcon id="chevron" size={16} className="referral-row-chevron" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="referral-footnote">
            Invite codes and agent partner codes use the same field at signup. Friends enter your code on the{" "}
            <Link href="/register">register</Link> page.
          </p>
        </>
      )}

      <BottomNav />
    </main>
  );
}


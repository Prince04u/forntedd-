"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import InviteQrModal from "@/components/share/InviteQrModal";
import {
  createAgentPayoutRequest,
  getAgentCommissions,
  getAgentDashboard,
  getAgentDownline,
  getAgentNotifications,
  getAgentPayoutRequests,
} from "@/lib/agentApi";
import { getToken } from "@/lib/auth";

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const copyText = async (text, setToast) => {
  try {
    await navigator.clipboard.writeText(text);
    setToast("Copied!");
    setTimeout(() => setToast(""), 2000);
  } catch {
    setToast("Copy failed");
    setTimeout(() => setToast(""), 2000);
  }
};

const EVENT_LABELS = {
  deposit: "Deposit",
  bet_ggr: "Bet GGR",
};

const splitLabel = (metadata) => {
  if (!metadata) return "—";
  if (metadata.isLeaf) return "Direct";
  if (metadata.chainLevel != null) return `Upline L${metadata.chainLevel}`;
  return "Upline";
};

const NOTIFICATION_TYPE_LABELS = {
  commission: "Commission",
  downline: "Downline",
  payout: "Payout",
};

export default function AgentPortalScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [downline, setDownline] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [commissionSummary, setCommissionSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("players");
  const [qrOpen, setQrOpen] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutUpi, setPayoutUpi] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionPagination, setCommissionPagination] = useState({ page: 1, totalPages: 1 });
  const [commissionStatus, setCommissionStatus] = useState("");
  const [commissionEventType, setCommissionEventType] = useState("");
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutPagination, setPayoutPagination] = useState({ page: 1, totalPages: 1 });
  const [payoutStatus, setPayoutStatus] = useState("");
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const loadCommissions = useCallback(async (page = 1) => {
    setCommissionsLoading(true);
    try {
      const commRes = await getAgentCommissions({
        page,
        limit: 10,
        status: commissionStatus || undefined,
        eventType: commissionEventType || undefined,
      });
      const rows = Array.isArray(commRes.data) ? commRes.data : commRes.data?.data || [];
      setCommissions(rows);
      setCommissionSummary(commRes.summary || commRes.data?.summary || null);
      setCommissionPagination(commRes.pagination || commRes.data?.pagination || { page, totalPages: 1 });
      setCommissionPage(page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load commissions");
    } finally {
      setCommissionsLoading(false);
    }
  }, [commissionEventType, commissionStatus]);

  const loadPayouts = useCallback(async (page = 1) => {
    setPayoutsLoading(true);
    try {
      const payoutRes = await getAgentPayoutRequests({
        page,
        limit: 10,
        status: payoutStatus || undefined,
      });
      setPayoutRequests(Array.isArray(payoutRes.data) ? payoutRes.data : []);
      setPayoutPagination(payoutRes.pagination || { page, totalPages: 1 });
      setPayoutPage(page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payout history");
    } finally {
      setPayoutsLoading(false);
    }
  }, [payoutStatus]);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await getAgentNotifications({ limit: 25 });
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, downRes] = await Promise.all([
        getAgentDashboard(),
        getAgentDownline({ playerLimit: 30 }),
      ]);
      setDashboard(dashRes.data || null);
      setDownline(downRes.data || null);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      if (err.response?.status === 403) {
        setError("This account is not registered as a partner agent.");
        setDashboard(null);
        return;
      }
      setError(err.response?.data?.message || "Failed to load partner portal");
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
    loadPortal();
  }, [loadPortal, router]);

  useEffect(() => {
    if (!dashboard) return;
    loadCommissions(1);
  }, [dashboard, loadCommissions]);

  useEffect(() => {
    if (!dashboard) return;
    loadPayouts(1);
  }, [dashboard, loadPayouts]);

  useEffect(() => {
    if (!dashboard) return;
    loadNotifications();
  }, [dashboard, loadNotifications]);

  const filteredNotifications =
    notificationFilter === "all"
      ? notifications
      : notifications.filter((item) => item.type === notificationFilter);

  const handleShare = async () => {
    const shareUrl = dashboard?.invite?.shareUrl;
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join via partner link",
          text: `Use partner code ${dashboard.invite.agentCode}`,
          url: shareUrl,
        });
        return;
      } catch {
        // fall through
      }
    }
    await copyText(shareUrl, setToast);
  };

  const submitPayoutRequest = async (event) => {
    event.preventDefault();
    setPayoutSubmitting(true);
    setPayoutMessage("");
    setError("");
    try {
      await createAgentPayoutRequest({
        amount: Number(payoutAmount),
        upiId: payoutUpi.trim(),
      });
      setPayoutMessage("Payout request submitted for admin approval.");
      setPayoutAmount("");
      setPayoutUpi("");
      await loadPortal();
      await loadPayouts(1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit payout request");
    } finally {
      setPayoutSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <main className="agent-portal-page">
        <div className="agent-portal-loading">Loading...</div>
      </main>
    );
  }

  const agent = dashboard?.agent;
  const invite = dashboard?.invite;
  const payout = dashboard?.payout;
  const commissionWallet = dashboard?.commissionWallet;

  return (
    <main className="agent-portal-page">
      <header className="agent-portal-header">
        <Link href="/account" className="agent-portal-back">
          ‹ Back
        </Link>
        <div className="agent-portal-title-row">
          <h1>Partner portal</h1>
          {agent?.status && <span className={`agent-status-pill status-${agent.status}`}>{agent.status}</span>}
        </div>
        <p>{agent?.agentTypeLabel || "Agent"} · {agent?.commissionRate ?? 0}% commission</p>
      </header>

      {toast && <div className="agent-portal-toast">{toast}</div>}
      {error && (
        <div className="agent-portal-error">
          {error}
          <Link href="/">Go home</Link>
        </div>
      )}

      {loading && !dashboard ? (
        <div className="agent-portal-loading">Loading partner dashboard...</div>
      ) : dashboard ? (
        <>
          <section className="agent-code-card">
            <span>Partner code</span>
            <div className="agent-code-row">
              <strong>{invite?.agentCode}</strong>
              <button
                type="button"
                onClick={() => copyText(invite?.agentCode || "", setToast)}
                disabled={!invite?.canInvite}
              >
                Copy
              </button>
            </div>
            {!invite?.canInvite && (
              <p className="agent-code-hint">Invite sharing is disabled until your partner account is active.</p>
            )}
            <div className="agent-share-actions">
              <button type="button" className="primary" onClick={handleShare} disabled={!invite?.canInvite}>
                Share link
              </button>
              <button
                type="button"
                onClick={() => copyText(invite?.shareUrl || "", setToast)}
                disabled={!invite?.canInvite}
              >
                Copy link
              </button>
              <button type="button" onClick={() => setQrOpen(true)} disabled={!invite?.canInvite}>
                Show QR
              </button>
            </div>
          </section>

          <InviteQrModal
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            shareUrl={invite?.shareUrl}
            code={invite?.agentCode}
            title="Partner invite QR"
          />

          <section className="agent-stats-grid">
            <div className="agent-stat-card highlight">
              <span>Today&apos;s earnings</span>
              <strong>{formatMoney(dashboard.earnings?.today)}</strong>
              <small>{dashboard.earnings?.todayEvents ?? 0} events</small>
            </div>
            <div className="agent-stat-card">
              <span>Commission balance</span>
              <strong>{formatMoney(commissionWallet?.netCommission)}</strong>
              <small>{formatMoney(commissionWallet?.availableCommission)} available</small>
            </div>
            <div className="agent-stat-card">
              <span>Gaming wallet</span>
              <strong>{formatMoney(commissionWallet?.gamingBalance)}</strong>
              <small>Deposits &amp; winnings (excl. commission)</small>
            </div>
            <div className="agent-stat-card">
              <span>Direct players</span>
              <strong>{dashboard.network?.directPlayers ?? 0}</strong>
              <small>{dashboard.network?.childAgents ?? 0} child agents</small>
            </div>
          </section>

          <section className="agent-wallet-breakdown">
            <h2>Balance breakdown</h2>
            <div className="agent-payout-meta">
              <div>
                <span>Total wallet</span>
                <strong>{formatMoney(commissionWallet?.walletBalance ?? dashboard.user?.walletBalance)}</strong>
              </div>
              <div>
                <span>Paid out</span>
                <strong>{formatMoney(commissionWallet?.paidOut)}</strong>
              </div>
              <div>
                <span>Pending credit</span>
                <strong>{formatMoney(commissionWallet?.pendingCredit)}</strong>
              </div>
              <div>
                <span>Pending payout</span>
                <strong>{formatMoney(commissionWallet?.pendingPayoutHold)}</strong>
              </div>
            </div>
          </section>

          <section className="agent-notifications-section" id="notifications">
            <div className="agent-section-head">
              <h2>Notifications</h2>
              <button type="button" className="agent-refresh-btn" onClick={loadNotifications} disabled={notificationsLoading}>
                {notificationsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="agent-notification-filters">
              {["all", "commission", "downline", "payout"].map((key) => (
                <button
                  key={key}
                  type="button"
                  className={notificationFilter === key ? "active" : ""}
                  onClick={() => setNotificationFilter(key)}
                >
                  {key === "all" ? "All" : NOTIFICATION_TYPE_LABELS[key]}
                </button>
              ))}
            </div>
            {notificationsLoading && notifications.length === 0 ? (
              <p className="agent-empty">Loading notifications...</p>
            ) : filteredNotifications.length === 0 ? (
              <p className="agent-empty">No notifications yet. Share your partner code to grow downline.</p>
            ) : (
              <ul className="agent-activity-list agent-notification-list">
                {filteredNotifications.map((item) => (
                  <li key={item.id}>
                    <div>
                      <div className="agent-notification-title-row">
                        <span className={`agent-notification-type type-${item.type}`}>
                          {NOTIFICATION_TYPE_LABELS[item.type] || item.type}
                        </span>
                        <strong>{item.title}</strong>
                      </div>
                      <span>{item.message}</span>
                    </div>
                    <time>{formatDate(item.at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="agent-payout-section">
            <h2>Request payout</h2>
            <p className="agent-code-hint">
              Commission credits your wallet. Submit a payout to withdraw to UPI after admin approval.
            </p>
            <div className="agent-payout-meta">
              <div>
                <span>Available commission</span>
                <strong>{formatMoney(commissionWallet?.availableCommission ?? payout?.withdrawableBalance)}</strong>
              </div>
              <div>
                <span>Minimum payout</span>
                <strong>{formatMoney(payout?.minPayoutAmount)}</strong>
              </div>
            </div>
            {payoutMessage ? <p className="agent-portal-toast">{payoutMessage}</p> : null}
            {payout?.hasActiveRequest ? (
              <p className="agent-code-hint">
                Active request: {formatMoney(payout.activeRequest?.amount)} · {payout.activeRequest?.status}
              </p>
            ) : (
              <form className="agent-payout-form" onSubmit={submitPayoutRequest}>
                <input
                  type="number"
                  placeholder="Amount"
                  value={payoutAmount}
                  onChange={(event) => setPayoutAmount(event.target.value)}
                  min={payout?.minPayoutAmount || 1}
                  required
                  disabled={!payout?.canRequest || payoutSubmitting}
                />
                <input
                  type="text"
                  placeholder="UPI ID (name@bank)"
                  value={payoutUpi}
                  onChange={(event) => setPayoutUpi(event.target.value)}
                  required
                  disabled={!payout?.canRequest || payoutSubmitting}
                />
                <button type="submit" disabled={!payout?.canRequest || payoutSubmitting}>
                  {payoutSubmitting ? "Submitting..." : "Submit payout request"}
                </button>
              </form>
            )}
            {payout?.blockReasons?.length && !payout?.canRequest ? (
              <div className="agent-payout-blocked">
                {payout.blockReasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
            ) : null}
            <div className="agent-filter-row">
              <select value={payoutStatus} onChange={(e) => setPayoutStatus(e.target.value)}>
                <option value="">All payout status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="on_hold">On hold</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            {payoutsLoading ? <p className="agent-empty">Loading payout history...</p> : null}
            {!payoutsLoading && payoutRequests.length > 0 ? (
              <ul className="agent-payout-list">
                {payoutRequests.map((row) => (
                  <li key={String(row.id)}>
                    <div>
                      <strong>{formatMoney(row.amount)}</strong>
                      <span>{row.accountDetails?.upiId || "UPI"}</span>
                    </div>
                    <span className={`agent-status-pill status-${row.status}`}>{row.status}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!payoutsLoading && payoutRequests.length === 0 ? (
              <p className="agent-empty">No payout requests yet.</p>
            ) : null}
            {payoutPagination.totalPages > 1 ? (
              <div className="agent-pagination-row">
                <button type="button" disabled={payoutPage <= 1} onClick={() => loadPayouts(payoutPage - 1)}>
                  Previous
                </button>
                <span>Page {payoutPage} of {payoutPagination.totalPages}</span>
                <button
                  type="button"
                  disabled={payoutPage >= payoutPagination.totalPages}
                  onClick={() => loadPayouts(payoutPage + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

          {dashboard?.compliance?.messages?.length > 0 && (
            <section className="agent-compliance-card">
              <h2>Compliance</h2>
              <ul>
                {dashboard.compliance.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
              <p className="agent-compliance-meta">
                KYC: {dashboard.compliance.kycStatus} · Status: {agent?.status}
              </p>
            </section>
          )}

          {dashboard.parent && (
            <section className="agent-parent-card">
              <span>Upline partner</span>
              <strong>{dashboard.parent.agentCode}</strong>
              <small>{dashboard.parent.agentTypeLabel}</small>
            </section>
          )}

          <section className="agent-downline-section">
            <div className="agent-section-head">
              <h2>Downline</h2>
              <div className="agent-tab-switch">
                <button
                  type="button"
                  className={activeTab === "players" ? "active" : ""}
                  onClick={() => setActiveTab("players")}
                >
                  Players ({downline?.directPlayers?.length ?? 0})
                </button>
                <button
                  type="button"
                  className={activeTab === "agents" ? "active" : ""}
                  onClick={() => setActiveTab("agents")}
                >
                  Agents ({(downline?.childAgents?.length ?? 0) + (downline?.nestedAgents?.length ?? 0)})
                </button>
              </div>
            </div>

            {activeTab === "players" ? (
              downline?.directPlayers?.length ? (
                <ul className="agent-list">
                  {downline.directPlayers.map((row) => (
                    <li key={String(row.id)}>
                      <div>
                        <strong>{row.user?.name || "Player"}</strong>
                        <span>{row.user?.mobileMasked}</span>
                      </div>
                      <time>{formatDate(row.joinedAt)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="agent-empty">No direct players yet. Share your partner code to grow downline.</p>
              )
            ) : (
              <>
                {downline?.childAgents?.length ? (
                  <ul className="agent-list">
                    {downline.childAgents.map((row) => (
                      <li key={String(row.id)}>
                        <div>
                          <strong>{row.agentCode}</strong>
                          <span>{row.agentTypeLabel}</span>
                        </div>
                        <span className={`agent-status-pill status-${row.status}`}>{row.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {downline?.nestedAgents?.length ? (
                  <>
                    <h3 className="agent-subheading">Nested agents</h3>
                    <ul className="agent-list">
                      {downline.nestedAgents.map((row) => (
                        <li key={String(row.id)}>
                          <div>
                            <strong>{row.agentCode}</strong>
                            <span>{row.agentTypeLabel}</span>
                          </div>
                          <span className={`agent-status-pill status-${row.status}`}>{row.status}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {!downline?.childAgents?.length && !downline?.nestedAgents?.length && (
                  <p className="agent-empty">No child agents under your network yet.</p>
                )}
              </>
            )}
          </section>

          <section className="agent-commission-section">
            <div className="agent-section-head">
              <h2>Commission ledger</h2>
              <span>
                {formatMoney(commissionSummary?.totalCredited)} credited ·{" "}
                {formatMoney(commissionSummary?.totalPending)} pending ·{" "}
                {formatMoney(commissionSummary?.totalReversed)} reversed
              </span>
            </div>
            <div className="agent-filter-row">
              <select value={commissionEventType} onChange={(e) => setCommissionEventType(e.target.value)}>
                <option value="">All events</option>
                <option value="deposit">Deposits</option>
                <option value="bet_ggr">Bet GGR</option>
              </select>
              <select value={commissionStatus} onChange={(e) => setCommissionStatus(e.target.value)}>
                <option value="">All status</option>
                <option value="pending">Pending</option>
                <option value="credited">Credited</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            {commissionsLoading ? (
              <p className="agent-empty">Loading commission history...</p>
            ) : commissions.length === 0 ? (
              <p className="agent-empty">No commission events yet.</p>
            ) : (
              <ul className="agent-commission-list">
                {commissions.map((row) => (
                  <li key={String(row.id)}>
                    <div>
                      <strong>{formatMoney(row.commissionAmount)}</strong>
                      <span>
                        {EVENT_LABELS[row.eventType] || row.eventType} · {splitLabel(row.metadata)} ·{" "}
                        {row.player?.name || "Player"}
                      </span>
                    </div>
                    <div className="agent-commission-meta">
                      <span className={`agent-status-pill status-${row.status}`}>{row.status}</span>
                      <time>{formatDate(row.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {commissionPagination.totalPages > 1 ? (
              <div className="agent-pagination-row">
                <button type="button" disabled={commissionPage <= 1} onClick={() => loadCommissions(commissionPage - 1)}>
                  Previous
                </button>
                <span>Page {commissionPage} of {commissionPagination.totalPages}</span>
                <button
                  type="button"
                  disabled={commissionPage >= commissionPagination.totalPages}
                  onClick={() => loadCommissions(commissionPage + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

          <p className="agent-footnote">
            Read-only partner view. Admin manages rates and approvals on the back office. Also see{" "}
            <Link href="/referral">Invite &amp; Earn</Link> for player referrals.
          </p>
        </>
      ) : null}

      <BottomNav />
    </main>
  );
}

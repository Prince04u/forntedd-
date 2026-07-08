"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getDeposits } from "@/lib/walletApi";
import ProofPreviewModal from "@/components/wallet/ProofPreviewModal";

const METHOD_FILTERS = [
  { id: "all", label: "All" },
  { id: "innate", label: "Innate UPI-QR" },
  { id: "expert", label: "Expert UPI-QR" },
];

const STATUS_FILTERS = [
  { id: "All", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const formatStatus = (status) => {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getMethodMeta = (method) => {
  const id = (method || "").toLowerCase();
  if (id.includes("expert")) return { icon: "💳", label: "Expert UPI-QR" };
  if (id.includes("innate")) return { icon: "📱", label: "Innate UPI-QR" };
  if (id.includes("paytm")) return { icon: "💠", label: "PAYTM" };
  if (id.includes("arpay")) return { icon: "🅰️", label: "ARPay" };
  return { icon: "💰", label: method || "UPI" };
};

export default function DepositHistoryPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState([]);
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [proofPreview, setProofPreview] = useState(null);

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDeposits();
      setDeposits(res.data || []);
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
    loadDeposits();
  }, [router, loadDeposits]);

  const hasActiveFilters =
    methodFilter !== "all" || statusFilter !== "All" || Boolean(dateFilter);

  const resetFilters = () => {
    setMethodFilter("all");
    setStatusFilter("All");
    setDateFilter("");
  };

  const filtered = deposits.filter((d) => {
    const method = (d.method || "").toLowerCase();
    const matchMethod =
      methodFilter === "all" ||
      (methodFilter === "innate" && method.includes("innate")) ||
      (methodFilter === "expert" && method.includes("expert"));
    const matchStatus = statusFilter === "All" || d.status === statusFilter;
    const matchDate =
      !dateFilter ||
      new Date(d.createdAt).toISOString().slice(0, 10) === dateFilter;
    return matchMethod && matchStatus && matchDate;
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
        <Link href="/wallet/deposit" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Deposit history</h1>
        <button
          type="button"
          className="withdraw-history-refresh"
          onClick={loadDeposits}
          disabled={loading}
          aria-label="Refresh history"
        >
          ↻
        </button>
      </header>

      <section className="withdraw-history-toolbar">
        <div className="withdraw-history-toolbar-meta">
          <span className="withdraw-history-count">
            {loading ? "Loading..." : `${filtered.length} deposit${filtered.length === 1 ? "" : "s"}`}
          </span>
          {hasActiveFilters ? (
            <button type="button" className="withdraw-history-reset" onClick={resetFilters}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="withdraw-history-toolbar-fields withdraw-history-toolbar-fields--triple">
          <select
            className="withdraw-history-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filter by method"
          >
            {METHOD_FILTERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id === "all" ? "All methods" : item.label}
              </option>
            ))}
          </select>
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

      {loading && deposits.length === 0 ? (
        <div className="withdraw-history-empty">
          <div className="withdraw-history-empty-icon">↻</div>
          <p>Loading deposit history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="withdraw-history-empty">
          <div className="withdraw-history-empty-icon">📜</div>
          <p>No deposits found</p>
          <span className="withdraw-history-empty-hint">
            {methodFilter !== "all" || statusFilter !== "All" || dateFilter
              ? "Try changing filters or pick another date."
              : "Your deposit requests will appear here."}
          </span>
          <Link href="/wallet/deposit" className="withdraw-history-empty-link">
            New deposit
          </Link>
        </div>
      ) : (
        <ul className="withdraw-history-list">
          {filtered.map((d) => {
            const methodMeta = getMethodMeta(d.method);

            return (
              <li key={d._id} className="withdraw-history-card">
                <div className="withdraw-history-card-icon">{methodMeta.icon}</div>
                <div className="withdraw-history-card-body">
                  <div className="withdraw-history-card-top">
                    <strong>₹{formatAmount(d.amount)}</strong>
                    <span className={`withdraw-history-status ${d.status}`}>
                      {formatStatus(d.status)}
                    </span>
                  </div>
                  <span className="withdraw-history-method">{methodMeta.label}</span>
                  {d.reference ? (
                    <span className="withdraw-history-account">UTR · {d.reference}</span>
                  ) : null}
                  {d.hasProof || d.proofUrl ? (
                    <button
                      type="button"
                      className="withdraw-history-proof-btn"
                      onClick={() =>
                        setProofPreview({
                          depositId: d._id,
                          proofUrl: d.proofKind === "legacy" ? d.proofUrl : null,
                          title: `Deposit proof · ₹${formatAmount(d.amount)}`,
                        })
                      }
                    >
                      View payment proof
                    </button>
                  ) : (
                    <span className="withdraw-history-no-proof">No proof uploaded</span>
                  )}
                  <small>{new Date(d.createdAt).toLocaleString("en-IN")}</small>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ProofPreviewModal
        open={Boolean(proofPreview)}
        depositId={proofPreview?.depositId}
        proofUrl={proofPreview?.proofUrl}
        title={proofPreview?.title}
        onClose={() => setProofPreview(null)}
      />
    </main>
  );
}

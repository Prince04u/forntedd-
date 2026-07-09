"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getDeposits } from "@/lib/walletApi";
import ProofPreviewModal from "@/components/wallet/ProofPreviewModal";

const formatAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getDeterministicOrderNo = (d) => {
  if (!d || !d.createdAt || !d._id) return "RC20260709234605811095156a";
  const date = new Date(d.createdAt);
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
  const suffix = String(d._id).slice(-10).toLowerCase();
  return `RC${stamp}${suffix}`;
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    alert("Order number copied!");
  } catch {
    /* ignore */
  }
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

  const filtered = deposits.filter((d) => {
    const channel = (d.channel || "").toLowerCase();
    const matchMethod =
      methodFilter === "all" ||
      (methodFilter === "trc20" && channel.includes("trc20")) ||
      (methodFilter === "bep20" && channel.includes("bep20"));
    const matchStatus = statusFilter === "All" || d.status === statusFilter;
    const matchDate =
      !dateFilter ||
      new Date(d.createdAt).toISOString().slice(0, 10) === dateFilter;
    return matchMethod && matchStatus && matchDate;
  });

  const handleSubmitReceipt = (d) => {
    const isBep20 = String(d.channel).toUpperCase() === "BEP20";
    const methodId = isBep20 ? "usdt_bep20" : "usdt_trc20";
    const channelId = isBep20 ? "usdt-bep20" : "usdt-trc20";
    const rate = 98;
    const usdtAmount = Math.round((d.amount / rate) * 100) / 100;
    const params = new URLSearchParams({
      amount: String(usdtAmount),
      method: methodId,
      channel: channelId,
      inr: String(d.amount),
    });
    window.open(`/wallet/deposit/pay?${params.toString()}`, "_blank");
  };

  if (!mounted) {
    return (
      <main style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <main style={{ background: "#111111", minHeight: "100vh", color: "#ffffff", padding: "1.5rem 1rem", fontFamily: "sans-serif", maxWidth: "480px", margin: "0 auto", position: "relative" }}>
      
      {/* HEADER */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <Link href="/wallet/deposit" style={{ color: "#ffffff", textDecoration: "none", fontSize: "2rem", padding: "0.25rem 0.5rem" }} aria-label="Back">
          ‹
        </Link>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>Deposit history</h1>
        <button onClick={loadDeposits} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.3rem", cursor: "pointer", padding: "0.25rem" }} aria-label="Refresh">
          ↻
        </button>
      </header>

      {/* METHOD FILTER HORIZONTAL TABS */}
      <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
        <button onClick={() => setMethodFilter("all")} style={{
          background: methodFilter === "all" ? "#D4AF37" : "#1a1a1e",
          color: methodFilter === "all" ? "#000" : "#ffffff",
          border: methodFilter === "all" ? "none" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
          fontWeight: "bold",
          cursor: "pointer",
          whiteSpace: "nowrap"
        }}>
          All
        </button>
        <button onClick={() => setMethodFilter("trc20")} style={{
          background: methodFilter === "trc20" ? "#D4AF37" : "#1a1a1e",
          color: methodFilter === "trc20" ? "#000" : "#ffffff",
          border: methodFilter === "trc20" ? "none" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
          fontWeight: "bold",
          cursor: "pointer",
          whiteSpace: "nowrap"
        }}>
          USDT-TRC20
        </button>
        <button onClick={() => setMethodFilter("bep20")} style={{
          background: methodFilter === "bep20" ? "#D4AF37" : "#1a1a1e",
          color: methodFilter === "bep20" ? "#000" : "#ffffff",
          border: methodFilter === "bep20" ? "none" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
          fontWeight: "bold",
          cursor: "pointer",
          whiteSpace: "nowrap"
        }}>
          USDT-BEP20
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ flex: 1, background: "#1a1a1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", padding: "0.75rem", outline: "none", fontSize: "0.85rem" }}
          aria-label="Filter by status"
        >
          <option value="All">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ flex: 1, background: "#1a1a1e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff", padding: "0.75rem", outline: "none", fontSize: "0.85rem" }}
          aria-label="Filter by date"
        />
      </div>

      {/* CARDS LIST CONTAINER */}
      {loading && deposits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#888" }}>
          <p>Loading deposit history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#888" }}>
          <p style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>No deposits found</p>
          <span style={{ fontSize: "0.82rem" }}>Your deposit transactions will appear here.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((d) => {
            const orderNo = getDeterministicOrderNo(d);
            const isPending = d.status === "pending";

            return (
              <div key={d._id} style={{ background: "#1a1a1e", border: "1px solid rgba(212, 175, 55, 0.15)", borderRadius: "14px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 4px 15px rgba(0,0,0,0.15)" }}>
                
                {/* TOP HEADER */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ background: "rgba(212, 175, 55, 0.12)", color: "#D4AF37", border: "1px solid rgba(212, 175, 55, 0.3)", padding: "3px 9px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold" }}>
                    Deposit
                  </span>
                  <span style={{
                    color: d.status === "approved" ? "#00a685" : d.status === "rejected" ? "#ef4444" : "#ffb020",
                    fontSize: "0.85rem",
                    fontWeight: "bold"
                  }}>
                    {d.status === "approved" ? "Completed" : d.status === "rejected" ? "Rejected" : "To Be Paid"}
                  </span>
                </div>

                {/* DETAILS ROWS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px", borderTop: "1px solid #1e1e1e", paddingTop: "9px", marginTop: "2px" }}>
                  
                  {/* BALANCE */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <span style={{ color: "#888888" }}>Balance</span>
                    <span style={{ color: "var(--theme-gold-bright, #D4AF37)", fontWeight: "bold" }}>₹{formatAmount(d.amount)}</span>
                  </div>

                  {/* TYPE */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <span style={{ color: "#888888" }}>Type</span>
                    <span style={{ color: "#dddddd" }}>
                      {String(d.channel).toUpperCase() === "BEP20" ? "Binance-USDT (BEP20)" : "TronPay-USDT (TRC20)"}
                    </span>
                  </div>

                  {/* TIME */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <span style={{ color: "#888888" }}>Time</span>
                    <span style={{ color: "#dddddd" }}>{new Date(d.createdAt).toLocaleString("en-IN")}</span>
                  </div>

                  {/* ORDER NUMBER */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <span style={{ color: "#888888" }}>Order number</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#cccccc", fontFamily: "monospace", fontSize: "0.82rem" }}>{orderNo}</span>
                      <button onClick={() => copyText(orderNo)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }} aria-label="Copy Order ID">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </div>

                </div>


              </div>
            );
          })}
        </div>
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

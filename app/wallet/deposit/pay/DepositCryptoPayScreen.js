"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import DepositProofUploadField from "@/components/wallet/DepositProofUploadField";
import { buildDepositOrderNo, formatUsdtAmount } from "@/lib/depositCrypto";
import { requestDeposit } from "@/lib/walletApi";
import "./deposit-pay.css";

const CRYPTO_ORDER_TIMEOUT_SEC = 60 * 60; // 60 minutes countdown

const formatTimerParts = (seconds) => {
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { hh, mm, ss };
};

const formatInr = (value) =>
  Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  } catch {
    /* ignore */
  }
};

export default function DepositCryptoPayScreen({
  amountUsdt,
  inrAmount,
  methodId,
  channelId,
  channelLabel,
  paymentDetails,
  maintenanceMode,
  maintenanceMessage,
  blocksDeposit,
  onBackHref = "/wallet/deposit",
}) {
  const [orderNo] = useState(() => buildDepositOrderNo());
  const [remainingSec, setRemainingSec] = useState(CRYPTO_ORDER_TIMEOUT_SEC);
  const [reference, setReference] = useState("");
  const [proofPath, setProofPath] = useState("");
  const [proofPreviewUrl, setProofPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const trimmedReference = reference.trim();
  const hasValidReference = trimmedReference.length >= 6; // USDT hash formats are flexible
  const hasValidProof = Boolean(proofPath);
  const walletAddress = paymentDetails?.walletAddress || "";
  const networkLabel = paymentDetails?.networkLabel || "TRON(TRC-20)";

  const canSubmit =
    amountUsdt > 0 &&
    inrAmount > 0 &&
    walletAddress &&
    hasValidReference &&
    hasValidProof &&
    !loading &&
    !maintenanceMode &&
    !blocksDeposit;

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const time = useMemo(() => formatTimerParts(remainingSec), [remainingSec]);

  const handleDeposit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await requestDeposit({
        amount: inrAmount,
        cryptoAmount: amountUsdt,
        orderNo,
        method: `${methodId}-${channelId}`,
        reference: trimmedReference,
        proofUrl: proofPath,
      });
      setSuccess({
        amountUsdt,
        inrAmount,
        reference: trimmedReference,
        orderNo,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Deposit request failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="arupi-pay-page arupi-success-page" style={{ background: "#080808", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <section className="arupi-ref-card" style={{ background: "#121212", border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", maxWidth: "480px", width: "100%", padding: "2.5rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", color: "#ffffff", textAlign: "center" }}>
          <div className="arupi-success-icon" style={{ width: "64px", height: "64px", background: "rgba(0,166,133,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#00a685", fontSize: "2rem", marginBottom: "1.5rem" }}>✓</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0 0 0.5rem", color: "#ffffff" }}>Request received</h2>
          <p style={{ fontSize: "0.95rem", color: "#cccccc", margin: "0 0 1.5rem" }}>
            Your deposit of <strong style={{ color: "#fbbf24" }}>{formatUsdtAmount(success.amountUsdt)} USDT</strong> (₹{formatInr(success.inrAmount)}) is pending admin review.
          </p>
          <p className="arupi-success-meta" style={{ fontSize: "0.85rem", color: "#aaaaaa", background: "#1c1c1c", padding: "0.5rem 1rem", borderRadius: "8px", margin: "0 0 2rem", border: "1px solid #333" }}>Order: {success.orderNo}</p>
          <div className="arupi-success-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <Link href="/" className="arupi-success-primary" style={{ background: "#00a685", color: "#ffffff", padding: "0.85rem", borderRadius: "10px", fontWeight: "bold", textDecoration: "none" }}>
              Back to home
            </Link>
            <Link href="/wallet/deposit/history" className="arupi-success-secondary" style={{ background: "#222222", color: "#ffffff", border: "1px solid #333", padding: "0.85rem", borderRadius: "10px", fontWeight: "bold", textDecoration: "none" }}>
              View deposit history
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="arupi-pay-page" style={{ background: "#080808", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem" }}>
      {maintenanceMode ? (
        <div className="arupi-pay-error" style={{ background: "#fee2e2", color: "#dc2626", padding: "1rem", borderRadius: "10px", margin: "1rem 0", maxWidth: "480px", width: "100%" }}>{maintenanceMessage || "Deposits unavailable."}</div>
      ) : null}

      <div className="arupi-ref-card" style={{ background: "#121212", border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", maxWidth: "480px", width: "100%", padding: "2rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", color: "#ffffff" }}>
        
        {/* USDT LOGO ACCENT */}
        <div className="arupi-usdt-icon-wrapper" style={{ width: "60px", height: "60px", background: "#00a685", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,166,133,0.15)" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17 9H13V15H11V9H7V7H17V9Z" fill="white" />
          </svg>
        </div>

        {/* AMOUNT */}
        <div className="arupi-ref-amount" style={{ fontSize: "2rem", fontWeight: "800", color: "#fbbf24", marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>{formatUsdtAmount(amountUsdt)}.00 USDT</span>
          <button type="button" onClick={() => copyText(String(amountUsdt))} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }} aria-label="Copy Amount">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>

        {/* NETWORK */}
        <div className="arupi-ref-network" style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#a9a9a9", marginTop: "4px" }}>
          Network - {networkLabel}
        </div>

        {/* WARNING ALERT */}
        <div className="arupi-ref-warning" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", borderRadius: "10px", padding: "0.85rem", textAlign: "left", fontSize: "0.85rem", width: "100%", marginTop: "1rem", display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "1.1rem", lineHeight: "1" }}>⚠️</span>
          <span>The amount received will be subject to the actual transfer amount, not less than {formatUsdtAmount(amountUsdt)}.00 USDT</span>
        </div>

        {/* ORDER ID ROW */}
        <div className="arupi-ref-order" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#a9a9a9", marginTop: "1rem" }}>
          <span>No.{orderNo}</span>
          <button type="button" onClick={() => copyText(orderNo)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "2px" }} aria-label="Copy Order ID">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a9a9a9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>

        {/* RECIPIENT WALLET SECTION */}
        <div className="arupi-ref-recipient-label" style={{ fontSize: "0.9rem", color: "#a9a9a9", fontWeight: "bold", marginTop: "1.5rem", width: "100%", textAlign: "center" }}>
          Recipient's wallet address:
        </div>

        {/* QR CODE BOX */}
        <div className="arupi-qr-frame" style={{ background: "#ffffff", padding: "10px", border: "1px solid #333", borderRadius: "16px", display: "flex", justifyContent: "center", marginTop: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {paymentDetails?.qrCodeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={paymentDetails.qrCodeUrl} alt="Deposit QR Code" style={{ width: "180px", height: "180px", objectFit: "contain" }} />
          ) : walletAddress ? (
            <QRCodeCanvas value={walletAddress} size={180} level="M" includeMargin />
          ) : (
            <p style={{ color: "#888", fontSize: "0.9rem" }}>Loading address...</p>
          )}
        </div>

        {/* WALLET ADDRESS ROW */}
        <div className="arupi-ref-address-row" style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", justifyContent: "center", marginTop: "14px" }}>
          <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#ffffff", background: "#1c1c1c", padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #333", overflowWrap: "anywhere", textAlign: "center", maxWidth: "85%" }}>
            {walletAddress}
          </span>
          <button type="button" onClick={() => copyText(walletAddress)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }} aria-label="Copy Address">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>

        {/* COUNTDOWN TIMER */}
        <div className="arupi-ref-timer-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "1.5rem" }}>
          <div className="time-values" style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fbbf24", letterSpacing: "1px" }}>
            {time.hh} : {time.mm} : {time.ss}
          </div>
          <div className="time-labels" style={{ fontSize: "0.68rem", color: "#a9a9a9", display: "flex", gap: "26px", textTransform: "uppercase", marginTop: "2px", fontWeight: "bold" }}>
            <span>Hour</span>
            <span>Minute</span>
            <span>Second</span>
          </div>
        </div>

        {/* TIPS SECTION */}
        <div className="arupi-ref-tips" style={{ width: "100%", textAlign: "left", fontSize: "0.82rem", color: "#a9a9a9", marginTop: "1.5rem", borderTop: "1px dashed #333", paddingTop: "1rem" }}>
          <h3 style={{ fontWeight: "bold", color: "#ffffff", fontSize: "0.88rem", margin: "0 0 8px" }}>Tips:</h3>
          <ol style={{ paddingLeft: "14px", margin: "0", display: "flex", flexDirection: "column", gap: "6px", listStyleType: "decimal" }}>
            <li>This channel only supports <strong>USDT-TRC20</strong> recharge.</li>
            <li>The recharge address is a <strong>one-time address</strong>, please do not save it or transfer it repeatedly.</li>
            <li>The amount received will be subject to the actual transfer amount, not less than <strong>{formatUsdtAmount(amountUsdt)}.00 USDT</strong>.</li>
            <li>Please complete the transfer within the countdown time.</li>
          </ol>
        </div>

      </div>

      {/* TXID INPUT AND UPLOAD FORM CONTAINER */}
      <div className="arupi-submission-box" style={{ background: "#121212", border: "1px solid rgba(212, 175, 55, 0.2)", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", maxWidth: "480px", width: "100%", padding: "1.5rem", marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem", color: "#ffffff" }}>
        
        {/* TXID FIELD */}
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#ffffff", margin: "0 0 4px" }}>• Input TxID / Paste TxID</h2>
          <p style={{ fontSize: "0.75rem", color: "#f87171", margin: "0 0 8px" }}>If you do not submit the transaction hash, your deposit will fail.</p>
          <div className="arupi-utr-field" style={{ display: "flex", border: "1px solid #333", borderRadius: "10px", overflow: "hidden", background: "#1c1c1c" }}>
            <input
              type="text"
              placeholder="Paste transaction hash / TxID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{ flex: 1, border: "none", background: "transparent", padding: "0.75rem", fontSize: "0.85rem", color: "#ffffff", outline: "none" }}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setReference(text.trim());
                } catch {
                  setError("Could not paste from clipboard");
                }
              }}
              style={{ background: "#00a685", color: "#ffffff", border: "none", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: "bold", cursor: "pointer" }}
            >
              Paste
            </button>
          </div>
        </div>

        {/* SCREENSHOT FIELD */}
        <div>
          <h2 style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#ffffff", margin: "0 0 4px" }}>• Upload payment screenshot</h2>
          <p style={{ fontSize: "0.75rem", color: "#f87171", margin: "0 0 10px" }}>Payment screenshot is mandatory. Deposits without proof will not be processed.</p>
          <DepositProofUploadField
            proofPath={proofPath}
            previewUrl={proofPreviewUrl}
            disabled={loading}
            onProofChange={(nextPath, nextPreviewUrl) => {
              setProofPath(nextPath);
              setProofPreviewUrl(nextPreviewUrl);
            }}
          />
        </div>

        {error ? <div style={{ color: "#f87171", fontSize: "0.8rem", textAlign: "center" }}>{error}</div> : null}

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
          <Link href={onBackHref} style={{ flex: 1, textDecoration: "none", background: "#222222", color: "#ffffff", border: "1px solid #333", padding: "0.85rem", borderRadius: "10px", fontWeight: "bold", textAlign: "center", fontSize: "0.9rem" }}>
            Cancel
          </Link>
          <button
            type="button"
            className="arupi-pay-submit"
            disabled={!canSubmit}
            onClick={handleDeposit}
            style={{ flex: 2, border: "none", background: canSubmit ? "#00a685" : "#222222", color: canSubmit ? "#ffffff" : "#666666", padding: "0.85rem", borderRadius: "10px", fontWeight: "bold", cursor: canSubmit ? "pointer" : "not-allowed", fontSize: "0.9rem", border: canSubmit ? "none" : "1px solid #333" }}
          >
            {loading
              ? "Submitting..."
              : !hasValidProof
                ? "Submit (screenshot required)"
                : !hasValidReference
                  ? "Submit (TxID required)"
                  : "Submit"}
          </button>
        </div>

      </div>
    </main>
  );
}

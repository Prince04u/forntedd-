"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import DepositProofUploadField from "@/components/wallet/DepositProofUploadField";
import { buildDepositOrderNo, formatUsdtAmount } from "@/lib/depositCrypto";
import { requestDeposit } from "@/lib/walletApi";
import "./deposit-pay.css";

const CRYPTO_ORDER_TIMEOUT_SEC = 60 * 60;

const formatTimer = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const formatInr = (value) =>
  Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
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
  const hasValidReference = trimmedReference.length >= 20;
  const hasValidProof = Boolean(proofPath);
  const walletAddress = paymentDetails?.walletAddress || "";
  const networkLabel = paymentDetails?.networkLabel || "Tron (TRC20)";

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

  const timerHint = useMemo(() => {
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;
    return `Please pay within ${minutes} minutes and ${seconds} seconds`;
  }, [remainingSec]);

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
      <main className="arupi-pay-page arupi-success-page">
        <header className="arupi-pay-header">
          <span className="arupi-pay-back" />
          <h1>Payment submitted</h1>
          <span />
        </header>
        <section className="arupi-success-card">
          <div className="arupi-success-icon">✓</div>
          <h2>Request received</h2>
          <p>
            Your deposit of <strong>{formatUsdtAmount(success.amountUsdt)} USDT</strong> (₹
            {formatInr(success.inrAmount)}) is pending admin review.
          </p>
          <p className="arupi-success-meta">Order: {success.orderNo}</p>
          <div className="arupi-success-actions">
            <Link href="/wallet/deposit/history" className="arupi-success-primary">
              View deposit history
            </Link>
            <Link href="/wallet" className="arupi-success-secondary">
              Back to wallet
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="arupi-pay-page">
      <header className="arupi-pay-header">
        <Link href={onBackHref} className="arupi-pay-back" aria-label="Back">
          ‹
        </Link>
        <h1>{channelLabel || "USDT Deposit"}</h1>
        <Link href="/account" className="arupi-pay-support">
          Customer Service
        </Link>
      </header>

      {maintenanceMode ? (
        <div className="arupi-pay-error">{maintenanceMessage || "Deposits unavailable."}</div>
      ) : null}

      <section className="arupi-pay-block">
        <div className="arupi-order-row">
          <span>Order No:</span>
          <strong>{orderNo}</strong>
        </div>
      </section>

      <section className="arupi-pay-block arupi-usdt-amount-card">
        <div className="arupi-usdt-amount">
          <strong>{formatUsdtAmount(amountUsdt)}</strong>
          <span>(USDT)</span>
        </div>
        <p className="arupi-usdt-inr-note">Wallet credit: ₹{formatInr(inrAmount)}</p>
        <button type="button" className="arupi-copy-btn" onClick={() => copyText(String(amountUsdt))}>
          Copy
        </button>
      </section>

      <section className="arupi-pay-block">
        <div className="arupi-qr-box arupi-crypto-qr-box">
          <span className="arupi-network-badge">{networkLabel}</span>
          <div className="arupi-qr-frame">
            {walletAddress ? (
              <QRCodeCanvas value={walletAddress} size={220} level="M" includeMargin />
            ) : (
              <p>Loading address...</p>
            )}
          </div>
          <div className="arupi-address-field">
            <input type="text" readOnly value={walletAddress} aria-label="Wallet address" />
          </div>
          <button type="button" className="arupi-copy-btn" onClick={() => copyText(walletAddress)}>
            Copy
          </button>
          <div className="arupi-crypto-timer">
            <strong className={remainingSec <= 300 ? "urgent" : ""}>{formatTimer(remainingSec)}</strong>
            <small>{timerHint}</small>
          </div>
        </div>
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Input TxID / Paste TxID</h2>
        <p className="arupi-utr-warning">If you do not submit the transaction hash, your deposit will fail.</p>
        <div className={`arupi-utr-field ${hasValidReference ? "valid" : ""}`}>
          <input
            type="text"
            placeholder="Paste TRC20 transaction hash"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <button
            type="button"
            className="arupi-utr-paste"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setReference(text.trim());
              } catch {
                setError("Could not paste from clipboard");
              }
            }}
          >
            Paste
          </button>
        </div>
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Upload payment screenshot</h2>
        <p className="arupi-utr-warning">
          Payment screenshot is mandatory. Deposits without proof will not be processed.
        </p>
        <DepositProofUploadField
          proofPath={proofPath}
          previewUrl={proofPreviewUrl}
          disabled={loading}
          onProofChange={(nextPath, nextPreviewUrl) => {
            setProofPath(nextPath);
            setProofPreviewUrl(nextPreviewUrl);
          }}
        />
      </section>

      {error ? <div className="arupi-pay-error">{error}</div> : null}

      <div className="arupi-pay-footer">
        <Link href={onBackHref} className="arupi-pay-cancel">
          Cancel
        </Link>
        <button
          type="button"
          className={`arupi-pay-submit ${canSubmit ? "ready" : ""}`}
          disabled={!canSubmit}
          onClick={handleDeposit}
        >
          {loading
            ? "Submitting..."
            : !hasValidProof
              ? "Submit (screenshot required)"
              : hasValidReference
                ? "Submit"
                : "Submit (TxID not entered)"}
        </button>
      </div>
    </main>
  );
}

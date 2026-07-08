"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { getToken } from "@/lib/auth";
import { buildUpiPaymentUri, openPaymentApp } from "@/lib/depositPayment";
import { getDepositPayment, getDepositOptions } from "@/lib/platformApi";
import DepositProofUploadField from "@/components/wallet/DepositProofUploadField";
import { requestDeposit } from "@/lib/walletApi";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import DepositCryptoPayScreen from "./DepositCryptoPayScreen";
import "./deposit-pay.css";

const ORDER_TIMEOUT_SEC = 15 * 60;

const PAY_APP_OPTIONS = [
  {
    id: "paytm",
    label: "Paytm",
    theme: "blue",
    logo: "/design/deposit/paytm-logo.svg",
  },
  {
    id: "phonepe",
    label: "PhonePe",
    theme: "purple",
    logo: "/design/deposit/phonepe-logo.svg",
  },
];

const QR_STEPS = [
  "Please use another device to scan the QR code with your payment app",
  "If you scan the QR code from this device's gallery, the payment amount may be limited (≤2000).",
];

const formatTimer = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const formatAmount = (value) =>
  Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function DepositPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const amountParam = Number(searchParams.get("amount"));
  const inrParam = Number(searchParams.get("inr"));
  const methodIdParam = searchParams.get("method") || "";
  const channelId = searchParams.get("channel") || "";

  const [activeMethodId, setActiveMethodId] = useState(methodIdParam);
  const [selectedPayApp, setSelectedPayApp] = useState("paytm");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [reference, setReference] = useState("");
  const [proofPath, setProofPath] = useState("");
  const [proofPreviewUrl, setProofPreviewUrl] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [payMethods, setPayMethods] = useState([]);
  const [channelLabel, setChannelLabel] = useState("");
  const [channelLimits, setChannelLimits] = useState({ min: 1, max: 100000 });
  const [remainingSec, setRemainingSec] = useState(ORDER_TIMEOUT_SEC);
  const [optionsReady, setOptionsReady] = useState(false);
  const [isCryptoFlow, setIsCryptoFlow] = useState(false);
  const [cryptoInrAmount, setCryptoInrAmount] = useState(0);

  const activeMethod = payMethods.find((item) => item.id === activeMethodId) || payMethods[0];
  const trimmedReference = reference.trim();
  const hasValidReference = trimmedReference.length >= 6;
  const amountValid =
    Number.isFinite(amountParam) &&
    amountParam >= channelLimits.min &&
    amountParam <= channelLimits.max;

  const upiUri = useMemo(() => {
    if (!paymentDetails?.upiId) return "";
    return buildUpiPaymentUri({
      upiId: paymentDetails.upiId,
      payeeName: paymentDetails.payeeName,
      amount: amountParam > 0 ? amountParam : undefined,
      note: paymentDetails.note,
    });
  }, [paymentDetails, amountParam]);

  const hasValidProof = Boolean(proofPath);
  const canSubmit =
    amountValid &&
    hasValidReference &&
    hasValidProof &&
    activeMethod &&
    !loading &&
    !maintenanceMode &&
    !blocksAction("deposit");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!amountParam || !methodIdParam || !channelId) {
      router.replace("/wallet/deposit");
      return;
    }

    Promise.all([getDepositOptions(), getDepositPayment(channelId)])
      .then(([optionsRes, paymentRes]) => {
        const methods = (optionsRes?.data?.methods || []).filter((item) => item.enabled);
        const channels = optionsRes?.data?.channels || [];
        const channel = channels.find((item) => item.id === channelId && item.enabled);
        const method = methods.find((item) => item.id === methodIdParam);

        if (!method || !channel) {
          router.replace("/wallet/deposit");
          return;
        }

        if (amountParam < channel.min || amountParam > channel.max) {
          router.replace("/wallet/deposit");
          return;
        }

        const crypto = paymentRes?.data?.type === "crypto";
        if (crypto) {
          const resolvedInr =
            Number.isFinite(inrParam) && inrParam > 0
              ? inrParam
              : Math.round(amountParam * (paymentRes?.data?.usdtRate || channel.usdtRate || 88) * 100) /
                100;
          if (!resolvedInr) {
            router.replace("/wallet/deposit");
            return;
          }
          setIsCryptoFlow(true);
          setCryptoInrAmount(resolvedInr);
        }

        setPayMethods(methods);
        setActiveMethodId(methodIdParam);
        setChannelLabel(channel.label);
        setChannelLimits({ min: channel.min, max: channel.max });
        setPaymentDetails(paymentRes?.data || null);
        setOptionsReady(true);
      })
      .catch(() => {
        router.replace("/wallet/deposit");
      });
  }, [amountParam, inrParam, methodIdParam, channelId, router]);

  useEffect(() => {
    if (!optionsReady) return undefined;
    const timer = setInterval(() => {
      setRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [optionsReady]);

  const copyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(amountParam));
    } catch {
      /* ignore */
    }
  };

  const handlePayAppClick = (appId) => {
    setSelectedPayApp(appId);
    if (!paymentDetails?.upiId) {
      setError("Payment details not loaded. Please try again.");
      return;
    }
    if (!amountValid) {
      setError("Invalid payment amount.");
      return;
    }
    setError("");
    openPaymentApp(appId, {
      upiId: paymentDetails.upiId,
      payeeName: paymentDetails.payeeName,
      amount: amountParam,
      note: paymentDetails.note,
    });
  };

  const pasteReference = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setReference(text.trim());
    } catch {
      setError("Could not paste from clipboard");
    }
  };

  const handleDeposit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await requestDeposit({
        amount: amountParam,
        method: `${activeMethodId}-${channelId}`,
        reference: trimmedReference,
        proofUrl: proofPath,
      });
      setSuccess({ amount: amountParam, reference: trimmedReference });
    } catch (err) {
      setError(err.response?.data?.message || "Deposit request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!optionsReady) {
    return (
      <main className="arupi-pay-page">
        <div className="wallet-screen-loading">Loading payment...</div>
      </main>
    );
  }

  if (isCryptoFlow) {
    return (
      <DepositCryptoPayScreen
        amountUsdt={amountParam}
        inrAmount={cryptoInrAmount}
        methodId={methodIdParam}
        channelId={channelId}
        channelLabel={paymentDetails?.channelLabel || channelLabel}
        paymentDetails={paymentDetails}
        maintenanceMode={maintenanceMode}
        maintenanceMessage={maintenanceMessage}
        blocksDeposit={blocksAction("deposit")}
      />
    );
  }

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
            Your deposit of <strong>₹{formatAmount(success.amount)}</strong> is pending admin review.
          </p>
          <div className="arupi-success-actions">
            <Link href="/wallet/deposit/history" className="arupi-success-primary">
              View deposit history
            </Link>
            <button type="button" className="arupi-success-secondary" onClick={() => router.push("/wallet")}>
              Back to wallet
            </button>
          </div>
        </section>
      </main>
    );
  }

  const pageTitle = paymentDetails?.channelLabel || channelLabel || "UPI Pay";
  const selectedPayAppLabel = PAY_APP_OPTIONS.find((item) => item.id === selectedPayApp)?.label || "Paytm";
  const reminders = [
    "Do not pay for the same link repeatedly!",
    `${selectedPayAppLabel} is wake up support!`,
  ];

  return (
    <main className="arupi-pay-page">
      <header className="arupi-pay-header">
        <Link href="/wallet/deposit" className="arupi-pay-back" aria-label="Back">
          ‹
        </Link>
        <h1>{pageTitle}</h1>
        <Link href="/account" className="arupi-pay-support">
          Customer Service
        </Link>
      </header>

      {maintenanceMode ? (
        <div className="arupi-pay-error">{maintenanceMessage || "Deposits unavailable."}</div>
      ) : null}

      <div className="arupi-pay-amount-bar">
        <div className="arupi-pay-amount-left">
          <strong>₹{formatAmount(amountParam)}</strong>
          <button type="button" className="arupi-pay-copy-icon" onClick={copyAmount} aria-label="Copy amount">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
              <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </button>
          {activeMethod?.badge ? (
            <span className="arupi-pay-discount">Discount {activeMethod.badge}</span>
          ) : null}
        </div>
        <div className="arupi-pay-timer">{formatTimer(remainingSec)}</div>
      </div>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Choose a payment method to pay</h2>
        <div className="arupi-method-grid">
          {PAY_APP_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`arupi-method-card ${item.theme} ${selectedPayApp === item.id ? "active" : ""}`}
              onClick={() => handlePayAppClick(item.id)}
            >
              <div className="arupi-method-card-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.logo} alt="" className="arupi-method-logo" width={36} height={36} />
                <span className="arupi-method-name">{item.label}</span>
              </div>
              <strong className="arupi-method-support">Wake up support</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Use Mobile Scan code to pay</h2>
        <div className="arupi-qr-box">
          <div className="arupi-qr-frame">
            {upiUri ? (
              <QRCodeCanvas value={upiUri} size={220} level="M" includeMargin />
            ) : (
              <p>Loading QR...</p>
            )}
          </div>
          <ol className="arupi-qr-steps">
            {QR_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Input UTR/ Paste UTR</h2>
        <p className="arupi-utr-warning">If you do not back fill UTR/ paste UTR, 100% will fail.</p>
        <div className={`arupi-utr-field ${hasValidReference ? "valid" : ""}`}>
          <input
            type="text"
            placeholder="Input 12 digits here"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            inputMode="numeric"
          />
          <button type="button" className="arupi-utr-paste" onClick={pasteReference}>
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

      <section className="arupi-pay-block">
        <h2 className="arupi-section-title">Important reminder:</h2>
        <ol className="arupi-reminders">
          {reminders.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ol>
      </section>

      {error ? <div className="arupi-pay-error">{error}</div> : null}

      <div className="arupi-pay-footer">
        <Link href="/wallet/deposit" className="arupi-pay-cancel">
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
                : "Submit (UTR not entered)"}
        </button>
      </div>
    </main>
  );
}

export default function DepositPayPage() {
  return (
    <Suspense
      fallback={
        <main className="arupi-pay-page">
          <div className="wallet-screen-loading">Loading payment...</div>
        </main>
      }
    >
      <DepositPayContent />
    </Suspense>
  );
}

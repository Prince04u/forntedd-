"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { buildUpiPaymentUri } from "@/lib/depositPayment";

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

export default function DepositUpiPanel({ payment, amount, methodLabel = "UPI", compact = false }) {
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const upiUri = useMemo(() => {
    if (!payment?.upiId) return "";
    return buildUpiPaymentUri({
      upiId: payment.upiId,
      payeeName: payment.payeeName,
      amount: Number(amount) > 0 ? amount : undefined,
      note: payment.note,
    });
  }, [payment, amount]);

  const parsedAmount = Number(amount);
  const scanLabel = (methodLabel || "UPI").toUpperCase();

  if (compact) {
    if (!payment?.upiId) {
      return (
        <aside className="deposit-qr-card deposit-qr-card--empty">
          <p>Select a channel to load QR code</p>
        </aside>
      );
    }

    return (
      <aside className="deposit-qr-card">
        <p className="deposit-qr-title">Scan &amp; pay using {scanLabel}</p>
        <div className="deposit-qr-frame">
          <QRCodeCanvas value={upiUri} size={132} level="M" includeMargin className="deposit-upi-qr" />
        </div>
        <div className="deposit-qr-upi">
          <span className="deposit-qr-upi-label">UPI ID:</span>
          <span className="deposit-qr-upi-value">{payment.upiId}</span>
          <button
            type="button"
            className="deposit-qr-copy"
            onClick={() => copyText(payment.upiId, setToast)}
          >
            Copy
          </button>
        </div>
        {parsedAmount > 0 ? (
          <p className="deposit-qr-amount">₹{parsedAmount.toLocaleString("en-IN")}</p>
        ) : null}
        {toast ? <div className="deposit-upi-toast">{toast}</div> : null}
      </aside>
    );
  }

  if (!payment?.upiId) return null;

  return (
    <section className="deposit-upi-panel">
      <div className="deposit-upi-head">
        <h2>Pay via UPI</h2>
        <span>{payment.channelLabel}</span>
      </div>

      <div className="deposit-upi-qr-wrap">
        <QRCodeCanvas value={upiUri} size={200} level="M" includeMargin className="deposit-upi-qr" />
        {parsedAmount > 0 && (
          <p className="deposit-upi-qr-amount">Scan to pay ₹{parsedAmount.toLocaleString("en-IN")}</p>
        )}
      </div>

      <dl className="deposit-upi-details">
        <div>
          <dt>Payee name</dt>
          <dd>{payment.payeeName}</dd>
        </div>
        <div>
          <dt>UPI ID</dt>
          <dd className="deposit-upi-id-row">
            <span>{payment.upiId}</span>
            <button type="button" onClick={() => copyText(payment.upiId, setToast)}>
              Copy
            </button>
          </dd>
        </div>
        {parsedAmount > 0 && (
          <div>
            <dt>Amount</dt>
            <dd className="deposit-upi-id-row">
              <span>₹{parsedAmount.toLocaleString("en-IN")}</span>
              <button type="button" onClick={() => copyText(String(parsedAmount), setToast)}>
                Copy
              </button>
            </dd>
          </div>
        )}
      </dl>

      <ol className="deposit-upi-steps">
        <li>Scan QR or pay manually to the UPI ID above.</li>
        <li>Transfer the exact amount you enter below.</li>
        <li>Submit UTR/reference and payment screenshot.</li>
      </ol>

      {toast && <div className="deposit-upi-toast">{toast}</div>}
    </section>
  );
}

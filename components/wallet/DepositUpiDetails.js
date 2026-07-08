"use client";

import { useState } from "react";

export default function DepositUpiDetails({ payment, amount }) {
  const [toast, setToast] = useState("");

  if (!payment?.upiId) {
    return (
      <div className="deposit-upi-details-card empty">
        <p>Payment details will appear after you select a channel.</p>
      </div>
    );
  }

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied!");
      setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const parsedAmount = Number(amount);

  return (
    <div className="deposit-upi-details-card">
      <div className="deposit-upi-details-head">
        <span className="deposit-upi-details-icon">💳</span>
        <strong>Pay to this UPI ID</strong>
      </div>

      <div className="deposit-upi-details-row">
        <span className="deposit-upi-details-label">Payee</span>
        <span className="deposit-upi-details-value">{payment.payeeName}</span>
      </div>

      <div className="deposit-upi-details-row highlight">
        <span className="deposit-upi-details-label">UPI ID</span>
        <div className="deposit-upi-details-copy-row">
          <span className="deposit-upi-details-value">{payment.upiId}</span>
          <button type="button" className="deposit-upi-details-copy" onClick={() => copyText(payment.upiId)}>
            Copy
          </button>
        </div>
      </div>

      {parsedAmount > 0 ? (
        <div className="deposit-upi-details-row">
          <span className="deposit-upi-details-label">Amount</span>
          <div className="deposit-upi-details-copy-row">
            <span className="deposit-upi-details-value">₹{parsedAmount.toLocaleString("en-IN")}</span>
            <button type="button" className="deposit-upi-details-copy" onClick={() => copyText(String(parsedAmount))}>
              Copy
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <p className="deposit-upi-details-toast">{toast}</p> : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchDepositProofBlobUrl } from "@/lib/depositProofApi";

export default function ProofPreviewModal({
  open,
  proofUrl,
  depositId,
  title = "Payment proof",
  onClose,
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setImageUrl("");
      setError("");
      setLoading(false);
      return undefined;
    }

    let blobUrl = "";
    let cancelled = false;

    const load = async () => {
      if (proofUrl) {
        setImageUrl(proofUrl);
        return;
      }

      if (!depositId) {
        setError("Proof not available");
        return;
      }

      setLoading(true);
      setError("");
      try {
        blobUrl = await fetchDepositProofBlobUrl(depositId);
        if (!cancelled) setImageUrl(blobUrl);
      } catch {
        if (!cancelled) setError("Could not load payment proof");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, proofUrl, depositId]);

  if (!open) return null;

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div
        className="wallet-modal wallet-modal-wide deposit-proof-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="deposit-proof-modal-head">
          <h3>{title}</h3>
          <button type="button" className="deposit-proof-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="deposit-proof-modal-empty">Loading proof...</p>
        ) : error ? (
          <p className="deposit-proof-modal-empty">{error}</p>
        ) : imageUrl ? (
          <div className="deposit-proof-modal-image-wrap">
            <img src={imageUrl} alt="Payment proof screenshot" className="deposit-proof-modal-image" />
          </div>
        ) : (
          <p className="deposit-proof-modal-empty">No proof screenshot uploaded.</p>
        )}

        <button type="button" className="auth-btn-primary deposit-proof-modal-done" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken } from "@/lib/auth";
import { readImageAsDataUrl } from "@/lib/imageUtils";
import { getKycStatus, uploadKycDocument } from "@/lib/userApi";

const STATUS_LABELS = {
  not_submitted: "Not submitted",
  pending: "Under review",
  verified: "Verified",
  rejected: "Rejected",
};

const STATUS_CLASS = {
  not_submitted: "neutral",
  pending: "pending",
  verified: "success",
  rejected: "danger",
};

export default function KycPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [kyc, setKyc] = useState(null);
  const [activeDoc, setActiveDoc] = useState("pan");
  const [documentNumber, setDocumentNumber] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  const loadKyc = useCallback(async () => {
    try {
      const res = await getKycStatus();
      setKyc(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load KYC status");
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadKyc();
  }, [router, loadKyc]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setPreviewUrl(dataUrl);
      setSelectedFile(file);
    } catch (err) {
      setPreviewUrl("");
      setSelectedFile(null);
      setError(err.message || "Failed to read image");
    }
  };

  const clearSelectedFile = () => {
    setPreviewUrl("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError("Please upload a clear photo of your document");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await uploadKycDocument({
        documentType: activeDoc,
        documentNumber: documentNumber.trim(),
        file: selectedFile,
      });
      setSuccess("Document submitted. We will review it shortly.");
      setDocumentNumber("");
      clearSelectedFile();
      await loadKyc();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit document");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="account-page">
        <div className="account-loading">Loading...</div>
      </main>
    );
  }

  const overallStatus = kyc?.verificationStatus || "pending";

  return (
    <main className="account-page account-sub-page">
      <AccountSubHeader title="KYC verification" />

      <section className="account-kyc-summary">
        <div className={`account-kyc-badge ${STATUS_CLASS[overallStatus] || "neutral"}`}>
          {STATUS_LABELS[overallStatus] || overallStatus}
        </div>
        <p>
          Submit PAN and Aadhaar for verification. Required for higher withdrawals and partner
          commission in some cases.
        </p>
      </section>

      <div className="account-kyc-tabs">
        {["pan", "aadhaar"].map((docType) => {
          const doc = kyc?.[docType];
          return (
            <button
              key={docType}
              type="button"
              className={`account-kyc-tab ${activeDoc === docType ? "active" : ""}`}
              onClick={() => setActiveDoc(docType)}
            >
              {docType.toUpperCase()}
              <span className={`account-kyc-tab-status ${STATUS_CLASS[doc?.status] || "neutral"}`}>
                {STATUS_LABELS[doc?.status] || "Not submitted"}
              </span>
            </button>
          );
        })}
      </div>

      {overallStatus === "verified" ? (
        <div className="account-form-success account-kyc-verified">
          Your KYC is verified. No further action needed.
        </div>
      ) : (
        <form className="account-form" onSubmit={handleSubmit}>
          {error && <div className="account-form-error">{error}</div>}
          {success && <div className="account-form-success">{success}</div>}

          {kyc?.[activeDoc]?.remarks ? (
            <div className="account-form-error">
              Admin note: {kyc[activeDoc].remarks}
            </div>
          ) : null}

          <section className="account-form-section">
            <label className="account-form-label" htmlFor="kyc-number">
              {activeDoc === "pan" ? "PAN number" : "Aadhaar number (last 4 digits visible after submit)"}
            </label>
            <input
              id="kyc-number"
              className="account-form-input"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder={activeDoc === "pan" ? "ABCDE1234F" : "XXXX XXXX 1234"}
              required
            />
          </section>

          <section className="account-form-section">
            <label className="account-form-label">Document photo</label>
            {previewUrl ? (
              <div className="account-kyc-preview-wrap">
                <img src={previewUrl} alt="Document preview" className="account-kyc-preview" />
                <button type="button" className="account-kyc-remove" onClick={clearSelectedFile}>
                  Remove photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="account-kyc-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Choose document photo
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              onChange={handleFileChange}
              className="account-kyc-file-input"
            />
            <p className="account-form-hint">JPG, PNG or WebP · max 600 KB after compression</p>
          </section>

          <button
            type="submit"
            className="account-form-submit"
            disabled={loading || kyc?.[activeDoc]?.status === "pending"}
          >
            {kyc?.[activeDoc]?.status === "pending" ? "Under review" : loading ? "Submitting..." : "Submit document"}
          </button>
        </form>
      )}

      <p className="account-form-hint account-kyc-help">
        Need help? <Link href="/support" className="account-inline-link">Contact support</Link>
      </p>
    </main>
  );
}

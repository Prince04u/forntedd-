"use client";

import { useRef, useState } from "react";
import { uploadDepositProof } from "@/lib/depositProofApi";

const MAX_SIZE_BYTES = 600 * 1024;

export default function DepositProofUploadField({
  proofPath,
  previewUrl,
  onProofChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file || disabled) return;

    if (!file.type?.startsWith("image/")) {
      setError("Only image files are allowed (JPG, PNG, WebP).");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("Image is too large. Maximum size is 600 KB.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const res = await uploadDepositProof(file);
      const nextPath = res?.data?.proofPath;
      if (!nextPath) {
        throw new Error("Upload failed");
      }
      onProofChange(nextPath, URL.createObjectURL(file));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not upload screenshot");
      onProofChange("", null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clearProof = () => {
    setError("");
    onProofChange("", null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="arupi-proof-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="arupi-proof-input"
        disabled={disabled || uploading}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {previewUrl ? (
        <div className="arupi-proof-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Payment screenshot preview" />
          <div className="arupi-proof-preview-actions">
            <button
              type="button"
              className="arupi-proof-change-btn"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Change screenshot"}
            </button>
            <button
              type="button"
              className="arupi-proof-clear-btn"
              disabled={disabled || uploading}
              onClick={clearProof}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`arupi-proof-upload-btn ${proofPath ? "valid" : ""}`}
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading screenshot..." : "Upload payment screenshot"}
        </button>
      )}

      {proofPath ? <p className="arupi-proof-uploaded">Screenshot uploaded</p> : null}
      {error ? <p className="arupi-proof-error">{error}</p> : null}
    </div>
  );
}

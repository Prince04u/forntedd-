"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function InviteQrModal({ open, onClose, shareUrl, code, title = "Scan to join" }) {
  const canvasRef = useRef(null);

  if (!open || !shareUrl) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `invite-${code || "qr"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="invite-qr-overlay" onClick={onClose}>
      <div className="invite-qr-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="invite-qr-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3>{title}</h3>
        {code ? <p className="invite-qr-code">{code}</p> : null}
        <div className="invite-qr-canvas-wrap" ref={canvasRef}>
          <QRCodeCanvas value={shareUrl} size={220} level="M" includeMargin />
        </div>
        <p className="invite-qr-url">{shareUrl}</p>
        <div className="invite-qr-actions">
          <button type="button" className="primary" onClick={handleDownload}>
            Download QR
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

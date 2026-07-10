"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { getToken } from "@/lib/auth";

export default function RechargePopupWrapper({ children }) {
  const [popup, setPopup] = useState(null); // { amount } or null

  useEffect(() => {
    if (typeof window === "undefined" || !getToken()) return;

    let activeSocket = null;
    let cancelled = false;

    const handleWalletUpdated = (data) => {
      // If the event payload indicates a recharge was added successfully
      if (data?.rechargeAdded && typeof data.amount === "number") {
        setPopup({ amount: data.amount });
      }
    };

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;
      
      socket.emit("join:user");
      socket.on("wallet:updated", handleWalletUpdated);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", handleWalletUpdated);
      }
    };
  }, []);

  // Auto close popup after 4.5 seconds
  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(() => {
      setPopup(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [popup]);

  return (
    <>
      {children}
      {popup && (
        <div className="ln-recharge-popup-overlay">
          <div className="ln-recharge-popup-card">
            <div className="ln-recharge-popup-header">
              <span className="ln-recharge-popup-icon">✓</span>
              <h3>Recharge Added Successfully</h3>
            </div>
            <div className="ln-recharge-popup-body">
              <span className="ln-recharge-popup-label">Amount Credited</span>
              <span className="ln-recharge-popup-val">₹{popup.amount.toFixed(2)}</span>
            </div>
            <button 
              type="button" 
              className="ln-recharge-popup-btn"
              onClick={() => setPopup(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

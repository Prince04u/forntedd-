"use client";

import { usePlatformStatus } from "./PlatformStatusProvider";

const ACTION_LABELS = {
  bet: "Betting",
  deposit: "Deposits",
  withdraw: "Withdrawals",
};

export default function MaintenanceBanner() {
  const { maintenanceMode, message, loading, blockedActions } = usePlatformStatus();

  if (loading || !maintenanceMode) return null;

  const blockedLabel = (blockedActions || [])
    .map((action) => ACTION_LABELS[action] || action)
    .join(", ");

  return (
    <div className="platform-maintenance-banner" role="status" aria-live="polite">
      <strong>Maintenance mode</strong>
      <span>{message || "Platform is under maintenance. Some actions are temporarily unavailable."}</span>
      {blockedLabel ? <em className="platform-maintenance-blocked">Unavailable: {blockedLabel}</em> : null}
    </div>
  );
}

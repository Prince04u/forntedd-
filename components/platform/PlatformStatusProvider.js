"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPlatformStatus } from "@/lib/platformApi";

const PlatformStatusContext = createContext({
  maintenanceMode: false,
  message: "",
  blockedActions: [],
  loading: true,
  refresh: () => {},
});

const POLL_MS = 30000;

export function PlatformStatusProvider({ children }) {
  const [status, setStatus] = useState({
    maintenanceMode: false,
    message: "",
    blockedActions: [],
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getPlatformStatus();
      setStatus({
        maintenanceMode: Boolean(res.data?.maintenanceMode),
        message: res.data?.message || "",
        blockedActions: res.data?.blockedActions || [],
      });
    } catch {
      // Keep last known status if the poll fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...status,
      loading,
      refresh,
      blocksAction: (action) => status.maintenanceMode && status.blockedActions.includes(action),
    }),
    [status, loading, refresh]
  );

  return (
    <PlatformStatusContext.Provider value={value}>{children}</PlatformStatusContext.Provider>
  );
}

export function usePlatformStatus() {
  return useContext(PlatformStatusContext);
}

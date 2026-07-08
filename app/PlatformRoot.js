"use client";

import MaintenanceBanner from "@/components/platform/MaintenanceBanner";
import { PlatformStatusProvider } from "@/components/platform/PlatformStatusProvider";

export default function PlatformRoot({ children }) {
  return (
    <PlatformStatusProvider>
      <MaintenanceBanner />
      {children}
    </PlatformStatusProvider>
  );
}

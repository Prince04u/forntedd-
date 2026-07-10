"use client";

import MaintenanceBanner from "@/components/platform/MaintenanceBanner";
import { PlatformStatusProvider } from "@/components/platform/PlatformStatusProvider";
import RechargePopupWrapper from "@/components/platform/RechargePopupWrapper";

export default function PlatformRoot({ children }) {
  return (
    <PlatformStatusProvider>
      <MaintenanceBanner />
      <RechargePopupWrapper>{children}</RechargePopupWrapper>
    </PlatformStatusProvider>
  );
}

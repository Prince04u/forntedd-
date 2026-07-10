"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import AviatorGameScreen from "@/components/aviator/AviatorGameScreen";

export default function AviatorPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
  }, [router]);

  if (!mounted) {
    return (
      <div style={{ background: "#1b1c20", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
        Loading Aviator...
      </div>
    );
  }

  return <AviatorGameScreen />;
}

"use client";

import { useEffect, useState } from "react";
import { getToken, getUser, setToken, setUser } from "@/lib/auth";
import { getProfile } from "@/lib/userApi";
import { useRouter } from "next/navigation";
import AviatorGameScreen from "@/components/aviator/AviatorGameScreen";

export default function AviatorPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check for query parameter token
      const searchParams = new URLSearchParams(window.location.search);
      const tokenParam = searchParams.get("token");

      if (tokenParam) {
        setToken(tokenParam);
      }

      // 2. Validate current token
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await getProfile();
        if (res?.success && res?.data) {
          setUser(res.data);
        } else {
          throw new Error("Unable to load profile data.");
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setAuthError("Session validation failed. Redirecting to login...");
        router.replace("/login");
        return;
      }

      setMounted(true);
    };

    initAuth();
  }, [router]);

  if (authError) {
    return (
      <div style={{ background: "#1b1c20", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", fontFamily: "sans-serif" }}>
        {authError}
      </div>
    );
  }

  if (!mounted) {
    return (
      <div style={{ background: "#1b1c20", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
        Loading Aviator...
      </div>
    );
  }

  return <AviatorGameScreen />;
}

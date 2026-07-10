"use client";

import { useEffect, useState } from "react";
import { getToken, getUser, setToken, setUser } from "@/lib/auth";
import { getProfile } from "@/lib/userApi";
import { useRouter } from "next/navigation";
import LimboGameScreen from "@/components/limbo/LimboGameScreen";

export default function LimboPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Grab token from query parameters
      const searchParams = new URLSearchParams(window.location.search);
      const tokenParam = searchParams.get("token");

      if (tokenParam) {
        setToken(tokenParam);
      }

      // 2. Validate current session token
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
          throw new Error("Unable to retrieve user info.");
        }
      } catch (err) {
        console.error("Limbo auth failed:", err);
        setAuthError("Session expired. Please log in again.");
        router.replace("/login");
        return;
      }

      setMounted(true);
    };

    initAuth();
  }, [router]);

  if (authError) {
    return (
      <div style={{ background: "#0b0c10", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", fontFamily: "sans-serif" }}>
        {authError}
      </div>
    );
  }

  if (!mounted) {
    return (
      <div style={{ background: "#0b0c10", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
        Loading Limbo...
      </div>
    );
  }

  return <LimboGameScreen />;
}

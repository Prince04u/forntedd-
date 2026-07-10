"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function AviatorPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [iframeUrl, setIframeUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      router.replace("/login");
      return;
    }

    const userId = user._id || user.id || "guest";
    // Construct the Spribe Aviator iframe URL dynamically
    // Using https to prevent mixed-content blocking on secure vercel deployment
    const url = `https://aviator-next.spirbegaming.com/?user=${userId}&token=${token}&lang=en&currency=INR&operator=neon_8`;
    setIframeUrl(url);
  }, [router]);

  if (!mounted || !iframeUrl) {
    return (
      <div style={{ background: "#1b1c20", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
        Loading Aviator...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1b1c20", overflow: "hidden", fontFamily: "sans-serif" }}>
      {/* Header bar with back button to match website aesthetics */}
      <header style={{ display: "flex", alignItems: "center", height: "50px", padding: "0 1rem", background: "#121316", borderBottom: "1px solid #23262d" }}>
        <Link href="/" style={{ color: "#fff", textDecoration: "none", fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          ‹ <span style={{ fontSize: "1rem", color: "#999" }}>Back</span>
        </Link>
        <h1 style={{ flex: 1, textAlign: "center", fontSize: "1.1rem", fontWeight: "bold", color: "#e5c37e", margin: 0, paddingRight: "40px" }}>
          Aviator
        </h1>
      </header>

      {/* Spribe Aviator Game Frame */}
      <div style={{ flex: 1, width: "100%", height: "calc(100vh - 50px)", position: "relative" }}>
        <iframe
          src={iframeUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="autoplay; fullscreen; microphone; camera"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}


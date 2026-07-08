"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendOtp, verifyOtp } from "@/lib/wingoApi";
import { saveAuth } from "@/lib/auth";

export default function OtpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ mobile: "", otp: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendOtp(form.mobile);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await verifyOtp(form);
      saveAuth(res.data);
      router.push("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="card">
        <h1>OTP Login</h1>
        <p>Login with mobile OTP (check backend console in dev)</p>
        {error && <div className="error">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>Mobile</label>
              <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
            </div>
            <button className="btn" disabled={loading}>{loading ? "Sending..." : "Send OTP"}</button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>OTP</label>
              <input value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Name (optional)</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <button className="btn" disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</button>
          </form>
        )}

        <p className="footer-link"><Link href="/login">Password Login</Link></p>
      </div>
    </main>
  );
}

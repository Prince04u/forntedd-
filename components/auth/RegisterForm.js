"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import AuthTopBar from "@/components/auth/AuthTopBar";
import PhoneInput from "@/components/auth/PhoneInput";
import PasswordInput from "@/components/auth/PasswordInput";

import { register as registerRequest } from "@/lib/authApi";
import { saveAuth } from "@/lib/auth";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    mobile: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });

  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");

    if (ref) {
      setForm((prev) => ({
        ...prev,
        inviteCode: ref.trim().toUpperCase(),
      }));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agree) {
      setError("Please agree to Privacy Agreement");
      return;
    }

    setLoading(true);

    try {
      const response = await registerRequest({
        name: `Player${form.mobile.slice(-4) || "01"}`,
        mobile: form.mobile,
        password: form.password,
        referralCode:
          form.inviteCode.trim().toUpperCase() || undefined,
      });

      saveAuth(response.data);
      router.push("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">

     <AuthTopBar />

<div className="register-wrapper">

  <section className="premium-hero">

    <div className="premium-hero-content">

      <div className="premium-left">

        <h1 className="hero-title">
          Create Your
          <br />
          Account
        </h1>

        <p className="hero-subtitle">
          Create your account by phone number or email
        </p>

      </div>

      <div className="premium-right">

        <img
          src="/images/register-hero.png"
          alt="Register"
          className="hero-image"
        />

      </div>

    </div>

  </section>

  <section className="premium-form-section">

    <div className="register-card">

      <div className="register-tabs">

        <button
          type="button"
          className="active"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          Phone
        </button>

        <button
          type="button"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px" }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Email
        </button>

      </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="premium-form"
          >

            <div className="premium-field">

              <label htmlFor="mobile" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "var(--theme-gold-bright)" }}>
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                Phone Number
              </label>

              <PhoneInput
                value={form.mobile}
                onChange={handleChange}
              />

            </div>

            <div className="premium-field">

              <label htmlFor="password" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "var(--theme-gold-bright)" }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password
              </label>

              <PasswordInput
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                minLength={6}
              />
            </div>

                     {/* Password Strength */}

            <div className="password-strength">
              <span>Password Strength</span>

              <div className="strength-bars">
                <span className={form.password.length >= 2 ? "active" : ""}></span>
                <span className={form.password.length >= 4 ? "active" : ""}></span>
                <span className={form.password.length >= 6 ? "active" : ""}></span>
                <span className={form.password.length >= 8 ? "active" : ""}></span>
              </div>
            </div>

            {/* Confirm Password */}

            <div className="premium-field">
              <label htmlFor="confirmPassword" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "var(--theme-gold-bright)" }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Confirm Password
              </label>

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
                minLength={6}
              />
            </div>

            {/* Invite Code */}

            <div className="premium-field">
              <label htmlFor="inviteCode" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "14px", height: "14px", color: "var(--theme-gold-bright)" }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Invite Code <small style={{ marginLeft: "4px", color: "var(--theme-text-muted)" }}>(Optional)</small>
              </label>

              <input
                id="inviteCode"
                name="inviteCode"
                type="text"
                className="auth-input"
                value={form.inviteCode}
                onChange={handleChange}
                placeholder="Enter invite code"
                autoComplete="off"
              />
            </div>

            {/* Privacy */}

            <label className="premium-check">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />

              <span>
                I agree to the{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Agreement
                </Link>
              </span>
            </label>

            {/* Register Button */}

            <button
              className="premium-register-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {/* Login */}

           <Link
  href="/login"
  className="premium-login-btn"
>
  Already have an account?
  <strong> Login</strong>
</Link>

</form>

    </div>

  </section>

</div>

</main>

  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import PasswordInput from "@/components/auth/PasswordInput";
import { getToken } from "@/lib/auth";
import { changePassword } from "@/lib/authApi";

export default function SecurityPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("Password updated successfully");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="account-page">
        <div className="account-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="account-page account-sub-page">
      <AccountSubHeader title="Security" />

      <form className="account-form" onSubmit={handleSubmit}>
        {error && <div className="account-form-error">{error}</div>}
        {success && <div className="account-form-success">{success}</div>}

        <section className="account-form-section">
          <label className="account-form-label" htmlFor="current-password">
            Current password
          </label>
          <PasswordInput
            id="current-password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Current password"
            required
          />
        </section>

        <section className="account-form-section">
          <label className="account-form-label" htmlFor="new-password">
            New password
          </label>
          <PasswordInput
            id="new-password"
            name="newPassword"
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            placeholder="At least 6 characters"
            required
          />
        </section>

        <section className="account-form-section">
          <label className="account-form-label" htmlFor="confirm-password">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Repeat new password"
            required
          />
        </section>

        <button type="submit" className="account-form-submit" disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <section className="account-form-section account-form-footer-note">
        <p>Locked out?</p>
        <Link href="/support" className="account-inline-link">
          Contact support
        </Link>
      </section>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken, getUser, setUser } from "@/lib/auth";
import { getStoredAvatar, setStoredAvatar } from "@/lib/userPreferences";
import { getProfile, updateProfile } from "@/lib/userApi";

const AVATAR_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [mobileMasked, setMobileMasked] = useState("");
  const [avatar, setAvatar] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      const profile = res.data;
      setName(profile.name || "");
      setMobileMasked(profile.mobileMasked || "");
      const storedUser = getUser();
      if (storedUser) {
        setUser({ ...storedUser, ...profile });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load profile");
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setAvatar(getStoredAvatar() || "1");
    loadProfile();
  }, [router, loadProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await updateProfile({ name });
      setStoredAvatar(avatar);
      const storedUser = getUser();
      if (storedUser) {
        setUser({ ...storedUser, name });
      }
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="account-page">
      <AccountSubHeader title="Profile" backHref="/account" />

      <form className="account-form" onSubmit={handleSubmit}>
        {error && <div className="account-form-error">{error}</div>}
        {success && <div className="account-form-success">{success}</div>}

        <section className="account-form-section">
          <label className="account-form-label">Avatar</label>
          <div className="account-avatar-grid">
            {AVATAR_OPTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={`account-avatar-option ${avatar === item ? "active" : ""}`}
                onClick={() => setAvatar(item)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "44px" }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" style={{ color: avatar === item ? "var(--theme-gold, #D4AF37)" : "rgba(255,255,255,0.4)" }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        </section>

        <section className="account-form-section">
          <label className="account-form-label" htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            className="account-form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
          />
        </section>

        <section className="account-form-section">
          <label className="account-form-label">Mobile</label>
          <input className="account-form-input" value={mobileMasked} disabled />
          <p className="account-form-hint">Mobile number cannot be changed here.</p>
        </section>

        <button type="submit" className="account-form-submit" disabled={loading}>
          {loading ? "Saving..." : "Save changes"}
        </button>
      </form>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken, getUser, setUser } from "@/lib/auth";
import { getStoredAvatar, setStoredAvatar } from "@/lib/userPreferences";
import { getProfile, updateProfile } from "@/lib/userApi";

const AVATAR_OPTIONS = ["👤", "😎", "🎮", "💎", "🔥", "🎯", "🦁", "🐯"];

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [mobileMasked, setMobileMasked] = useState("");
  const [avatar, setAvatar] = useState("👤");
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
    setAvatar(getStoredAvatar());
    loadProfile();
  }, [router, loadProfile]);

  const handleSave = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await updateProfile({ name: name.trim() });
      setStoredAvatar(avatar);
      const storedUser = getUser();
      if (storedUser) {
        setUser({ ...storedUser, ...res.data });
      }
      setSuccess("Profile updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
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
      <AccountSubHeader title="Edit profile" />

      <form className="account-form" onSubmit={handleSave}>
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
              >
                {item}
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

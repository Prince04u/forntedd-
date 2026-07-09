"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/userApi";

const TYPE_ICONS = {
  win: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 2a4 4 0 0 0-4 4v5a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z"/></svg>
  ),
  deposit: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  withdraw: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h.01M12 4v12" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  ),
};

export default function NotificationsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadNotifications();
    markAllNotificationsRead().catch(() => {});
  }, [loadNotifications, router]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
    } catch {
      /* ignore */
    }
  };

  if (!mounted) return null;

  return (
    <main className="account-page">
      <AccountSubHeader title="Notifications" backHref="/account" />

      {error && <div className="account-form-error">{error}</div>}
      {loading && notifications.length === 0 ? (
        <div className="account-loading">Loading notifications...</div>
      ) : null}

      {!loading && notifications.length === 0 ? (
        <div className="account-empty-state">
          <span>🔔</span>
          <p>No notifications yet</p>
          <p className="account-form-hint">Wins, deposit updates, and alerts will appear here.</p>
        </div>
      ) : (
        <ul className="account-notification-list">
          {notifications.map((item) => (
            <li
              key={item.id}
              className={`account-notification-item ${item.isRead ? "read" : "unread"}`}
            >
              <div className="account-notification-icon">{TYPE_ICONS[item.type] || "🔔"}</div>
              <div className="account-notification-body">
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <time>{new Date(item.createdAt).toLocaleString("en-IN")}</time>
              </div>
              {!item.isRead ? (
                <button
                  type="button"
                  className="account-inline-btn"
                  onClick={() => handleMarkRead(item.id)}
                >
                  Read
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

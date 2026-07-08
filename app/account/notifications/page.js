"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AccountSubHeader from "@/components/account/AccountSubHeader";
import { getToken } from "@/lib/auth";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/userApi";

const TYPE_ICONS = {
  win: "🏆",
  deposit: "💳",
  withdraw: "💰",
  system: "📢",
  info: "🔔",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getNotifications({ limit: 50 });
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
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
  }, [router, loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
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
      <AccountSubHeader title="Notifications" />

      <div className="account-notifications-toolbar">
        <span>{unreadCount} unread</span>
        {unreadCount > 0 ? (
          <button type="button" className="account-inline-btn" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        ) : null}
      </div>

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

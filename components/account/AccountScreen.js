"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import AnnouncementsModal from "@/components/home/AnnouncementsModal";
import AccountSheet from "@/components/account/AccountSheet";
import AccountIcon from "@/components/account/AccountIcon";
import { getStoredAvatar } from "@/lib/userPreferences";
import { getAgentStatus } from "@/lib/agentApi";
import { clearAuth, getToken, getUser, isPartnerUser, setUser } from "@/lib/auth";
import { getBalance } from "@/lib/walletApi";
import { getNotifications, getProfile } from "@/lib/userApi";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getAnnouncements, getVipProgram } from "@/lib/platformApi";

const QUICK_ACTIONS = [
  { iconId: "wallet", label: "Wallet", href: "/wallet", glyph: "👛" },
  { iconId: "deposit", label: "Deposit", href: "/wallet/deposit", glyph: "+" },
  { iconId: "withdraw", label: "Withdraw", href: "/wallet", glyph: "↑" },
  { iconId: "vip", label: "VIP", href: "/account/vip", glyph: "◆", vipAction: true },
];

const HISTORY_ITEMS = [
  { iconId: "game-history", href: "/games/history", title: "Game History", sub: "My game history", color: "blue" },
  { iconId: "transaction", href: "/wallet/transactions", title: "Transaction", sub: "My transaction history", color: "green" },
  { iconId: "deposit-history", href: "/wallet/deposit/history", title: "Deposit", sub: "My deposit history", color: "red" },
  { iconId: "withdraw-history", href: "/wallet/withdraw/history", title: "Withdraw", sub: "My withdraw history", color: "orange" },
];

const KYC_LABELS = {
  pending: "KYC pending",
  verified: "KYC verified",
  rejected: "KYC rejected",
};

const BASE_SETTINGS_ITEMS = [
  { iconId: "edit-profile", label: "Edit profile", href: "/account/profile" },
  { iconId: "security", label: "Security", href: "/account/security" },
  { iconId: "kyc", label: "KYC verification", href: "/account/kyc" },
  { iconId: "notifications", label: "Notifications", href: "/account/notifications", showUnread: true },
  { iconId: "invite-friends", label: "Invite friends", href: "/referral" },
  { iconId: "gifts", label: "Gifts", href: "/account/gifts" },
  { iconId: "game-stats", label: "Game statistics", href: "/games/history" },
];

const SERVICE_ITEMS = [
  { iconId: "announcement", label: "Announcement", action: "announcement" },
  { iconId: "customer-service", label: "Customer Service", href: "/support" },
  { iconId: "feedback", label: "Feedback", href: "/account/feedback" },
  { iconId: "guide", label: "Beginner's Guide", href: "/account/guide" },
  { iconId: "about", label: "About us", href: "/about" },
];

export default function AccountScreen() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage } = usePlatformStatus();
  const [mounted, setMounted] = useState(false);
  const [user, setUserState] = useState(null);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [avatar, setAvatar] = useState("👤");
  const [unreadCount, setUnreadCount] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState("");
  const [announcementItems, setAnnouncementItems] = useState([]);
  const [announcementMarquee, setAnnouncementMarquee] = useState(null);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [vipProgram, setVipProgram] = useState(null);

  const loadBalance = useCallback(async () => {
    try {
      const res = await getBalance();
      setBalance(res.data.balance);
    } catch {
      setBalance(0);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      const profile = res.data;
      setUserState(profile);
      const storedUser = getUser();
      if (storedUser) {
        setUser({ ...storedUser, ...profile });
      }
    } catch {
      const storedUser = getUser();
      if (storedUser) setUserState(storedUser);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await getNotifications({ limit: 1 });
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  const syncPartnerAccess = useCallback(async () => {
    const storedUser = getUser();
    if (isPartnerUser(storedUser)) {
      setIsPartner(true);
      return;
    }

    try {
      const res = await getAgentStatus();
      const status = res.data;
      if (status?.isAgent) {
        setIsPartner(true);
        if (storedUser) {
          const nextUser = {
            ...storedUser,
            agentProfile: {
              id: status.id,
              status: status.status,
              agentType: status.agentType,
              agentCode: status.agentCode,
            },
          };
          setUser(nextUser);
          setUserState((prev) => ({ ...(prev || storedUser), ...nextUser }));
        }
        return;
      }
    } catch {
      // non-partner
    }

    setIsPartner(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setAvatar(getStoredAvatar());
    loadBalance();
    loadProfile();
    loadUnreadCount();
    syncPartnerAccess();

    let activeSocket = null;
    let cancelled = false;

    const onWalletUpdated = (data) => {
      if (typeof data?.balance === "number") {
        setBalance(data.balance);
      }
    };

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;
      socket.emit("join:user");
      socket.on("wallet:updated", onWalletUpdated);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", onWalletUpdated);
      }
    };
  }, [router, loadBalance, loadProfile, loadUnreadCount, syncPartnerAccess]);

  useEffect(() => {
    let cancelled = false;
    getAnnouncements()
      .then((res) => {
        if (cancelled) return;
        const items = res?.data?.items;
        if (Array.isArray(items)) {
          setAnnouncementItems(items);
        }
        const nextMarquee = res?.data?.marquee;
        if (nextMarquee?.text) {
          setAnnouncementMarquee(nextMarquee);
        } else if (nextMarquee === null) {
          setAnnouncementMarquee(null);
        }
      })
      .catch(() => {
        /* keep empty — AccountSheet shows fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVipProgram()
      .then((res) => {
        if (!cancelled) setVipProgram(res?.data || { enabled: false });
      })
      .catch(() => {
        if (!cancelled) setVipProgram({ enabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showVipUi = Boolean(vipProgram?.enabled);
  const showVipBadge = showVipUi && vipProgram?.showBadge !== false;
  const showVipQuickAction = showVipUi && vipProgram?.showQuickAction !== false;
  const vipLevelLabel = vipProgram?.defaultLevel || "VIP0";

  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((action) => !action.vipAction || showVipQuickAction),
    [showVipQuickAction]
  );

  const settingsItems = useMemo(() => {
    const base = [...BASE_SETTINGS_ITEMS];
    if (isPartner) {
      return [{ iconId: "partner", label: "Partner portal", href: "/agent" }, ...base];
    }
    return base;
  }, [isPartner]);

  const handleSettingsAction = (item) => {
    if (item.action === "coming-soon") {
      setSheet({ type: "coming-soon", text: item.comingSoonText });
      return;
    }
    if (item.action === "announcement") {
      setAnnouncementModalOpen(true);
    }
  };

  const handleServiceAction = (item) => {
    if (item.href) return;
    handleSettingsAction(item);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBalance(), loadProfile(), loadUnreadCount()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    disconnectSocket();
    clearAuth();
    router.replace("/login");
  };

  const copyUid = () => {
    if (user?.id) {
      navigator.clipboard.writeText(String(user.id));
      setToast("UID copied");
    }
  };

  if (!mounted) {
    return (
      <main className="account-page">
        <div className="account-loading">Loading...</div>
      </main>
    );
  }

  const displayName = user?.name || "Member";
  const uid = user?.id ? String(user.id).slice(-7) : "0000000";
  const lastLogin = user?.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : user?.createdAt
      ? new Date(user.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "—";
  const displayAvatar = avatar === "👤" ? "😎" : avatar;
  const kycStatus = user?.kycStatus || "pending";

  return (
    <main className="account-page">
      <section className="account-profile-header">
        <div className="account-profile-row">
          <Link href="/account/profile" className="account-avatar account-profile-link">
            {displayAvatar}
          </Link>
          <div className="account-profile-info">
            <div className="account-name-row">
              <Link href="/account/profile" className="account-profile-name-link">
                <h1>{displayName.toUpperCase()}</h1>
              </Link>
              {showVipBadge ? <span className="account-vip">{vipLevelLabel}</span> : null}
            </div>
            <button type="button" className="account-uid" onClick={copyUid}>
              UID {uid}
              <span className="account-uid-copy" aria-hidden="true">
                ⧉
              </span>
            </button>
            <p className="account-last-login">Last login: {lastLogin}</p>
            <Link href="/account/kyc" className={`account-kyc-pill ${kycStatus}`}>
              {KYC_LABELS[kycStatus] || kycStatus}
            </Link>
          </div>
        </div>
      </section>

      <section className="account-balance-card">
        <div className="account-balance-top">
          <span>Total balance</span>
          <button type="button" className="account-refresh" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh balance">
            <span className={refreshing ? "account-refresh-spin" : ""}>{refreshing ? "↻" : "↺"}</span>
          </button>
        </div>
        <div className="account-balance-amount">₹{balance.toFixed(2)}</div>
        <div className="account-quick-actions">
          {quickActions.map((action) => (
            <Link key={action.iconId} href={action.href} className="account-quick-item">
              <span className={`aq-icon aq-${action.iconId}`}>
                <span className="aq-glyph">{action.glyph}</span>
              </span>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="account-history-grid">
        {HISTORY_ITEMS.map((item) => (
          <Link key={item.title} href={item.href} className={`account-history-card ${item.color}`}>
            <span className="ah-icon">
              <AccountIcon id={item.iconId} size={24} className="ah-icon-img" />
            </span>
            <div className="account-history-copy">
              <strong>{item.title}</strong>
              <span>{item.sub}</span>
            </div>
            <span className="ah-chevron" aria-hidden="true">
              ›
            </span>
          </Link>
        ))}
      </section>

      <section className="account-settings-list">
        {settingsItems.map((item) =>
          item.href ? (
            <Link key={item.label} href={item.href} className="account-settings-item">
              <span className="as-left">
                <span className="as-icon">
                  <AccountIcon id={item.iconId} size={22} className="as-icon-img" />
                </span>
                {item.label}
              </span>
              <span className="as-right">
                {item.showUnread && unreadCount > 0 ? (
                  <span className="account-unread-badge">{unreadCount}</span>
                ) : null}
                <span className="as-chevron" aria-hidden="true">
                  ›
                </span>
              </span>
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              className="account-settings-item account-settings-button"
              onClick={() => handleSettingsAction(item)}
            >
              <span className="as-left">
                <span className="as-icon">
                  <AccountIcon id={item.iconId} size={22} className="as-icon-img" />
                </span>
                {item.label}
              </span>
              <span className="as-right">
                <span className="as-chevron" aria-hidden="true">
                  ›
                </span>
              </span>
            </button>
          )
        )}
      </section>

      <section className="account-service">
        <h2>SERVICE CENTER</h2>
        <div className="account-service-grid">
          {SERVICE_ITEMS.map((item) =>
            item.href ? (
              <Link key={item.label} href={item.href} className="account-service-item">
                <span className="account-service-icon">
                  <AccountIcon id={item.iconId} size={28} className="account-service-icon-img" />
                </span>
                <span>{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className="account-service-item"
                onClick={() => handleServiceAction(item)}
              >
                <span className="account-service-icon">
                  <AccountIcon id={item.iconId} size={28} className="account-service-icon-img" />
                </span>
                <span>{item.label}</span>
              </button>
            )
          )}
        </div>
      </section>

      {toast && <div className="account-toast">{toast}</div>}

      <AccountSheet
        sheet={sheet}
        onClose={() => setSheet(null)}
        maintenanceMessage={maintenanceMode ? maintenanceMessage : ""}
      />

      <AnnouncementsModal
        open={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        items={announcementItems}
        marquee={announcementMarquee}
        maintenanceMode={maintenanceMode}
        maintenanceMessage={maintenanceMessage}
      />

      <button type="button" className="account-logout" onClick={handleLogout}>
        <AccountIcon id="logout" size={18} className="account-logout-icon" />
        Logout
      </button>

      <BottomNav />
    </main>
  );
}

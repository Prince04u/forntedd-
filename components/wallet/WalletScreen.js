"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import WalletIcon from "@/components/wallet/WalletIcon";
import { getToken } from "@/lib/auth";
import { getBalance, getTransactions } from "@/lib/walletApi";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getSocket } from "@/lib/socket";

const ACTION_ITEMS = [
  {
    id: "deposit",
    iconId: "deposit",
    label: "Deposit",
    subtitle: "Add funds to your wallet",
    color: "yellow",
  },
  {
    id: "withdraw",
    iconId: "withdraw",
    label: "Withdraw",
    subtitle: "Withdraw funds from wallet",
    color: "blue",
  },
  {
    id: "dep-history",
    iconId: "deposit-history",
    label: "Deposit history",
    subtitle: "View all your deposit records",
    color: "red",
  },
  {
    id: "wd-history",
    iconId: "withdraw-history",
    label: "Withdrawal history",
    subtitle: "View all your withdrawal records",
    color: "green",
  },
];

export default function WalletScreen() {
  const router = useRouter();
  const { message: maintenanceMessage, blocksAction } = usePlatformStatus();
  const [balance, setBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        getBalance(),
        getTransactions({ limit: 50 }),
      ]);

      setBalance(balRes.data.balance);
      setLockedBalance(balRes.data.locked || 0);
      const txs = txRes.data.transactions || [];
      setTransactionCount(txRes.data?.pagination?.total ?? txs.length);

      const depositSum = txs
        .filter((t) => t.type === "deposit" && t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalDeposit(depositSum);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load wallet");
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    loadData();

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
  }, [loadData, router]);

  const handleAction = (id) => {
    setError("");
    setMessage("");
    if (id === "deposit") {
      if (blocksAction("deposit")) {
        setError(maintenanceMessage || "Deposits are temporarily unavailable.");
        return;
      }
      router.push("/wallet/deposit");
      return;
    }
    if (id === "dep-history") {
      router.push("/wallet/deposit/history");
      return;
    }
    if (id === "withdraw") {
      if (blocksAction("withdraw")) {
        setError(maintenanceMessage || "Withdrawals are temporarily unavailable.");
        return;
      }
      router.push("/wallet/withdraw");
      return;
    }
    if (id === "wd-history") {
      router.push("/wallet/withdraw/history");
    }
  };

  if (!mounted) {
    return (
      <main className="wallet-screen">
        <div className="wallet-screen-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="wallet-screen">
      <header className="wallet-screen-header">
        <Link href="/" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Wallet</h1>
        <span className="wallet-screen-header-spacer" aria-hidden />
      </header>

      {error && <div className="auth-error wallet-screen-msg">{error}</div>}
      {message && <div className="success-msg wallet-screen-msg">{message}</div>}

      <section className="wallet-hero-card">
        <div className="wallet-hero-icon-wrap">
          <WalletIcon id="hero" size={48} className="wallet-hero-icon" />
        </div>

        <div className="wallet-hero-balance-row">
          <span className="wallet-hero-label">Available balance</span>
          <strong className="wallet-hero-amount">
            {balanceVisible ? `₹ ${balance.toFixed(2)}` : "₹ ••••••"}
          </strong>
        </div>

        <button
          type="button"
          className="wallet-view-balance-btn"
          onClick={() => setBalanceVisible((visible) => !visible)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="wallet-view-balance-icon">
            <path
              d="M2.5 12C4.5 7.5 8 5 12 5s7.5 2.5 9.5 7c-2 4.5-5.5 7-9.5 7s-7.5-2.5-9.5-7Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          View balance
        </button>

        {lockedBalance > 0 && (
          <p className="wallet-hero-pending">
            ₹{lockedBalance.toFixed(2)} pending withdrawal
          </p>
        )}

        <div className="wallet-hero-stats">
          <Link href="/wallet/transactions" className="wallet-hero-stat-row wallet-hero-stat-link">
            <span className="wallet-stat-icon blue">
              <WalletIcon id="transactions" size={22} />
            </span>
            <div className="wallet-stat-copy">
              <strong>{transactionCount}</strong>
              <span>Transactions</span>
            </div>
          </Link>

          <div className="wallet-hero-stat-row">
            <span className="wallet-stat-icon yellow">
              <WalletIcon id="total-deposit" size={22} />
            </span>
            <div className="wallet-stat-copy">
              <strong>{totalDeposit.toFixed(0)}</strong>
              <span>Total deposit</span>
            </div>
          </div>
        </div>

        <Link href="/wallet/transactions" className="wallet-txn-view-all">
          View transaction history ›
        </Link>
      </section>

      <section className="wallet-actions">
        {ACTION_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`wallet-action-btn ${item.color}`}
            onClick={() => handleAction(item.id)}
          >
            <span className={`wallet-action-icon-ring ${item.color}`}>
              <WalletIcon id={item.iconId} size={26} className="wallet-action-icon" />
            </span>
            <span className="wallet-action-copy">
              <strong>{item.label}</strong>
              <span>{item.subtitle}</span>
            </span>
            <span className="wallet-action-chevron" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}

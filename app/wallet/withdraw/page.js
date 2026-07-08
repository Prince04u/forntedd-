"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import { convertUsdtToInr, formatUsdtAmount } from "@/lib/depositCrypto";
import { getBalance, getWithdrawals, getWithdrawContext, requestWithdraw } from "@/lib/walletApi";
import { parseWalletBalance } from "@/lib/walletBalance";
import {
  buildAccountDetailsForWithdraw,
  emptyWithdrawAccountsState,
  fetchWithdrawAccountsState,
  hasAccountsForMethod,
  selectWithdrawAccount,
  setWithdrawMethod,
} from "@/lib/withdrawAccounts";
import {
  formatWithdrawAmount,
  formatWithdrawStatus,
  getWithdrawAccountLine,
  getWithdrawItemDate,
  getWithdrawItemId,
  getWithdrawMethodMeta,
} from "@/lib/withdrawHistory";
import {
  buildWithdrawRules,
  getWithdrawLimitsForMethod,
  mergeWalletRules,
  maskAccountNumber,
} from "@/lib/withdrawRules";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getSocket } from "@/lib/socket";
import DepositIcon from "@/components/wallet/DepositIcon";

const WITHDRAW_METHODS = [
  { id: "bank", label: "BANK CARD", icon: "bank" },
  { id: "upi", label: "UPI", icon: "upi" },
  { id: "usdt", label: "USDT", icon: "usdt" },
];

const ACCOUNTS_PATH = "/wallet/withdraw/accounts";

const formatInr = (value) =>
  Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const maskUsdtAddress = (value = "") => {
  const trimmed = String(value).trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`;
};

export default function WithdrawPage() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();
  const [mounted, setMounted] = useState(false);
  const [accountsReady, setAccountsReady] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [method, setMethod] = useState("upi");
  const [amount, setAmount] = useState("");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [accountsState, setAccountsState] = useState(emptyWithdrawAccountsState());
  const [accounts, setAccounts] = useState({ bank: [], upi: [], usdt: [] });
  const [selectedIds, setSelectedIds] = useState({ bank: null, upi: null, usdt: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [recentWithdrawals, setRecentWithdrawals] = useState([]);
  const [walletRules, setWalletRules] = useState(null);
  const [withdrawStats, setWithdrawStats] = useState(null);

  const limits = getWithdrawLimitsForMethod(walletRules, method);
  const usdtRate = limits.usdtRate || 88;
  const parsedAmount = Number(amount);
  const parsedUsdtAmount = Number(usdtAmount);
  const maxAllowed = Math.min(availableBalance, limits.max);

  const methodAccounts = accounts[method] || [];
  const selectedAccount = useMemo(() => {
    const selectedId = selectedIds[method];
    return methodAccounts.find((item) => item.id === selectedId) || methodAccounts[0] || null;
  }, [methodAccounts, selectedIds, method]);

  const hasValidAccount = Boolean(selectedAccount);

  const withdrawInrAmount =
    method === "usdt"
      ? parsedAmount > 0
        ? parsedAmount
        : convertUsdtToInr(parsedUsdtAmount, usdtRate)
      : parsedAmount;

  const hasValidAmount =
    withdrawInrAmount >= limits.min &&
    withdrawInrAmount <= maxAllowed &&
    withdrawInrAmount <= limits.max;

  const receivedDisplay =
    method === "usdt" && parsedUsdtAmount > 0
      ? `${formatUsdtAmount(parsedUsdtAmount)} USDT`
      : `₹${hasValidAmount ? formatInr(withdrawInrAmount) : "0.00"}`;

  const canSubmit =
    hasValidAmount &&
    hasValidAccount &&
    limits.enabled !== false &&
    !loading &&
    !maintenanceMode &&
    !blocksAction("withdraw");

  const rules = useMemo(
    () => buildWithdrawRules({ method, limits, walletRules, stats: withdrawStats }),
    [method, limits, walletRules, withdrawStats]
  );

  const applyAccountsState = useCallback((state) => {
    setAccountsState(state);
    setAccounts({
      bank: state.bank || [],
      upi: state.upi || [],
      usdt: state.usdt || [],
    });
    setSelectedIds(state.selected || { bank: null, upi: null, usdt: null });
    return state;
  }, []);

  const refreshAccounts = useCallback(async () => {
    const state = await fetchWithdrawAccountsState();
    return applyAccountsState(state);
  }, [applyAccountsState]);

  const redirectToAddAccount = useCallback(
    (nextMethod) => {
      router.replace(`${ACCOUNTS_PATH}?method=${nextMethod}&return=/wallet/withdraw`);
    },
    [router]
  );

  const loadRecentWithdrawals = useCallback(async () => {
    try {
      const res = await getWithdrawals();
      setRecentWithdrawals((res.data || []).slice(0, 3));
    } catch {
      setRecentWithdrawals([]);
    }
  }, []);

  const loadWithdrawContext = useCallback(async () => {
    try {
      const res = await getWithdrawContext();
      setWalletRules(mergeWalletRules(res.data?.rules));
      setWithdrawStats(res.data?.stats || null);
    } catch {
      setWalletRules(mergeWalletRules(null));
      setWithdrawStats(null);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await getBalance();
      const { locked, available } = parseWalletBalance(res);
      setLockedBalance(locked);
      setAvailableBalance(available);
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err.response?.data?.message || "Failed to load wallet balance");
    } finally {
      setBalanceLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    let activeSocket = null;
    let cancelled = false;

    const onWalletUpdated = (data) => {
      if (typeof data?.balance === "number") {
        setAvailableBalance(data.balance);
      }
    };

    const init = async () => {
      try {
        const state = await refreshAccounts();
        const initialMethod = state.method || "upi";
        setMethod(initialMethod);

        if (!hasAccountsForMethod(state, initialMethod)) {
          redirectToAddAccount(initialMethod);
          return;
        }

        setAccountsReady(true);
        loadBalance();
        loadWithdrawContext();
        loadRecentWithdrawals();

        const socket = await getSocket();
        if (!socket || cancelled) return;
        activeSocket = socket;
        socket.emit("join:user");
        socket.on("wallet:updated", onWalletUpdated);
      } catch (err) {
        if (err.response?.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err.response?.data?.message || "Failed to load withdraw accounts");
      }
    };

    init();

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", onWalletUpdated);
      }
    };
  }, [router, loadBalance, loadRecentWithdrawals, refreshAccounts, redirectToAddAccount]);

  useEffect(() => {
    const onFocus = () => {
      refreshAccounts().catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshAccounts]);

  const selectMethod = async (nextMethod) => {
    if (!hasAccountsForMethod(accountsState, nextMethod)) {
      redirectToAddAccount(nextMethod);
      return;
    }

    setMethod(nextMethod);
    setAmount("");
    setUsdtAmount("");
    setError("");

    try {
      await setWithdrawMethod(nextMethod);
      await refreshAccounts();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update method");
    }
  };

  const chooseAccount = async (accountId) => {
    try {
      await selectWithdrawAccount(method, accountId);
      await refreshAccounts();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to select account");
    }
  };

  const fillAllAmount = () => {
    const value = Math.min(availableBalance, limits.max);
    if (value <= 0) return;
    if (method === "usdt") {
      setAmount(String(Math.round(value * 100) / 100));
      setUsdtAmount(String(Math.round((value / usdtRate) * 100) / 100));
    } else {
      setAmount(String(Math.round(value * 100) / 100));
    }
  };

  const handleInrAmountChange = (value) => {
    setAmount(value);
    if (method !== "usdt") return;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setUsdtAmount(String(Math.round((parsed / usdtRate) * 100) / 100));
    } else {
      setUsdtAmount("");
    }
  };

  const handleUsdtAmountChange = (value) => {
    setUsdtAmount(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setAmount(String(convertUsdtToInr(parsed, usdtRate)));
    } else {
      setAmount("");
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedAccount) return;
    if (blocksAction("withdraw")) {
      setError(maintenanceMessage || "Withdrawals are temporarily unavailable.");
      return;
    }

    setLoading(true);
    setError("");

    const accountDetails = buildAccountDetailsForWithdraw(method, selectedAccount);
    if (method === "usdt") {
      accountDetails.usdtAmount = parsedUsdtAmount || undefined;
    }

    const methodLabel = method === "upi" ? "UPI" : method === "bank" ? "Bank" : "USDT";

    try {
      const res = await requestWithdraw({
        amount: withdrawInrAmount,
        method: methodLabel,
        accountDetails,
      });

      setSuccess({
        amount: withdrawInrAmount,
        method: methodLabel,
        usdtAmount: method === "usdt" ? parsedUsdtAmount : null,
        accountLine: getWithdrawAccountLine({
          method: methodLabel,
          accountDetails: accountDetails,
        }),
        id: res.data?._id,
      });
      loadRecentWithdrawals();
      loadWithdrawContext();
      loadBalance();
    } catch (err) {
      setError(err.response?.data?.message || "Withdrawal request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="withdraw-page">
        <div className="wallet-screen-loading">Loading...</div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="withdraw-page">
        <header className="withdraw-header center-title">
          <span />
          <h1>Withdrawal submitted</h1>
          <span />
        </header>
        <section className="withdraw-success-card">
          <div className="withdraw-success-icon">✓</div>
          <h2>Request received</h2>
          <p>
            Your withdrawal of <strong>₹{formatInr(success.amount)}</strong> is pending admin review.
          </p>
          <dl className="withdraw-success-meta">
            <div>
              <dt>Method</dt>
              <dd>{getWithdrawMethodMeta({ method: success.method }).label}</dd>
            </div>
            {success.usdtAmount > 0 ? (
              <div>
                <dt>USDT amount</dt>
                <dd>{formatUsdtAmount(success.usdtAmount)} USDT</dd>
              </div>
            ) : null}
            {success.accountLine ? (
              <div>
                <dt>Account</dt>
                <dd className="mono">{success.accountLine}</dd>
              </div>
            ) : null}
            <div>
              <dt>Status</dt>
              <dd>Pending</dd>
            </div>
          </dl>
          <div className="withdraw-success-actions">
            <Link href="/wallet/withdraw/history" className="withdraw-success-primary">
              View withdrawal history
            </Link>
            <button
              type="button"
              className="withdraw-success-secondary"
              onClick={() => router.push("/wallet")}
            >
              Back to wallet
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!accountsReady || !hasAccountsForMethod(accountsState, method)) {
    return (
      <main className="withdraw-page">
        <div className="wallet-screen-loading">Redirecting to add account...</div>
      </main>
    );
  }

  return (
    <main className="withdraw-page">
      <header className="withdraw-header has-history-link">
        <Link href="/wallet" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Withdraw</h1>
        <Link href="/wallet/withdraw/history" className="withdraw-history-link">
          History
        </Link>
      </header>

      {maintenanceMode ? (
        <div className="wallet-maintenance-notice">
          {maintenanceMessage || "Withdrawals are temporarily unavailable during maintenance."}
        </div>
      ) : null}

      <section className="deposit-balance-card withdraw-balance-card">
        <div className="deposit-balance-card-top">
          <div className="deposit-balance-card-label">
            <DepositIcon id="wallet-pill" size={18} className="deposit-balance-card-icon" />
            <span>Available balance</span>
          </div>
          <button
            type="button"
            className="deposit-balance-refresh"
            onClick={loadBalance}
            disabled={balanceLoading}
            aria-label="Refresh balance"
          >
            ↻
          </button>
        </div>
        <p className="deposit-balance-amount">
          {balanceLoading
            ? "..."
            : `₹${availableBalance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
        </p>
        <span className="deposit-balance-mask">**** ****</span>
      </section>

      <section className="withdraw-section">
        <div className="withdraw-method-tabs">
          {WITHDRAW_METHODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`withdraw-method-tab ${method === item.id ? "active" : ""}`}
              onClick={() => selectMethod(item.id)}
            >
              {item.icon === "usdt" ? (
                <DepositIcon id="usdt" size={22} className="withdraw-method-tab-icon" />
              ) : item.icon === "upi" ? (
                <DepositIcon id="upi-badge" size={22} className="withdraw-method-tab-icon" />
              ) : (
                <span className="withdraw-method-tab-emoji" aria-hidden>
                  💳
                </span>
              )}
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="withdraw-section">
        <div className="withdraw-account-select-head">
          <p className="withdraw-step-label">Select account</p>
          <Link
            href={`${ACCOUNTS_PATH}?method=${method}&return=/wallet/withdraw`}
            className="withdraw-manage-accounts-link"
          >
            Manage
          </Link>
        </div>

        <div className="withdraw-accounts-list">
          {methodAccounts.map((item) => {
            const isSelected = selectedAccount?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`withdraw-linked-account withdraw-account-select ${isSelected ? "selected" : ""}`}
                onClick={() => chooseAccount(item.id)}
              >
                {method === "bank" ? (
                  <>
                    <span className="withdraw-linked-account-icon">🏦</span>
                    <div className="withdraw-linked-account-copy">
                      <strong>{item.accountName}</strong>
                      <small>{maskAccountNumber(item.accountNumber)}</small>
                    </div>
                  </>
                ) : null}
                {method === "upi" ? (
                  <>
                    <DepositIcon id="upi-badge" size={26} className="withdraw-linked-account-icon-img" />
                    <div className="withdraw-linked-account-copy">
                      <strong>UPI account</strong>
                      <small>{item.upiId}</small>
                    </div>
                  </>
                ) : null}
                {method === "usdt" ? (
                  <>
                    <DepositIcon id="usdt" size={22} className="withdraw-linked-account-icon-img" />
                    <div className="withdraw-linked-account-copy">
                      <strong>USDT TRC20</strong>
                      <small>{maskUsdtAddress(item.address)}</small>
                    </div>
                  </>
                ) : null}
                <span className={`withdraw-account-radio ${isSelected ? "checked" : ""}`} aria-hidden />
              </button>
            );
          })}
        </div>

        <Link
          href={`${ACCOUNTS_PATH}?method=${method}&return=/wallet/withdraw`}
          className="withdraw-add-account withdraw-add-account-link"
        >
          <span>+</span>
          <strong>Add new account</strong>
        </Link>
      </section>

      <section className="withdraw-section">
        <div className="withdraw-panel">
          <div className="withdraw-panel-head">
            {method === "usdt" ? (
              <DepositIcon id="usdt" size={18} className="withdraw-panel-head-icon" />
            ) : (
              <span className="withdraw-panel-icon">₹</span>
            )}
            <strong>{method === "usdt" ? "Select amount of USDT" : "Enter withdrawal amount"}</strong>
          </div>

          {method === "usdt" ? (
            <>
              <div className={`withdraw-custom-input ${parsedAmount > 0 ? "filled" : ""}`}>
                <span>₹</span>
                <input
                  type="number"
                  placeholder="Please enter withdrawal amount"
                  value={amount}
                  onChange={(e) => handleInrAmountChange(e.target.value)}
                  min={limits.min}
                  max={maxAllowed}
                />
              </div>
              <div className={`withdraw-custom-input withdraw-usdt-input ${parsedUsdtAmount > 0 ? "filled" : ""}`}>
                <DepositIcon id="usdt" size={16} className="withdraw-custom-input-icon" />
                <input
                  type="number"
                  placeholder="Please enter USDT amount"
                  value={usdtAmount}
                  onChange={(e) => handleUsdtAmountChange(e.target.value)}
                  min={limits.min / usdtRate}
                  step="0.01"
                />
              </div>
            </>
          ) : (
            <div className={`withdraw-custom-input ${parsedAmount > 0 ? "filled" : ""}`}>
              <span>₹</span>
              <input
                type="number"
                placeholder="Please enter the amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={limits.min}
                max={maxAllowed}
              />
              {amount ? (
                <button type="button" className="withdraw-clear" onClick={() => setAmount("")} aria-label="Clear">
                  ✕
                </button>
              ) : null}
            </div>
          )}

          <div className="withdraw-amount-meta">
            <p>
              Withdrawable balance{" "}
              <strong>₹{formatInr(availableBalance)}</strong>
              {lockedBalance > 0 ? (
                <span className="withdraw-locked-note"> · Locked ₹{formatInr(lockedBalance)}</span>
              ) : null}
            </p>
            <button type="button" className="withdraw-all-btn" onClick={fillAllAmount}>
              All
            </button>
          </div>

          <div className="withdraw-received-row">
            <span>Withdrawal amount received</span>
            <strong>{receivedDisplay}</strong>
          </div>
        </div>
      </section>

      {recentWithdrawals.length > 0 ? (
        <section className="withdraw-section withdraw-recent-history">
          <div className="withdraw-account-select-head">
            <p className="withdraw-step-label">Recent withdrawals</p>
            <Link href="/wallet/withdraw/history" className="withdraw-manage-accounts-link">
              View all
            </Link>
          </div>
          <ul className="withdraw-history-list withdraw-recent-history-list">
            {recentWithdrawals.map((item) => {
              const methodMeta = getWithdrawMethodMeta(item);
              const accountLine = getWithdrawAccountLine(item);
              const createdAt = getWithdrawItemDate(item);

              return (
                <li key={getWithdrawItemId(item)} className="withdraw-history-card withdraw-recent-history-card">
                  <div className="withdraw-history-card-icon">{methodMeta.icon}</div>
                  <div className="withdraw-history-card-body">
                    <div className="withdraw-history-card-top">
                      <strong>₹{formatWithdrawAmount(item.amount)}</strong>
                      <span className={`withdraw-history-status ${item.status}`}>
                        {formatWithdrawStatus(item.status)}
                      </span>
                    </div>
                    <span className="withdraw-history-method">{methodMeta.label}</span>
                    {accountLine ? (
                      <span className="withdraw-history-account">{accountLine}</span>
                    ) : null}
                    <small>
                      {createdAt ? new Date(createdAt).toLocaleString("en-IN") : "—"}
                    </small>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="deposit-recharge-instructions withdraw-rules-card" aria-labelledby="withdraw-rules-title">
        <div className="deposit-recharge-instructions-head">
          <span className="deposit-recharge-instructions-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 5.5h11a2 2 0 0 1 2 2v11.5H8a2 2 0 0 1-2-2V5.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M8 5.5V17.5a2 2 0 0 0-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M10 9.5h6M10 12.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <h2 id="withdraw-rules-title">Withdrawal instructions</h2>
        </div>
        <ul>
          {rules.map((rule) => (
            <li key={rule.text || rule.parts?.map((part) => part.text + (part.highlight || "")).join("")}>
              {rule.parts ? (
                rule.parts.map((part, index) =>
                  part.highlight ? (
                    <span key={`${part.highlight}-${index}`} className="withdraw-rule-highlight">
                      {part.highlight}
                    </span>
                  ) : (
                    <span key={`${part.text}-${index}`}>{part.text}</span>
                  )
                )
              ) : (
                rule.text
              )}
            </li>
          ))}
        </ul>
      </section>

      {error ? <div className="auth-error withdraw-error">{error}</div> : null}

      <div className="withdraw-bottom-bar">
        <p className="withdraw-bottom-method">
          Withdraw method:{" "}
          <strong>
            {method === "bank" ? "Bank card" : method === "upi" ? "UPI" : "USDT - TRC20"}
          </strong>
        </p>
        <button
          type="button"
          className={`withdraw-submit ${canSubmit ? "ready" : ""}`}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {loading ? "Processing..." : "Withdraw"}
        </button>
        <p className="withdraw-secure-note">
          <DepositIcon id="lock" size={14} className="withdraw-secure-note-icon" />
          Secure &amp; encrypted transactions
        </p>
      </div>
    </main>
  );
}

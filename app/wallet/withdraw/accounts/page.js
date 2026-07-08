"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
import {
  addBankAccount,
  addUpiAccount,
  addUsdtAccount,
  fetchWithdrawAccountsState,
  removeWithdrawAccount,
  setWithdrawMethod,
} from "@/lib/withdrawAccounts";
import { maskAccountNumber } from "@/lib/withdrawRules";
import DepositIcon from "@/components/wallet/DepositIcon";

const ACCOUNT_METHODS = [
  { id: "bank", label: "Bank card", icon: "bank" },
  { id: "upi", label: "UPI", icon: "upi" },
  { id: "usdt", label: "USDT", icon: "usdt" },
];

const maskUsdtAddress = (value = "") => {
  const trimmed = String(value).trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`;
};

function WithdrawAccountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/wallet/withdraw";
  const initialMethod = searchParams.get("method");

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [method, setMethod] = useState("upi");
  const [accounts, setAccounts] = useState({ bank: [], upi: [], usdt: [] });
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [usdtAddress, setUsdtAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshAccounts = useCallback(async () => {
    const state = await fetchWithdrawAccountsState();
    setAccounts({
      bank: state.bank || [],
      upi: state.upi || [],
      usdt: state.usdt || [],
    });
    return state;
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      setLoadingAccounts(true);
      try {
        const state = await refreshAccounts();
        const nextMethod =
          initialMethod === "bank" || initialMethod === "usdt" || initialMethod === "upi"
            ? initialMethod
            : state.method || "upi";
        setMethod(nextMethod);
      } catch (err) {
        if (err.response?.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err.response?.data?.message || "Failed to load saved accounts");
      } finally {
        setLoadingAccounts(false);
      }
    };

    load();
  }, [router, initialMethod, refreshAccounts]);

  const currentList = useMemo(() => accounts[method] || [], [accounts, method]);

  const selectTab = async (nextMethod) => {
    setMethod(nextMethod);
    setError("");
    setSuccess("");
    try {
      await setWithdrawMethod(nextMethod);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update tab");
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const wasEmpty = currentList.length === 0;

      if (method === "bank") {
        await addBankAccount({ accountName, accountNumber, ifsc });
        setAccountName("");
        setAccountNumber("");
        setIfsc("");
        setSuccess("Bank account saved");
      } else if (method === "upi") {
        await addUpiAccount({ upiId });
        setUpiId("");
        setSuccess("UPI ID saved");
      } else {
        await addUsdtAccount({ address: usdtAddress });
        setUsdtAddress("");
        setSuccess("USDT address saved");
      }

      await refreshAccounts();

      if (wasEmpty && returnTo.startsWith("/wallet/withdraw")) {
        router.replace(returnTo);
      }
    } catch (err) {
      setError(err.message || "Could not save account");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (accountId) => {
    setError("");
    setSuccess("");
    try {
      await removeWithdrawAccount(method, accountId);
      await refreshAccounts();
    } catch (err) {
      setError(err.message || "Could not remove account");
    }
  };

  if (loadingAccounts) {
    return (
      <main className="withdraw-page">
        <div className="wallet-screen-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="withdraw-page withdraw-accounts-page">
      <header className="withdraw-header center-title">
        <Link href={returnTo} className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Withdraw accounts</h1>
        <span />
      </header>

      <section className="withdraw-section">
        <p className="withdraw-accounts-intro">
          Add bank, UPI, or USDT details here. On the withdraw page you can only select saved accounts.
        </p>

        <div className="withdraw-method-tabs withdraw-accounts-tabs">
          {ACCOUNT_METHODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`withdraw-method-tab ${method === item.id ? "active" : ""}`}
              onClick={() => selectTab(item.id)}
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
              <strong>{item.label.toUpperCase()}</strong>
            </button>
          ))}
        </div>
      </section>

      {currentList.length > 0 ? (
        <section className="withdraw-section">
          <p className="withdraw-step-label">Saved accounts</p>
          <div className="withdraw-accounts-list">
            {currentList.map((item) => (
              <div key={item.id} className="withdraw-linked-account withdraw-account-item">
                {method === "bank" ? (
                  <>
                    <span className="withdraw-linked-account-icon">🏦</span>
                    <div className="withdraw-linked-account-copy">
                      <strong>{item.accountName}</strong>
                      <small>{maskAccountNumber(item.accountNumber)} · {item.ifsc}</small>
                    </div>
                  </>
                ) : null}
                {method === "upi" ? (
                  <>
                    <DepositIcon id="upi-badge" size={26} className="withdraw-linked-account-icon-img" />
                    <div className="withdraw-linked-account-copy">
                      <strong>UPI</strong>
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
                <button
                  type="button"
                  className="withdraw-account-remove"
                  onClick={() => handleRemove(item.id)}
                  aria-label="Remove account"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="withdraw-section">
        <p className="withdraw-step-label">
          {currentList.length > 0 ? "Add another account" : "Add account"}
        </p>
        <form className="withdraw-account-form" onSubmit={handleAdd}>
          {method === "bank" ? (
            <div className="withdraw-bank-fields">
              <input
                type="text"
                placeholder="Account holder name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="withdraw-input"
                required
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="withdraw-input"
                autoComplete="off"
                required
              />
              <input
                type="text"
                placeholder="IFSC code"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                maxLength={11}
                className="withdraw-input"
                autoComplete="off"
                required
              />
            </div>
          ) : null}

          {method === "upi" ? (
            <div className="withdraw-input-wrap">
              <span className="withdraw-input-icon">@</span>
              <input
                type="text"
                placeholder="UPI ID (e.g. name@bank)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="withdraw-input"
                autoComplete="off"
                required
              />
            </div>
          ) : null}

          {method === "usdt" ? (
            <div className="withdraw-usdt-panel">
              <p className="withdraw-usdt-help">
                Use a TRC20 wallet address only. Wrong network may cause permanent loss.
              </p>
              <input
                type="text"
                placeholder="USDT TRC20 wallet address"
                value={usdtAddress}
                onChange={(e) => setUsdtAddress(e.target.value)}
                className="withdraw-input"
                autoComplete="off"
                required
              />
            </div>
          ) : null}

          {error ? <div className="auth-error withdraw-accounts-error">{error}</div> : null}
          {success ? <div className="withdraw-accounts-success">{success}</div> : null}

          <button type="submit" className="withdraw-accounts-save" disabled={saving}>
            {saving ? "Saving..." : currentList.length > 0 ? "Save & add" : "Save account"}
          </button>
        </form>
      </section>

      <section className="withdraw-section withdraw-accounts-footer-link">
        <Link href={returnTo} className="withdraw-usdt-support-link">
          Back to withdraw
        </Link>
      </section>
    </main>
  );
}

export default function WithdrawAccountsPage() {
  return (
    <Suspense
      fallback={
        <main className="withdraw-page">
          <div className="wallet-screen-loading">Loading...</div>
        </main>
      }
    >
      <WithdrawAccountsContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getDepositOptions, getWalletRules } from "@/lib/platformApi";
import { mergeWalletRules } from "@/lib/withdrawRules";
import { getBalance } from "@/lib/walletApi";
import { parseWalletBalance } from "@/lib/walletBalance";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getSocket } from "@/lib/socket";
import DepositIcon from "@/components/wallet/DepositIcon";
import {
  CRYPTO_RECHARGE_INSTRUCTIONS,
  USDT_PRESET_AMOUNTS,
  convertUsdtToInr,
  formatUsdtAmount,
  isCryptoChannel,
} from "@/lib/depositCrypto";

const PRESET_AMOUNTS = [200, 500, 1000, 2000, 5000, 10000];

const RECHARGE_INSTRUCTIONS = [
  "Upload a clear payment screenshot on the pay page before submitting — it is mandatory.",
  "If the transfer time is up, please fill out the deposit form again.",
  "The transfer amount must match the order you created, otherwise the money cannot be credited successfully.",
  "If you transfer the wrong amount, our company will not be responsible for the lost amount!",
  "Note: do not cancel the deposit order after the money has been transferred.",
];

const DEFAULT_DISABLED_MESSAGE =
  "No deposit channels are available right now. Please try again later or contact support.";

const formatPreset = (value, currencyUnit = "INR") => {
  if (currencyUnit === "USDT") {
    return value >= 1000 ? `${value / 1000}K USDT` : `${value} USDT`;
  }
  return value >= 1000 ? `₹${value / 1000}K` : `₹${value}`;
};

export default function DepositPage() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();
  const [mounted, setMounted] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [method, setMethod] = useState("paytm");
  const [channel, setChannel] = useState("weepay");
  const [amount, setAmount] = useState("");
  const [inrAmount, setInrAmount] = useState("");
  const [error, setError] = useState("");
  const [depositOptions, setDepositOptions] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [platformDepositRules, setPlatformDepositRules] = useState({ minAmount: 100, maxAmount: 50000 });

  const allMethods = depositOptions?.methods || [];
  const allChannels = depositOptions?.channels || [];
  const activeMethods = allMethods.filter((item) => item.enabled);
  const activeChannels = allChannels.filter((item) => item.enabled);
  const hasChannels = activeChannels.length > 0;
  const channelDisabledMessage = depositOptions?.disabledMessage || DEFAULT_DISABLED_MESSAGE;
  const selectedChannelRaw =
    activeChannels.find((item) => item.id === channel) ||
    activeChannels[0] ||
    ({ id: "", label: "—", min: 1, max: 1, bonus: "", range: "", type: "upi", usdtRate: 88 });
  const selectedChannel = {
    ...selectedChannelRaw,
    min: Math.max(Number(selectedChannelRaw.min || 1), platformDepositRules.minAmount),
    max: Math.min(Number(selectedChannelRaw.max || platformDepositRules.maxAmount), platformDepositRules.maxAmount),
  };
  const selectedMethod =
    activeMethods.find((item) => item.id === method) ||
    activeMethods[0] ||
    ({ id: "", label: "—" });
  const methodLinkedChannel = selectedMethod?.channelId
    ? allChannels.find((item) => item.id === selectedMethod.channelId)
    : null;
  const activeChannelType = methodLinkedChannel?.type || selectedChannel?.type || "upi";
  const displayChannels =
    allChannels.length > 0
      ? allChannels.filter((item) => (item.type || "upi") === activeChannelType)
      : allChannels;
  const parsedAmount = Number(amount);
  const parsedInrAmount = Number(inrAmount);
  const isCrypto = isCryptoChannel(selectedChannel);
  const usdtRate = selectedChannel.usdtRate || 88;
  const inrEquivalent = isCrypto ? convertUsdtToInr(parsedAmount, usdtRate) : parsedAmount;
  const canContinue =
    hasChannels &&
    parsedAmount >= selectedChannel.min &&
    parsedAmount <= selectedChannel.max &&
    (!isCrypto || inrEquivalent > 0) &&
    !maintenanceMode &&
    !blocksAction("deposit");

  const loadBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await getBalance();
      const { available } = parseWalletBalance(res);
      setBalance(available);
    } catch (err) {
      if (err.response?.status === 401) {
        router.replace("/login");
      }
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

    loadBalance();
    Promise.all([getDepositOptions(), getWalletRules()])
      .then(([optionsRes, rulesRes]) => {
        const options = optionsRes?.data || null;
        setDepositOptions(options);
        setPlatformDepositRules(mergeWalletRules(rulesRes?.data).deposit);
        const firstMethod = options?.methods?.find((item) => item.enabled);
        const firstChannel = options?.channels?.find((item) => item.enabled);
        if (firstMethod) setMethod(firstMethod.id);
        if (firstChannel) setChannel(firstChannel.id);
      })
      .catch(() => {
        setDepositOptions({
          disabledMessage: DEFAULT_DISABLED_MESSAGE,
          methods: [],
          channels: [],
        });
      })
      .finally(() => setOptionsLoading(false));

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
  }, [router, loadBalance]);

  const selectMethod = (methodItem) => {
    setMethod(methodItem.id);
    if (methodItem.channelId) {
      const linked = allChannels.find((item) => item.id === methodItem.channelId);
      if (linked) setChannel(methodItem.channelId);
    }
    setAmount("");
    setInrAmount("");
  };

  const selectChannel = (channelId) => {
    setChannel(channelId);
    setAmount("");
    setInrAmount("");
  };

  const handleUsdtAmountChange = (value) => {
    setAmount(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setInrAmount(String(convertUsdtToInr(parsed, usdtRate)));
    } else {
      setInrAmount("");
    }
  };

  const handleInrAmountChange = (value) => {
    setInrAmount(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0 && usdtRate > 0) {
      setAmount(String(Math.round((parsed / usdtRate) * 100) / 100));
    } else {
      setAmount("");
    }
  };

  const goToPayment = () => {
    if (!canContinue) {
      const unit = isCrypto ? "USDT" : "₹";
      setError(
        hasChannels
          ? `Enter amount between ${unit}${selectedChannel.min.toLocaleString("en-IN")} and ${unit}${selectedChannel.max.toLocaleString("en-IN")}`
          : channelDisabledMessage
      );
      return;
    }
    if (blocksAction("deposit")) {
      setError(maintenanceMessage || "Deposits are temporarily unavailable.");
      return;
    }
    setError("");
    const params = new URLSearchParams({
      amount: String(parsedAmount),
      method,
      channel,
    });
    if (isCrypto) {
      params.set("inr", String(inrEquivalent));
    }
    router.push(`/wallet/deposit/pay?${params.toString()}`);
  };

  const visiblePresets = isCrypto
    ? USDT_PRESET_AMOUNTS.filter((preset) => preset >= selectedChannel.min && preset <= selectedChannel.max)
    : PRESET_AMOUNTS.filter((preset) => preset >= selectedChannel.min && preset <= selectedChannel.max);

  const instructionList = isCrypto ? CRYPTO_RECHARGE_INSTRUCTIONS : RECHARGE_INSTRUCTIONS;

  if (!mounted || optionsLoading) {
    return (
      <main className="deposit-page">
        <div className="wallet-screen-loading">Loading...</div>
      </main>
    );
  }

  return (
    <main className="deposit-page">
      <header className="deposit-header center-title">
        <Link href="/wallet" className="wallet-screen-back" aria-label="Back">
          ‹
        </Link>
        <h1>Deposit</h1>
        <Link href="/wallet/deposit/history" className="deposit-history-link">
          Deposit history
        </Link>
      </header>

      {maintenanceMode ? (
        <div className="wallet-maintenance-notice">
          {maintenanceMessage || "Deposits are temporarily unavailable during maintenance."}
        </div>
      ) : null}

      <section className="deposit-balance-card">
        <div className="deposit-balance-card-top">
          <div className="deposit-balance-card-label">
            <DepositIcon id="wallet-pill" size={18} className="deposit-balance-card-icon" />
            <span>Balance</span>
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
          {balanceLoading ? "..." : `₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
        <span className="deposit-balance-mask">**** ****</span>
      </section>

      <section className="deposit-section">
        {allMethods.length > 0 ? (
          <div className="deposit-methods-grid">
            {allMethods.map((item) =>
              item.enabled ? (
                <button
                  key={item.id}
                  type="button"
                  className={`deposit-method-tile ${method === item.id ? "active" : ""}`}
                  onClick={() => selectMethod(item)}
                >
                  {item.badge ? <em className="deposit-method-badge">{item.badge}</em> : null}
                  <DepositIcon id={item.icon} size={36} className="deposit-method-logo-img" />
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                </button>
              ) : (
                <div key={item.id} className="deposit-method-tile inactive">
                  {item.badge ? <em className="deposit-method-badge">{item.badge}</em> : null}
                  <DepositIcon id={item.icon} size={36} className="deposit-method-logo-img" />
                  <strong>{item.label}</strong>
                  <small>{item.sub}</small>
                  <p className="deposit-item-disabled-msg">{item.disabledMessage}</p>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="deposit-methods-empty">No payment methods configured.</p>
        )}
      </section>

      <section className="deposit-section">
        <div className="deposit-channel-head">
          <DepositIcon id="document" size={18} className="deposit-channel-head-icon" />
          <span>Select channel</span>
        </div>
        {displayChannels.length > 0 ? (
          <div className="deposit-channel-list">
            {displayChannels.map((item) =>
              item.enabled ? (
                <button
                  key={item.id}
                  type="button"
                  className={`deposit-channel-item ${channel === item.id ? "active" : ""}`}
                  onClick={() => selectChannel(item.id)}
                >
                  <DepositIcon id={item.icon} size={40} className="deposit-channel-logo-img" />
                  <div className="deposit-channel-copy">
                    <strong>{item.label}</strong>
                    <small>{item.range}</small>
                  </div>
                  <span className="deposit-channel-bonus">{item.bonus}</span>
                </button>
              ) : (
                <div key={item.id} className="deposit-channel-item inactive">
                  <DepositIcon id={item.icon} size={40} className="deposit-channel-logo-img" />
                  <div className="deposit-channel-copy">
                    <strong>{item.label}</strong>
                    <small>{item.disabledMessage}</small>
                  </div>
                  <span className="deposit-channel-bonus off">Off</span>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="deposit-channel-disabled">
            <span className="deposit-channel-disabled-icon">⏸</span>
            <strong>Select channel unavailable</strong>
            <p>{channelDisabledMessage}</p>
          </div>
        )}
        {!hasChannels && allChannels.length > 0 ? (
          <p className="deposit-field-hint">{channelDisabledMessage}</p>
        ) : null}
      </section>

      <section className={`deposit-section ${!hasChannels ? "deposit-section-muted" : ""}`}>
        <div className="deposit-panel">
          <div className="deposit-panel-head">
            {isCrypto ? (
              <DepositIcon id="usdt" size={22} className="deposit-panel-head-icon" />
            ) : (
              <span className="deposit-panel-icon">₹</span>
            )}
            <strong>{isCrypto ? "Select amount of USDT" : "Select deposit amount"}</strong>
          </div>

          <div className="deposit-amount-grid">
            {visiblePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`deposit-amount-btn ${Number(amount) === preset ? "active" : ""}`}
                onClick={() =>
                  isCrypto ? handleUsdtAmountChange(String(preset)) : setAmount(String(preset))
                }
                disabled={!hasChannels}
              >
                {isCrypto ? (
                  <>
                    <DepositIcon id="usdt" size={18} className="deposit-amount-usdt-icon" />
                    {formatPreset(preset, "USDT")}
                  </>
                ) : (
                  formatPreset(preset)
                )}
              </button>
            ))}
          </div>

          <div className={`deposit-custom-input ${parsedAmount > 0 ? "filled" : ""}`}>
            {isCrypto ? (
              <DepositIcon id="usdt" size={18} className="deposit-custom-input-icon" />
            ) : (
              <span>₹</span>
            )}
            <input
              type="number"
              placeholder={
                isCrypto
                  ? `Please enter USDT amount (${selectedChannel.min}-${selectedChannel.max})`
                  : `${selectedChannel.min} - ${selectedChannel.max.toLocaleString("en-IN")}`
              }
              value={amount}
              onChange={(e) =>
                isCrypto ? handleUsdtAmountChange(e.target.value) : setAmount(e.target.value)
              }
              min={selectedChannel.min}
              max={selectedChannel.max}
              step={isCrypto ? "0.01" : "1"}
              disabled={!hasChannels}
            />
            {amount ? (
              <button
                type="button"
                className="deposit-clear"
                onClick={() => {
                  setAmount("");
                  setInrAmount("");
                }}
                aria-label="Clear amount"
              >
                ✕
              </button>
            ) : null}
          </div>

          {isCrypto ? (
            <div className={`deposit-custom-input deposit-inr-convert ${parsedInrAmount > 0 ? "filled" : ""}`}>
              <span>₹</span>
              <input
                type="number"
                placeholder="Please enter the amount"
                value={inrAmount}
                onChange={(e) => handleInrAmountChange(e.target.value)}
                min={1}
                disabled={!hasChannels}
              />
            </div>
          ) : null}

          <p className="deposit-amount-limits">
            {isCrypto ? (
              <>
                Min: {formatUsdtAmount(selectedChannel.min)} USDT · Max: {formatUsdtAmount(selectedChannel.max)} USDT
                {usdtRate ? ` · Rate: ₹${usdtRate}/USDT` : null}
              </>
            ) : (
              <>
                Min: ₹{selectedChannel.min.toLocaleString("en-IN")} · Max: ₹
                {selectedChannel.max.toLocaleString("en-IN")}
              </>
            )}
          </p>
          {isCrypto && inrEquivalent > 0 ? (
            <p className="deposit-amount-converted">
              Wallet credit: <strong>₹{inrEquivalent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </p>
          ) : null}
        </div>
      </section>

      <section className="deposit-recharge-instructions" aria-labelledby="deposit-recharge-instructions-title">
        <div className="deposit-recharge-instructions-head">
          <span className="deposit-recharge-instructions-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 5.5h11a2 2 0 0 1 2 2v11.5H8a2 2 0 0 1-2-2V5.5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8 5.5V17.5a2 2 0 0 0-2 2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path d="M10 9.5h6M10 12.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <h2 id="deposit-recharge-instructions-title">Recharge instructions</h2>
        </div>
        <ul>
          {instructionList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {error ? <div className="auth-error deposit-error">{error}</div> : null}

      <div className="deposit-bottom-bar">
        <p className="deposit-bottom-method">
          {selectedMethod?.label && selectedChannel?.label ? (
            <>
              Recharge Method: <strong>{selectedChannel.label}</strong>
            </>
          ) : (
            "Select method and channel"
          )}
        </p>
        <button
          type="button"
          className={`deposit-submit ${canContinue ? "ready" : ""}`}
          disabled={!canContinue}
          onClick={goToPayment}
        >
          Deposit
        </button>
        <p className="deposit-secure-note">
          <DepositIcon id="lock" size={14} className="deposit-secure-note-icon" />
          Secure &amp; encrypted transactions
        </p>
      </div>
    </main>
  );
}

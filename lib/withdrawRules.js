export const DEFAULT_WITHDRAW_LIMITS = {
  bank: { min: 100, max: 50000 },
  upi: { min: 100, max: 50000 },
  usdt: { min: 110, max: 10000000, usdtRate: 88 },
};

export const DEFAULT_WITHDRAW_POLICY = {
  windowStart: "00:00",
  windowEnd: "23:55",
  dailyLimit: 3,
  betRequired: 0,
};

export const mergeWalletRules = (apiRules) => {
  if (!apiRules) {
    return {
      deposit: { minAmount: 100, maxAmount: 50000 },
      withdraw: {
        ...DEFAULT_WITHDRAW_POLICY,
        limits: DEFAULT_WITHDRAW_LIMITS,
      },
    };
  }

  return {
    deposit: {
      minAmount: Number(apiRules.deposit?.minAmount ?? 100),
      maxAmount: Number(apiRules.deposit?.maxAmount ?? 50000),
    },
    withdraw: {
      windowStart: apiRules.withdraw?.windowStart || DEFAULT_WITHDRAW_POLICY.windowStart,
      windowEnd: apiRules.withdraw?.windowEnd || DEFAULT_WITHDRAW_POLICY.windowEnd,
      dailyLimit: Number(apiRules.withdraw?.dailyLimit ?? DEFAULT_WITHDRAW_POLICY.dailyLimit),
      betRequired: Number(apiRules.withdraw?.betRequired ?? DEFAULT_WITHDRAW_POLICY.betRequired),
      limits: {
        bank: {
          min: Number(apiRules.withdraw?.bank?.min ?? DEFAULT_WITHDRAW_LIMITS.bank.min),
          max: Number(apiRules.withdraw?.bank?.max ?? DEFAULT_WITHDRAW_LIMITS.bank.max),
          enabled: apiRules.withdraw?.bank?.enabled !== false,
        },
        upi: {
          min: Number(apiRules.withdraw?.upi?.min ?? DEFAULT_WITHDRAW_LIMITS.upi.min),
          max: Number(apiRules.withdraw?.upi?.max ?? DEFAULT_WITHDRAW_LIMITS.upi.max),
          enabled: apiRules.withdraw?.upi?.enabled !== false,
        },
        usdt: {
          min: Number(apiRules.withdraw?.usdt?.min ?? DEFAULT_WITHDRAW_LIMITS.usdt.min),
          max: Number(apiRules.withdraw?.usdt?.max ?? DEFAULT_WITHDRAW_LIMITS.usdt.max),
          usdtRate: Number(apiRules.withdraw?.usdt?.usdtRate ?? DEFAULT_WITHDRAW_LIMITS.usdt.usdtRate),
          enabled: apiRules.withdraw?.usdt?.enabled !== false,
        },
      },
    },
  };
};

export const getWithdrawLimitsForMethod = (walletRules, method = "upi") => {
  const limits = walletRules?.withdraw?.limits?.[method] || DEFAULT_WITHDRAW_LIMITS[method] || DEFAULT_WITHDRAW_LIMITS.upi;
  return limits;
};

const formatInr = (value) =>
  Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const buildWithdrawRules = ({
  method = "upi",
  limits,
  walletRules,
  stats,
}) => {
  const resolvedLimits = limits || getWithdrawLimitsForMethod(walletRules, method);
  const policy = walletRules?.withdraw || {};
  const remainingTimes =
    stats?.remainingWithdrawals ??
    Math.max(Number(policy.dailyLimit ?? DEFAULT_WITHDRAW_POLICY.dailyLimit), 0);
  const betRequired = Number(policy.betRequired ?? DEFAULT_WITHDRAW_POLICY.betRequired);
  const windowLabel = `${policy.windowStart || DEFAULT_WITHDRAW_POLICY.windowStart}-${
    policy.windowEnd || DEFAULT_WITHDRAW_POLICY.windowEnd
  }`;
  const rangeHighlight = `₹${formatInr(resolvedLimits.min)}-₹${formatInr(resolvedLimits.max)}`;

  const rules = [
    {
      parts: [
        { text: "Need to bet " },
        { highlight: `₹${formatInr(betRequired)}` },
        { text: " to be able to withdraw" },
      ],
    },
    {
      parts: [{ text: "Withdraw time " }, { highlight: windowLabel }],
    },
    {
      parts: [
        { text: "Today remaining withdrawal times " },
        { highlight: String(remainingTimes) },
      ],
    },
    {
      parts: [{ text: "Withdrawal amount range " }, { highlight: rangeHighlight }],
    },
  ];

  if (method === "usdt") {
    rules.push({
      text: "After withdraw, you need to confirm the blockchain main network 3 times before it arrives at your account.",
    });
    rules.push({
      text: "Please confirm that the operating environment is safe to avoid information being tampered with or leaked.",
    });
  }

  rules.push({
    text: "Please confirm your beneficial account information before withdrawing. If your information is incorrect, our company will not be liable for the amount of loss",
  });
  rules.push({
    text: "If your beneficial information is incorrect, please contact customer service",
  });

  return rules;
};

export const maskAccountNumber = (value = "") => {
  const trimmed = String(value).replace(/\s/g, "");
  if (trimmed.length <= 4) return trimmed;
  if (trimmed.length <= 10) return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
  return `${trimmed.slice(0, 6)}****${trimmed.slice(-3)}`;
};

/** @deprecated use mergeWalletRules */
export const WITHDRAW_LIMITS = DEFAULT_WITHDRAW_LIMITS;
export const WITHDRAW_WINDOW = `${DEFAULT_WITHDRAW_POLICY.windowStart}-${DEFAULT_WITHDRAW_POLICY.windowEnd}`;
export const DEFAULT_REMAINING_WITHDRAWALS = DEFAULT_WITHDRAW_POLICY.dailyLimit;
export const DEFAULT_BET_REQUIRED = DEFAULT_WITHDRAW_POLICY.betRequired;

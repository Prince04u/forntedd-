export const USDT_PRESET_AMOUNTS = [10, 30, 50, 100, 1000, 10000];

export const CRYPTO_RECHARGE_INSTRUCTIONS = [
  "Upload a clear payment screenshot on the pay page before submitting — it is mandatory.",
  "Minimum deposit: 10 USDT. Deposits less than the minimum will not be credited.",
  "Do not deposit any non-USDT (TRC20) assets to the address above, or the assets will not be recovered.",
  "Please confirm that the operating environment is safe to avoid information being tampered with or leaked.",
  "The transfer amount must match the order you created, otherwise the money cannot be credited successfully.",
  "Note: do not cancel the deposit order after the money has been transferred.",
];

export const convertUsdtToInr = (usdtAmount, rate) => {
  const parsedUsdt = Number(usdtAmount);
  const parsedRate = Number(rate);
  if (!Number.isFinite(parsedUsdt) || !Number.isFinite(parsedRate) || parsedUsdt <= 0 || parsedRate <= 0) {
    return 0;
  }
  return Math.round(parsedUsdt * parsedRate * 100) / 100;
};

export const formatUsdtAmount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return parsed.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const buildDepositOrderNo = () => {
  const now = new Date();
  const pad = (value, size = 2) => String(value).padStart(size, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
    pad(now.getMilliseconds(), 3),
  ].join("");
  const random = Math.random().toString(36).slice(2, 10);
  return `RC${stamp}${random}`;
};

export const isCryptoChannel = (channel) => channel?.type === "crypto" || channel?.currencyUnit === "USDT";

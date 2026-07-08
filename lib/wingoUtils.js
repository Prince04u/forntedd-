export const DURATIONS = [
  { slug: "30s", label: "30sec", short: "WinGo 30sec" },
  { slug: "1m", label: "1 Min", short: "WinGo 1 Min" },
  { slug: "3m", label: "3 Min", short: "WinGo 3 Min" },
  { slug: "5m", label: "5 Min", short: "WinGo 5 Min" },
];

export const DURATION_SEC = {
  "30s": 30,
  "1m": 60,
  "3m": 180,
  "5m": 300,
};

export const MULTIPLIERS = [1, 5, 10, 20, 50, 100];
export const BASE_AMOUNTS = [1, 10, 100, 1000];
export const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const colorClass = (num) => {
  if (num === 0) return "v0";
  if (num === 5) return "v5";
  if ([1, 3, 7, 9].includes(num)) return "green";
  return "red";
};

export const getSize = (num) => (num <= 4 ? "Small" : "Big");

export const getColorDots = (num) => {
  if (num === 0) return ["red", "violet"];
  if (num === 5) return ["green", "violet"];
  if ([1, 3, 7, 9].includes(num)) return ["green"];
  return ["red"];
};

export const formatTimer = (seconds = 0) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { mm, ss };
};

export const getDurationMeta = (slug) =>
  DURATIONS.find((d) => d.slug === slug) || DURATIONS[0];

export const getDurationSlugFromSeconds = (seconds) => {
  const found = DURATIONS.find((d) => DURATION_SEC[d.slug] === seconds);
  return found?.slug || "30s";
};

export const formatBetLabel = (betType, betValue) => {
  if (betType === "big_small") {
    return betValue === "big" ? "Big" : "Small";
  }
  if (betType === "color") {
    const label = String(betValue);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (betType === "number") {
    return String(betValue);
  }
  return String(betValue);
};

export const formatBetPnL = (bet) => {
  if (bet.status === "won") {
    return { text: `+₹${(bet.winAmount || 0).toFixed(2)}`, className: "won" };
  }
  if (bet.status === "lost") {
    return { text: `-₹${bet.amount.toFixed(2)}`, className: "lost" };
  }
  if (bet.status === "refunded") {
    return { text: "Refunded", className: "refunded" };
  }
  return { text: "—", className: "pending" };
};

export const getBetTheme = (betType, betValue) => {
  if (betType === "color") return betValue;
  if (betType === "big_small") return betValue === "big" ? "orange" : "blue";
  const num = Number(betValue);
  return colorClass(num);
};

export const getBetSelectionLabel = (betType, betValue) => {
  if (betType === "color") {
    const label = String(betValue);
    return `Select ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  }
  if (betType === "big_small") {
    const label = String(betValue);
    return `Select ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
  }
  return `Select Number ${betValue}`;
};

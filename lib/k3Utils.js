export const DURATIONS = [
  { id: "1m", label: "K3 1 Min", icon: "🕒" },
  { id: "3m", label: "K3 3 Min", icon: "🕒" },
  { id: "5m", label: "K3 5 Min", icon: "🕒" },
  { id: "10m", label: "K3 10 Min", icon: "🕒" },
];

export const DURATION_SEC = {
  "1m": 60,
  "3m": 180,
  "5m": 300,
  "10m": 600,
};

export const getDurationMeta = (id) => {
  return DURATIONS.find((d) => d.id === id) || DURATIONS[0];
};

export const formatTimer = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return {
    mm: String(m).padStart(2, "0"),
    ss: String(s).padStart(2, "0"),
  };
};

export const MULTIPLIERS = {
  total_3: 207, total_18: 207,
  total_4: 60, total_17: 60,
  total_5: 30, total_16: 30,
  total_6: 18, total_15: 18,
  total_7: 12, total_14: 12,
  total_8: 8, total_13: 8,
  total_9: 6, total_10: 6, total_11: 6, total_12: 6,
  size: 1.96,
  parity: 1.96,
  "3_same_any": 34,
  "3_same_specific": 207,
  "2_same_specific": 13.8,
  "3_seq_any": 10
};

export const BASE_AMOUNTS = [1, 10, 100, 1000];

export const formatBetLabel = (betType, betValue) => {
  if (betType === "total") return `Sum ${betValue}`;
  if (betType === "size") return betValue === "big" ? "Big" : "Small";
  if (betType === "parity") return betValue === "odd" ? "Odd" : "Even";
  if (betType === "3_same_any") return "Any 3 Same";
  if (betType === "3_same_specific") return `${betValue}`;
  if (betType === "2_same_specific") return `${betValue}*`;
  if (betType === "3_seq_any") return "3 Sequence";
  return String(betValue).toUpperCase();
};

export const getBetTheme = (betType, betValue) => {
  if (betType === "size" && betValue === "big") return "orange";
  if (betType === "size" && betValue === "small") return "blue";
  if (betType === "parity" && betValue === "odd") return "green";
  if (betType === "parity" && betValue === "even") return "red";
  if (betType === "total") return "violet";
  return "indigo";
};

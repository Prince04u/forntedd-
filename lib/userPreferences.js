const AVATAR_KEY = "club_avatar";
const WITHDRAW_PREFS_KEY = "club_withdraw_prefs";

export const getStoredAvatar = () => {
  if (typeof window === "undefined") return "👤";
  return localStorage.getItem(AVATAR_KEY) || "👤";
};

export const setStoredAvatar = (avatar) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(AVATAR_KEY, avatar);
};

export const getStoredWithdrawPrefs = () => {
  if (typeof window === "undefined") {
    return {
      method: "upi",
      upiId: "",
      accountName: "",
      accountNumber: "",
      ifsc: "",
      usdtAddress: "",
    };
  }
  try {
    const raw = localStorage.getItem(WITHDRAW_PREFS_KEY);
    if (!raw) {
      return {
        method: "upi",
        upiId: "",
        accountName: "",
        accountNumber: "",
        ifsc: "",
        usdtAddress: "",
      };
    }
    const parsed = JSON.parse(raw);
    const method =
      parsed.method === "bank" || parsed.method === "usdt" ? parsed.method : "upi";
    return {
      method,
      upiId: parsed.upiId || "",
      accountName: parsed.accountName || "",
      accountNumber: parsed.accountNumber || "",
      ifsc: parsed.ifsc || "",
      usdtAddress: parsed.usdtAddress || "",
    };
  } catch {
    return {
      method: "upi",
      upiId: "",
      accountName: "",
      accountNumber: "",
      ifsc: "",
      usdtAddress: "",
    };
  }
};

export const setStoredWithdrawPrefs = (prefs) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(WITHDRAW_PREFS_KEY, JSON.stringify(prefs));
};

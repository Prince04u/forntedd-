import {
  addWithdrawAccount as apiAddWithdrawAccount,
  deleteWithdrawAccount as apiDeleteWithdrawAccount,
  getWithdrawAccounts,
  updateWithdrawAccountPreferences,
} from "@/lib/walletApi";

export const emptyWithdrawAccountsState = () => ({
  method: "upi",
  selected: { bank: null, upi: null, usdt: null },
  bank: [],
  upi: [],
  usdt: [],
});

export const validateUpi = (upiId = "") => {
  const trimmed = String(upiId).trim();
  return trimmed.includes("@") && trimmed.length >= 5;
};

export const validateBank = ({ accountName = "", accountNumber = "", ifsc = "" } = {}) => {
  const name = String(accountName).trim();
  const number = String(accountNumber).trim();
  const code = String(ifsc).trim().toUpperCase();
  return name.length >= 2 && number.length >= 6 && code.length === 11;
};

export const validateUsdtAddress = (address = "") => {
  const trimmed = String(address).trim();
  return trimmed.startsWith("T") && trimmed.length >= 30;
};

export const fetchWithdrawAccountsState = async () => {
  const res = await getWithdrawAccounts();
  return res.data || emptyWithdrawAccountsState();
};

export const getAccountsByMethod = (state, method) => {
  if (method === "bank") return state.bank || [];
  if (method === "usdt") return state.usdt || [];
  return state.upi || [];
};

export const hasAccountsForMethod = (state, method) =>
  getAccountsByMethod(state, method).length > 0;

export const getSelectedAccount = (state, method) => {
  const list = getAccountsByMethod(state, method);
  const selectedId = state.selected?.[method];
  return list.find((item) => item.id === selectedId) || list[0] || null;
};

export const setWithdrawMethod = async (method) => {
  const res = await updateWithdrawAccountPreferences({
    method: method === "bank" || method === "usdt" ? method : "upi",
  });
  return res.data;
};

export const selectWithdrawAccount = async (method, accountId) => {
  const res = await updateWithdrawAccountPreferences({
    selected: { [method]: accountId },
  });
  return res.data;
};

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export const addBankAccount = async ({ accountName, accountNumber, ifsc }) => {
  try {
    const res = await apiAddWithdrawAccount({
      type: "bank",
      accountName,
      accountNumber,
      ifsc,
    });
    return res.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not save bank account"));
  }
};

export const addUpiAccount = async ({ upiId }) => {
  try {
    const res = await apiAddWithdrawAccount({
      type: "upi",
      upiId,
    });
    return res.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not save UPI ID"));
  }
};

export const addUsdtAccount = async ({ address }) => {
  try {
    const res = await apiAddWithdrawAccount({
      type: "usdt",
      address,
    });
    return res.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not save USDT address"));
  }
};

export const removeWithdrawAccount = async (method, accountId) => {
  try {
    const res = await apiDeleteWithdrawAccount(accountId);
    return res.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not remove account"));
  }
};

export const buildAccountDetailsForWithdraw = (method, account) => {
  if (!account) return null;
  if (method === "upi") return { upiId: account.upiId };
  if (method === "bank") {
    return {
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      ifsc: account.ifsc,
    };
  }
  return { walletAddress: account.address };
};

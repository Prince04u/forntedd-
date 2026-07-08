import api from "./api";

export const getBalance = async () => {
  const { data } = await api.get("/wallet/balance");
  return data;
};

export const getTransactions = async (params = {}) => {
  const { data } = await api.get("/transactions", { params });
  return data;
};

export const requestDeposit = async (payload) => {
  const { data } = await api.post("/wallet/deposit/request", payload);
  return data;
};

export const requestWithdraw = async (payload) => {
  const { data } = await api.post("/wallet/withdraw/request", payload);
  return data;
};

export const getDeposits = async () => {
  const { data } = await api.get("/wallet/deposits");
  return data;
};

export const getWithdrawals = async () => {
  const { data } = await api.get("/wallet/withdrawals");
  return data;
};

export const getWithdrawContext = async () => {
  const { data } = await api.get("/wallet/withdraw/context");
  return data;
};

export const getWithdrawAccounts = async () => {
  const { data } = await api.get("/wallet/withdraw/accounts");
  return data;
};

export const addWithdrawAccount = async (payload) => {
  const { data } = await api.post("/wallet/withdraw/accounts", payload);
  return data;
};

export const deleteWithdrawAccount = async (accountId) => {
  const { data } = await api.delete(`/wallet/withdraw/accounts/${accountId}`);
  return data;
};

export const updateWithdrawAccountPreferences = async (payload) => {
  const { data } = await api.patch("/wallet/withdraw/accounts/preferences", payload);
  return data;
};

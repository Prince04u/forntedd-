import api from "./api";

export const getAgentStatus = async () => {
  const { data } = await api.get("/agents/me/status");
  return data;
};

export const getAgentDashboard = async () => {
  const { data } = await api.get("/agents/me");
  return data;
};

export const getAgentDownline = async (params = {}) => {
  const { data } = await api.get("/agents/me/downline", { params });
  return data;
};

export const getAgentCommissions = async (params = {}) => {
  const { data } = await api.get("/agents/me/commissions", { params });
  return data;
};

export const getAgentPayoutRequests = async (params = {}) => {
  const { data } = await api.get("/agents/me/payout-requests", { params });
  return data;
};

export const createAgentPayoutRequest = async (payload) => {
  const { data } = await api.post("/agents/me/payout-requests", payload);
  return data;
};

export const getAgentNotifications = async (params = {}) => {
  const { data } = await api.get("/agents/me/notifications", { params });
  return data;
};

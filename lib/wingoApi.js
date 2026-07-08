import api from "./api";

export const getCurrentPeriod = async (duration) => {
  const { data } = await api.get(`/wingo/${duration}/current`);
  return data;
};

export const getRecentResults = async (duration, limit = 10) => {
  const { data } = await api.get(`/wingo/${duration}/results`, { params: { limit } });
  return data;
};

export const placeBet = async (duration, payload) => {
  const { data } = await api.post(`/wingo/${duration}/bet`, payload);
  return data;
};

export const getMyBets = async (params = {}) => {
  const { data } = await api.get("/wingo/bets/my", { params });
  return data;
};

export const sendOtp = async (mobile) => {
  const { data } = await api.post("/auth/send-otp", { mobile });
  return data;
};

export const verifyOtp = async (payload) => {
  const { data } = await api.post("/auth/verify-otp", payload);
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

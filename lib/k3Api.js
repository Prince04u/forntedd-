import api from "./api";

export const getCurrentPeriod = async (duration) => {
  const { data } = await api.get(`/k3/${duration}/current`);
  return data;
};

export const getRecentResults = async (duration, limit = 10) => {
  const { data } = await api.get(`/k3/${duration}/results`, { params: { limit } });
  return data;
};

export const placeBet = async (duration, payload) => {
  const { data } = await api.post(`/k3/${duration}/bet`, payload);
  return data;
};

export const getMyBets = async (params = {}) => {
  const { data } = await api.get("/k3/bets/my", { params });
  return data;
};

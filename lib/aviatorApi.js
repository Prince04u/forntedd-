import api from "./api";

export const placeBet = async (payload) => {
  const { data } = await api.post("/aviator/bet", payload);
  return data;
};

export const cashOut = async (payload) => {
  const { data } = await api.post("/aviator/cashout", payload);
  return data;
};

export const cancelBet = async (payload) => {
  const { data } = await api.post("/aviator/cancel", payload);
  return data;
};

export const getMyBets = async (params = {}) => {
  const { data } = await api.get("/aviator/bets/my", { params });
  return data;
};

export const getRecentRounds = async (params = {}) => {
  const { data } = await api.get("/aviator/rounds/recent", { params });
  return data;
};


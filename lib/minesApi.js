import api from "./api";

export const getActiveGame = async () => {
  const { data } = await api.get("/mines/active");
  return data;
};

export const startGame = async (payload) => {
  const { data } = await api.post("/mines/start", payload);
  return data;
};

export const revealTile = async (gameId, tileIndex) => {
  const { data } = await api.post("/mines/reveal", { gameId, tileIndex });
  return data;
};

export const cashOut = async (gameId) => {
  const { data } = await api.post("/mines/cashout", { gameId });
  return data;
};

export const getMyBets = async (params = {}) => {
  const { data } = await api.get("/mines/bets/my", { params });
  return data;
};

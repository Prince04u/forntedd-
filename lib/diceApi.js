import api from "./api";

export const roll = async (payload) => {
  const { data } = await api.post("/dice/roll", payload);
  return data;
};

export const getMyRolls = async (params = {}) => {
  const { data } = await api.get("/dice/rolls/my", { params });
  return data;
};


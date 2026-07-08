import api from "./api";

export const login = async (credentials) => {
  const { data } = await api.post("/auth/login", credentials);
  return data;
};

export const register = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const changePassword = async (payload) => {
  const { data } = await api.post("/auth/change-password", payload);
  return data;
};

import api from "./api";

export const getMyReferrals = async (params = {}) => {
  const { data } = await api.get("/referrals/me", { params });
  return data;
};

export const getReferralEarnings = async (params = {}) => {
  const { data } = await api.get("/referrals/me/earnings", { params });
  return data;
};

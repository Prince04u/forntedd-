import api from "./api";

export const getGiftStatus = async () => {
  const { data } = await api.get("/gifts/status");
  return data;
};

export const claimDailyGift = async () => {
  const { data } = await api.post("/gifts/claim");
  return data;
};

export const redeemGiftCode = async (code) => {
  const { data } = await api.post("/gifts/redeem", { code });
  return data;
};

export const getRedemptionHistory = async () => {
  const { data } = await api.get("/gifts/history");
  return data;
};

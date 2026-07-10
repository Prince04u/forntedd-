import api from "./api";

export const getPlatformStatus = async () => {
  const { data } = await api.get("/platform/status");
  return data;
};

export const getDepositPayment = async (channel, amount) => {
  const { data } = await api.get("/platform/deposit-payment", {
    params: { channel, amount },
  });
  return data;
};

export const getPromoBanners = async () => {
  const { data } = await api.get("/platform/promos");
  return data;
};

export const getAnnouncements = async () => {
  const { data } = await api.get("/platform/announcements");
  return data;
};

export const getWingoConfig = async () => {
  const { data } = await api.get("/platform/wingo-config");
  return data;
};

export const getMinesConfig = async () => {
  const { data } = await api.get("/platform/mines-config");
  return data;
};

export const getAviatorConfig = async () => {
  const { data } = await api.get("/platform/aviator-config");
  return data;
};

export const getDiceConfig = async () => {
  const { data } = await api.get("/platform/dice-config");
  return data;
};

export const getDepositOptions = async () => {
  const { data } = await api.get("/platform/deposit-options");
  return data;
};

export const getWalletRules = async () => {
  const { data } = await api.get("/platform/wallet-rules");
  return data;
};

export const getVipProgram = async () => {
  const { data } = await api.get("/platform/vip");
  return data;
};

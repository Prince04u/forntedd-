import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://forntedd.onrender.com/api";

export const playLimbo = async (betData) => {
  try {
    const res = await fetch(`${API_URL}/game/limbo/play`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(betData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getMyLimboBets = async () => {
  try {
    const res = await fetch(`${API_URL}/game/limbo/bets/my`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
};

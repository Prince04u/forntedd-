const TOKEN_KEY = "gaming_platform_token";
const USER_KEY = "gaming_platform_user";

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const user = localStorage.getItem(USER_KEY);
  if (!user || user === "undefined") {
    return null;
  }
  try {
    return JSON.parse(user);
  } catch (e) {
    return null;
  }
};

export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const saveAuth = ({ token, user, profile }) => {
  setToken(token);
  setUser(user || profile);
};

export const clearAuth = () => {
  removeToken();
  removeUser();
};

export const isAuthenticated = () => Boolean(getToken());

export const isPartnerUser = (user) => Boolean(user?.agentProfile);

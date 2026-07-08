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
  return user ? JSON.parse(user) : null;
};

export const removeUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const saveAuth = ({ token, user }) => {
  setToken(token);
  setUser(user);
};

export const clearAuth = () => {
  removeToken();
  removeUser();
};

export const isAuthenticated = () => Boolean(getToken());

export const isPartnerUser = (user) => Boolean(user?.agentProfile);

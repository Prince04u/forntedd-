const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT || "5000";

const isLocalDevHost = (host) => host === "localhost" || host === "127.0.0.1";

const isLanHost = (host) =>
  /^10\.\d+\.\d+\.\d+$/.test(host) ||
  /^192\.168\.\d+\.\d+$/.test(host) ||
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);

const isProductionWebHost = (host) => !isLocalDevHost(host) && !isLanHost(host);

const ensureHttps = (url) => String(url || "").replace(/^http:\/\//i, "https://");

const resolveSocketFromApiEnv = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return "";
  return ensureHttps(apiUrl.replace(/\/api\/?$/, ""));
};

export function getBrowserBackendOrigin() {
  if (typeof window === "undefined") {
    return null;
  }

  return `http://${window.location.hostname}:${DEFAULT_API_PORT}`;
}

export function getApiBaseUrl() {
  const fallback = `http://localhost:${DEFAULT_API_PORT}/api`;
  const envUrl = process.env.NEXT_PUBLIC_API_URL || fallback;

  if (typeof window === "undefined") {
    return envUrl;
  }

  const host = window.location.hostname;

  if (isLocalDevHost(host)) {
    return envUrl;
  }

  // Same Wi-Fi mobile testing only — not production hosts like *.vercel.app
  if (isLanHost(host)) {
    return `${getBrowserBackendOrigin()}/api`;
  }

  if (isProductionWebHost(host) && window.location.protocol === "https:") {
    // Same-origin HTTPS proxy (see next.config.js rewrites) — no mixed content
    return `${window.location.origin}/api`;
  }

  if (isProductionWebHost(host)) {
    if (envUrl.includes("localhost")) {
      const derived = resolveSocketFromApiEnv();
      return derived ? `${derived}/api` : envUrl;
    }
    return ensureHttps(envUrl);
  }

  return envUrl;
}

export function getSocketUrl() {
  const fallback = `http://localhost:${DEFAULT_API_PORT}`;
  let envUrl = process.env.NEXT_PUBLIC_SOCKET_URL || fallback;

  if (typeof window === "undefined") {
    return envUrl;
  }

  const host = window.location.hostname;

  if (isLocalDevHost(host)) {
    return envUrl;
  }

  if (isLanHost(host)) {
    return getBrowserBackendOrigin();
  }

  if (isProductionWebHost(host)) {
    if (!process.env.NEXT_PUBLIC_SOCKET_URL || envUrl.includes("localhost")) {
      const derived = resolveSocketFromApiEnv();
      if (derived) {
        return derived;
      }
    }
    return ensureHttps(envUrl);
  }

  return envUrl;
}

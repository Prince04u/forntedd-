function getBackendOrigin() {
  const fromSocket = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (fromSocket) {
    return fromSocket.replace(/\/$/, "");
  }

  const fromApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromApi) {
    return fromApi.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  if (process.env.VERCEL) {
    return "https://gaming-platform-yy0i.onrender.com";
  }

  return "http://localhost:5000";
}

function toHttps(url) {
  if (process.env.VERCEL) {
    return url.replace(/^http:\/\//i, "https://");
  }
  return url;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendOrigin = toHttps(getBackendOrigin());
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

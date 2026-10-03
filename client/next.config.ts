import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* to Express so the browser sees one origin: the sameSite=strict
  // refresh cookie works and no CORS is needed. API_URL is read at build/start time.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:5000";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;

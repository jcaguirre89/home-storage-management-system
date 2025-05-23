import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/home-storage-management-system/us-central1/api/api/:path*', // Proxy to Firebase emulator
      },
    ];
  },
};

export default nextConfig;

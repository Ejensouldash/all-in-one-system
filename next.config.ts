import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs', 'bcrypt'],
  serverActions: {
    allowedOrigins: ['localhost:3000', '192.168.0.39:3000', '192.168.0.188:3000'],
    bodySizeLimit: '20mb'
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
      allowedOrigins: ['localhost:3000', '192.168.0.39:3000', '192.168.0.188:3000']
    }
  }
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcryptjs', 'bcrypt'],
  // The PDF report reads the logo off disk at request time, so it must be traced into the
  // serverless bundle — it is not picked up automatically from public/.
  outputFileTracingIncludes: {
    '/api/analytics/report': ['./public/assets/BubblesO2_Logo.png'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
      allowedOrigins: ['localhost:3000', '192.168.0.39:3000', '192.168.0.188:3000']
    },
    optimizePackageImports: ['recharts', 'lucide-react', 'date-fns', 'framer-motion', 'exceljs'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Camera remains available for batch scanning. Geolocation is restricted to this origin
          // and requested only when a warehouse user performs a delivery milestone check-in.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
};

export default nextConfig;

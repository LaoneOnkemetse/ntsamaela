/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ntsamaela/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  generateBuildId: async () => {
    return 'replit-build-' + Date.now();
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default-key',
    NEXT_PUBLIC_DEPLOYMENT_ID: 'replit-deployment',
  },
  images: {
    domains: ['localhost', 'your-s3-bucket.s3.amazonaws.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_BACKEND_URL || 'http://localhost:3003/api/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  distDir: '.next',
  experimental: {
    webpackBuildWorker: false,
  },
};

module.exports = nextConfig;



/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@ntsamaela/shared'],
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default-key',
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
  // Clean config for development mode
  distDir: '../../.next',
  allowedHosts: true,
};

module.exports = nextConfig;



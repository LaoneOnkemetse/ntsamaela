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
        destination: 'http://localhost:3003/api/:path*',
      },
    ];
  },
  // Clean config for development mode
  distDir: '../../.next',
};

module.exports = nextConfig;



/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ntsamaela/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove dynamic build ID to ensure static files are found
  // generateBuildId: async () => {
  //   return 'replit-build-' + Date.now();
  // },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || "default-key",
    NEXT_PUBLIC_DEPLOYMENT_ID: "replit-deployment",
  },
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  distDir: ".next",
  output: "standalone",
  experimental: {
    webpackBuildWorker: false,
  },
};

module.exports = nextConfig;

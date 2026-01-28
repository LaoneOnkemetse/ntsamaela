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
  // Remove dynamic build ID to ensure static files are found
  // generateBuildId: async () => {
  //   return 'replit-build-' + Date.now();
  // },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default-key',
    NEXT_PUBLIC_DEPLOYMENT_ID: 'replit-deployment',
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    const backendApi = process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
    const normalizedBackendApi = backendApi.replace(/\/$/, '');
    const backendOrigin = normalizedBackendApi.replace(/\/api$/, '');

    // If env is missing, keep a dev fallback to avoid breaking local dev.
    // In production, you should set API_BACKEND_URL (preferred) or NEXT_PUBLIC_API_URL.
    const devFallbackOrigin = 'http://localhost:3003';
    const apiDestination = normalizedBackendApi
      ? (normalizedBackendApi.endsWith('/api') ? `${normalizedBackendApi}/:path*` : `${normalizedBackendApi}/api/:path*`)
      : `${devFallbackOrigin}/api/:path*`;

    const healthDestinationBase = backendOrigin || devFallbackOrigin;

    return [
      {
        source: '/api/:path*',
        destination: apiDestination,
      },
      // Proxy health endpoints too (backend exposes these at root, not under /api)
      {
        source: '/health',
        destination: `${healthDestinationBase}/health`,
      },
      {
        source: '/health/:path*',
        destination: `${healthDestinationBase}/health/:path*`,
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
  output: 'standalone',
  experimental: {
    webpackBuildWorker: false,
  },
};

module.exports = nextConfig;



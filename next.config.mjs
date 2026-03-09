/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["pg"],
  allowedDevOrigins: [
    "*.replit.dev",
    "*.riker.replit.dev",
    "127.0.0.1",
    process.env.REPLIT_DEV_DOMAIN,
  ].filter(Boolean),
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: /^(?!.*\/(app|lib|shared)\/).*/,
        poll: 2000,
        aggregateTimeout: 500,
      };
    }
    return config;
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/user-attachments/assets/**',
      },
    ],
  },
};

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure self-hosting for production
  images: {
    domains: ['localhost'],
  },
};

export default nextConfig;

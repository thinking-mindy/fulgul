/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: false,
  skipTrailingSlashRedirect: true
};

export default nextConfig;


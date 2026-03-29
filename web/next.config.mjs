/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: Also ignore type errors if they are too invasive 
    // but better to keep them for now since we fixed the major ones.
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('snarkjs', 'circomlibjs');
    }
    return config;
  }
};

export default nextConfig;

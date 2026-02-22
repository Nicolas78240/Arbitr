/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@arbitr/types', '@arbitr/validation', '@arbitr/scoring'],
};

module.exports = nextConfig;

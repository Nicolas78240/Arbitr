/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@arbitr/types', '@arbitr/validation', '@arbitr/scoring'],
};

module.exports = nextConfig;

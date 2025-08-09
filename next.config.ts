import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-side modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        'node:child_process': false,
      };

      // Exclude problematic packages from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        '@sendgrid/mail': 'commonjs @sendgrid/mail',
        'sharp': 'commonjs sharp',
        'detect-libc': 'commonjs detect-libc',
      });
    }
    
    return config;
  },
};

export default nextConfig;

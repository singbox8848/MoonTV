/** @type {import('next').NextConfig} */
/* eslint-disable @typescript-eslint/no-var-requires */
const nextConfig = {
  // standalone 产物只给 Dockerfile 用；Cloudflare Pages 由 next-on-pages 自行打包。
  // 用 BUILD_TARGET=pages 跳过，可省掉一次全量依赖拷贝（在无符号链接权限的
  // Windows 上这一步还会直接失败）。
  output: process.env.BUILD_TARGET === 'pages' ? undefined : 'standalone',
  eslint: {
    dirs: ['src'],
  },

  reactStrictMode: false,
  // swcMinify 在 Next 14 已默认开启，无需显式声明
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  images: {
    // next-on-pages 无法使用 Next 的图片优化服务，统一走外部代理
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // 传输层压缩由 Cloudflare 负责，这里关闭以避免重复压缩
  compress: false,

  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: { not: /\.(css|scss|sass)$/ },
        resourceQuery: { not: /url/ }, // exclude if *.svg?url
        loader: '@svgr/webpack',
        options: {
          dimensions: false,
          titleProp: true,
        },
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);

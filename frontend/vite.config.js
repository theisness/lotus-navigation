import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 允许通过环境变量把本地 dev server 的 /api、/images 代理到线上后端
// 用法：VITE_PROXY_TARGET=https://index.ssbx.site npm run dev
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  publicDir: 'src/public',
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: true,
      },
      '/images': {
        target: proxyTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});

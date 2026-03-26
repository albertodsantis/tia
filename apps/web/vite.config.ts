import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const webRoot = __dirname;
const repoRoot = path.resolve(webRoot, '../..');

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files (local dev); process.env has system vars (Railway/production)
  const fileEnv = loadEnv(mode, repoRoot, '');

  return {
    root: webRoot,
    envDir: repoRoot,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(''),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.join(webRoot, 'src'),
        '@shared': path.join(repoRoot, 'packages', 'shared', 'src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

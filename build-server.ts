import { build } from 'esbuild';

build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.cjs',
  format: 'cjs',
  external: ['express', 'vite', 'express-session', 'googleapis'],
}).catch(() => process.exit(1));

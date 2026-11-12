import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

// Le site est servi sous https://<compte>.github.io/<depot>/ sur GitHub Pages.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  root: 'app',
  base,
  envDir: '..',
  plugins: [svelte()],
  resolve: {
    alias: {
      '@jeu': fileURLToPath(new URL('./supabase/functions/_shared/jeu', import.meta.url)),
      '@donnees': fileURLToPath(new URL('./supabase/functions/_shared/donnees', import.meta.url)),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
  },
  server: { host: true },
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
  },
});

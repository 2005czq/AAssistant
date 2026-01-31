import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => {
  const base = process.env.BASE_PATH ?? (mode === 'production' ? './' : '/');
  return {
    base,
    plugins: [svelte()]
  };
});

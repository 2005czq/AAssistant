import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig(({ mode }) => {
  const base = process.env.BASE_PATH ?? (mode === 'production' ? './' : '/');
  return {
    base,
    plugins: [
      svelte(),
      {
        name: 'skill-utf8',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            if (request.url?.split('?')[0].endsWith('/SKILL.md')) {
              response.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            }
            next();
          });
        }
      }
    ]
  };
});

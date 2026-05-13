import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  base: '/kitsu/',
  srcDir: './src',
  publicDir: './public',
  build: {
    format: 'directory'
  }
});

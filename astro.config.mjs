import { defineConfig } from 'astro/config';
export default defineConfig({
  output: 'static',
  devToolbar: { enabled: false },
  site: 'https://orvio-play.pages.dev',
  trailingSlash: 'always',
});

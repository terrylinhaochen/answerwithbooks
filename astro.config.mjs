import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const utilityPaths = [
  '/login/',
  '/signup/',
  '/my-books/',
  '/profile/',
  '/onboarding/start/',
  '/upload/',
  '/community/',
  '/404/',
];

// https://astro.build/config
export default defineConfig({
  site: 'https://answerwithbooks.com',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  redirects: {
    '/answers/how-do-i-know-if-my-startup-idea-is-any-good/':
      '/answers/how-to-validate-an-idea-without-fooling-yourself/',
    '/answers/what-does-the-mom-test-teach-about-user-interviews/':
      '/answers/how-to-run-user-interviews-that-do-not-lie-to-you/',
    '/answers/when-can-i-trust-my-intuition/': '/answers/how-to-know-when-to-trust-your-gut/',
    '/answers/when-should-i-abandon-my-current-approach/':
      '/answers/how-to-tell-whether-to-pivot-or-keep-going/',
    '/answers/why-do-smart-teams-make-dumb-decisions/':
      '/answers/how-to-keep-a-smart-team-from-making-a-dumb-decision/',
    '/answers/why-do-top-down-plans-fail/':
      '/answers/how-to-make-a-plan-that-survives-contact-with-reality/',
    '/topics/my-career/': '/topics/career/',
  },
  integrations: [
    sitemap({
      filter: (page) => !utilityPaths.some((path) => page.endsWith(path)),
      lastmod: new Date(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function offlineShell() {
  return {
    name: 'offline-presentation-shell',
    apply: 'build' as const,
    writeBundle() {
      const output = 'dist';
      const assets = readdirSync(join(output, 'assets')).map((file) => `/assets/${file}`);
      const version = createHash('sha256').update(readFileSync(join(output, 'index.html'))).digest('hex').slice(0, 16);
      const files = ['/', ...assets];
      writeFileSync(join(output, 'sw.js'), `
const CACHE = ${JSON.stringify(`houkago-shell-${version}`)};
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (event) => event.waitUntil(
  caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
));
self.addEventListener('activate', (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('houkago-shell-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then((cache) => cache.match('/'))));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then((cache) => cache.match(url.pathname, { ignoreVary: true }).then((response) => response || fetch(request))));
  }
});
`);
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineShell()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

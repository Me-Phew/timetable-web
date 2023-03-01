import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // /timetable/
  base: "/",
  plugins: [
    vue(),
    VitePWA({
      injectRegister: null,
      strategies: 'injectManifest',
      filename: 'firebase-messaging-sw.js',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Rozkład jazdy',
        short_name: 'Rozkład jazdy',
        description: 'Nieoficjalna aplikacja do śledzenia czasu odjazdu autobusów MPK Nowy Sącz',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

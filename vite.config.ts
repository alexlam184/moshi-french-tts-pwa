import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs', dest: 'onnx' },
        { src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', dest: 'onnx' },
        { src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs', dest: 'onnx' },
        { src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm', dest: 'onnx' },
        { src: 'node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.data', dest: 'piper' },
        { src: 'node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.wasm', dest: 'piper' },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'moshi-french-tts-pwa',
        short_name: 'moshi-french-tts-pwa',
        description: 'Private, local-first French listening practice.',
        theme_color: '#f6f6f2',
        background_color: '#f6f6f2',
        display: 'standalone',
        orientation: 'any',
        lang: 'en',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,mjs,css,html,svg,woff2,wasm,data}'],
        maximumFileSizeToCacheInBytes: 30_000_000,
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'moshi-french-tts-pwa-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } }
        }]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx']
  }
})

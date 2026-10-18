import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [react(), VitePWA({
        registerType: 'prompt',
        includeAssets: ['apple-touch-icon.png'],
        manifest: {
            id: '/',
            name: 'Night Shift',
            short_name: 'Night Shift',
            description: 'シフトの提出・確認・管理',
            lang: 'ja',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            theme_color: '#00796B',
            background_color: '#FFFFFF',
            icons: [
                { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
        },
        workbox: {
            globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
            navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/sanctum(?:\/|$)/, /^\/auth(?:\/|$)/],
            cleanupOutdatedCaches: true,
        },
    })],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            protocol: 'ws',
        },
        watch: {
            usePolling: true,
            interval: 2000,
            binaryInterval: 5000,
            ignored: ['node_modules', 'dist', '.git', 'vendor'],
        },
    },
    resolve: {
        alias: {
            '@': '/ts',
        },
    },
})

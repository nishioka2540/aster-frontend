import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
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

import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '127.0.0.1', // Required by Spotify - must use 127.0.0.1, not localhost
        port: 5173,
    },
    build: {
        rollupOptions: {
            input: {
                main: './index.html',
                login: './login.html',
                scanner: './scanner.html',
                playlists: './playlists.html',
            },
        },
        // Note: PWA files (manifest.json, sw.js, icons) in public/ folder
        // are automatically copied to dist/ during build
    },
});
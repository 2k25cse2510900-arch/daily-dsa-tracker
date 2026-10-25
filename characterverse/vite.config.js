import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const embedded = mode === 'embed';
  return {
    base: embedded ? '/characterverse-embed/' : '/characterverse/',
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env': '{}',
    },
    build: embedded ? {
      outDir: 'dist-embed',
      emptyOutDir: true,
      lib: {
        entry: 'src/embed.jsx',
        name: 'CharacterVerseEmbed',
        formats: ['iife'],
        fileName: () => 'characterverse-embed.js',
      },
      rollupOptions: {
        output: { assetFileNames: 'characterverse-embed.css' },
      },
    } : undefined,
  };
})

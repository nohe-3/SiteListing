import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname),
        }
      },
      build: {
        chunkSizeWarningLimit: 6000,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('@mlc-ai/web-llm')) {
                  return 'web-llm-vendor';
                }
                if (id.includes('youtubei.js')) {
                  return 'youtubei-vendor';
                }
                if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                  return 'react-vendor';
                }
                if (id.includes('hls.js')) {
                  return 'hls-vendor';
                }
                return 'vendor';
              }
            },
          },
        },
      },
      server: {
        host: '0.0.0.0',
        port: 5000,
        allowedHosts: true,
        proxy: {
          '/api': {
            target: 'http://localhost:10000',
            changeOrigin: true,
          }
        }
      }
    };
});

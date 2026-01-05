import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

// FIX: Get __dirname in an ES module environment to avoid using process.cwd(), which had typing issues.
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
          // FIX: '__dirname' is not available in ESM modules. Using 'process.cwd()' to get the project root.
          '@': path.resolve(__dirname),
        }
      }
    };
});
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Resolve proxy target: prioritize local backend port if running locally
  let rawTarget = env.VITE_BACKEND_URL || env.VITE_API_BASE_URL || 'http://localhost:5000';
  let proxyTarget = String(rawTarget).trim().replace(/\/+$/, '');
  if (proxyTarget.endsWith('/api')) {
    proxyTarget = proxyTarget.slice(0, -4);
  }
  if (!proxyTarget.startsWith('http://') && !proxyTarget.startsWith('https://')) {
    proxyTarget = 'http://localhost:5000';
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      // Development proxy for backend API communication
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'lucide-icons': ['lucide-react'],
            'export-libs': ['xlsx', 'jspdf', 'jspdf-autotable', 'html2canvas']
          }
        }
      }
    }
  };
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, '../'),
  publicDir: 'html',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, '../html/index.html'),
        login: resolve(__dirname, '../html/login.html'),
        student: resolve(__dirname, '../html/student.html'),
        teacher: resolve(__dirname, '../html/teacher.html'),
        admin: resolve(__dirname, '../html/admin.html'),
        error: resolve(__dirname, '../html/error.html')
      }
    }
  }
});
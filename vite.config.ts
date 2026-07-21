import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base: the page works at '/', at '/ai-assets/', and at whatever path an
  // internal Git server mounts it under — no per-deployment configuration. Safe only
  // because this is a single page with no client-side routing; nested routes would
  // need a real base again.
  base: './',
})

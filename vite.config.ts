import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves a project repo under /<repo>/. The deploy workflow sets
  // BASE_PATH; local dev and an org-level *.github.io repo both want '/'.
  base: process.env.BASE_PATH ?? '/',
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/seats-3d/',   // served from frontend/seats-3d/ on port 3000
  server: {
    port: 5174,
    cors: true,
  },
  build: {
    outDir: '../seats-3d',  // frontend/seats-react/ → ../seats-3d = frontend/seats-3d/
    emptyOutDir: true,
  },
})

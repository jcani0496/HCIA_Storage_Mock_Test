import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/HCIA_Storage_Mock_Test/',   // 👈 subruta de Pages
  plugins: [react()],
  server: { hmr: { overlay: false } }
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 讓它部署在 GitHub Pages 的子路徑時也能正常讀取資源
export default defineConfig({
  base: './',
  plugins: [react()],
})

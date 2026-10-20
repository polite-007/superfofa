import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Wails dev server 通过 34115 端口代理到 vite，需要监听所有地址
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
})

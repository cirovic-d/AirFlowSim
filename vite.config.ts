import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

// Tauri expects a fixed port during development.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  // The 3D view (Three.js) is its own lazily loaded chunk of ~550 kB.
  build: { chunkSizeWarningLimit: 600 },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});

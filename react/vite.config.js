import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../html/js",
    emptyOutDir: false,
    rollupOptions: {
      treeshake: false,
      output: {
        entryFileNames: "react-bridge.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        format: "es",
      },
    },
  },
});

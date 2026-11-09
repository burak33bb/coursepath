import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/coursepath/" : "/",
  build: { chunkSizeWarningLimit: 600 },
});

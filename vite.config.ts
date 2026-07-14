import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// GitHub Pages serves this repo under /agent-anatomy/. Every asset and route
// must carry that prefix, so `base` is set here and verified live at M0.
export default defineConfig({
  base: "/agent-anatomy/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        episode: resolve(__dirname, "episodes/how-an-agent-works/index.html"),
        episode15: resolve(__dirname, "episodes/where-agents-go-wrong/index.html"),
      },
    },
  },
});

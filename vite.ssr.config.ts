import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * SSR bundle for the build-time prerender (scripts/prerender.ts).
 * base must match vite.config.ts so import.meta.env.BASE_URL agrees
 * between server-rendered markup and the hydrating client.
 */
export default defineConfig({
  base: "/agent-anatomy/",
  plugins: [react()],
  build: {
    ssr: "src/prerender/entry-server.tsx",
    outDir: "dist-ssr",
  },
});

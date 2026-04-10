import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  // basicSsl only for local dev, not for build
  plugins: command === "serve" ? [react(), basicSsl()] : [react()],
  // GitHub Pages: set to "/<repo-name>/" for project sites, or "/" for user sites
  // Change this to match your GitHub repo name
  base: "/Full_initiative_tracker/",
  server: {
    cors: {
      origin: "*",
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
      credentials: false,
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        combatEffect: resolve(__dirname, "combat-effect.html"),
      },
    },
  },
}));

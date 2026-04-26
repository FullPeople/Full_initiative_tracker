import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  plugins: command === "serve" ? [preact(), basicSsl()] : [preact()],
  base: "/initiative/",
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
        background: resolve(__dirname, "background.html"),
        panel: resolve(__dirname, "panel.html"),
        combatEffect: resolve(__dirname, "combat-effect.html"),
      },
    },
  },
}));

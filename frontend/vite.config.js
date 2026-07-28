import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/Laboratory": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
      "/lab_distribution1.png": "http://localhost:4000",
      "/lab_distribution_map.png": "http://localhost:4000",
    },
  },
});



import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  // Dev-only: honor the port a preview harness assigns via PORT (Vite ignores
  // the env var by itself); no effect on builds or the default `npm run dev`.
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
});

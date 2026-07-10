import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const packageVersion = (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }).version;

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageVersion),
  },
  // Dev-only: honor the port a preview harness assigns via PORT (Vite ignores
  // the env var by itself); no effect on builds or the default `npm run dev`.
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
});

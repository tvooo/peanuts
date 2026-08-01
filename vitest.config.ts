import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    // Must mirror vite.config.ts — plugin-react v6 silently ignores a `babel`
    // option, which would leave decorators untransformed here.
    babel({
      plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]],
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src/"),
    },
  },
});

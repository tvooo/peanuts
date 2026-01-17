import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          "@babel/plugin-transform-class-static-block",
          ["@babel/plugin-proposal-decorators", { version: "2023-05" }],
        ],
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/"),
    },
  },
});

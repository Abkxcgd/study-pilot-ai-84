import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/components/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
      exclude: [
        "src/lib/*.server.ts",
        "src/lib/*.functions.ts",
        "src/lib/ai-gateway.server.ts",
        "src/lib/error-*.ts",
        "src/lib/lovable-error-reporting.ts",
        "src/components/ui/**",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 70,
        branches: 70,
      },
    },
  },
});

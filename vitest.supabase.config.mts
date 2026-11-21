import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 本物の Supabase につないで確かめる（npm run check:supabase）。通常の npm test では動かない
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: ["tests/supabase-live.check.ts"],
    sequence: { concurrent: false },
    testTimeout: 20000,
  },
});

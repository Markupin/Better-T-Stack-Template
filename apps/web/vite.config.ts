import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Vercel functions only ship the bundle (no varlock binary or .env.schema), so on
// Vercel the env resolved at build time is baked into the server bundle, encrypted
// with _VARLOCK_ENV_KEY (`varlock generate-key`), which must also be set at runtime.
// Docker / VPS keep resolving env at runtime via varlock/auto-load.
const isVercel = !!process.env.VERCEL;
if (isVercel && !process.env._VARLOCK_ENV_KEY) {
  throw new Error(
    "_VARLOCK_ENV_KEY must be set on Vercel (generate one with `varlock generate-key`)",
  );
}

export default defineConfig({
  server: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    // Bundle all SSR deps in one pass. Otherwise CJS deps that require("react")
    // (use-sync-external-store via @base-ui) resolve a second React copy at
    // runtime and SSR crashes with "Cannot read properties of null (useSyncExternalStore)".
    noExternal: true,
  },
  plugins: [
    varlockVitePlugin({ ssrInjectMode: isVercel ? "resolved-env" : "auto-load" }),
    tailwindcss(),
    tanstackStart(),
    // node-server for Docker / VPS; vercel when building on Vercel. NITRO_PRESET overrides.
    nitro({ preset: process.env.NITRO_PRESET || (isVercel ? "vercel" : "node-server") }),
    viteReact(),
  ],
});

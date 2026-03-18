import path from "path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { fileURLToPath } from "url";

const configFilePath = fileURLToPath(import.meta.url);
const configDir = path.dirname(configFilePath);
const repoRoot = path.resolve(configDir, "../..");

// The repo keeps shared env in the workspace root, so load it explicitly for Next.
loadEnvConfig(repoRoot);

export default function nextConfig(phase: string): NextConfig {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    // Keep dev and production outputs separate so a running `next dev` process cannot
    // read partially-overwritten artifacts after `next build` runs in the same repo.
    distDir: isDevServer ? ".next-dev" : ".next",
    webpack(config, { isServer }) {
      if (isServer && config.output) {
        // Next emits server async chunks under `server/chunks/`; keep the runtime pointing
        // there instead of resolving numeric chunks from the server root.
        config.output.chunkFilename = "chunks/[id].js";
      }

      return config;
    }
  };
}

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const appDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appDir, "../..");
const nextBin = path.resolve(repoRoot, "node_modules/next/dist/bin/next");

loadEnvConfig(repoRoot);

const [command = "dev", ...args] = process.argv.slice(2);

const child = spawn(process.execPath, [nextBin, command, ...args], {
  cwd: appDir,
  env: process.env,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

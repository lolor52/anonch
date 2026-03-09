import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { runVisualCheck } from "./visual-check.mjs";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";

async function main() {
  let serverProcess = null;

  try {
    if (!(await isServerReady(baseUrl))) {
      serverProcess = startStaticServer();
      await waitForServer(baseUrl, 15_000);
    }

    await runVisualCheck();
  } finally {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
    }
  }
}

function startStaticServer() {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";

  return spawn(command, ["http-server", ".", "-p", "4173", "-c-1", "--silent"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(url)) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Не удалось дождаться локального сервера ${url}.`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

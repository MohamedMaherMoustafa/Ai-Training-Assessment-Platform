import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CLIENT_DIR = path.join(ROOT, "client");
const PROXY_DIR = path.join(ROOT, "llm-proxy");
const MODELFILE_PATH = path.join(ROOT, "llm-training", "Modelfile");

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const TARGET_MODEL = process.env.OLLAMA_MODEL || "academy-tutor";

const children = [];

function log(tag, msg) {
  console.log(`[${tag}] ${msg}`);
}

function findOllamaBinary() {
  const candidates = [
    "ollama",
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
    "C:\\Program Files\\Ollama\\ollama.exe",
  ];
  for (const bin of candidates) {
    if (bin !== "ollama" && !fs.existsSync(bin)) continue;
    const probe = spawnSync(bin, ["--version"], { stdio: "ignore", shell: false });
    if (probe.status === 0) return bin;
  }
  return null;
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body || "{}") });
        } catch {
          resolve({ status: res.statusCode, data: {} });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(2000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

function httpPostJson(url, payload) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.write(data);
    req.end();
  });
}

async function waitForOllama(maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await httpGetJson(`${OLLAMA_URL}/api/tags`);
      if (res.status === 200) return res.data;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  return null;
}

async function ensureOllamaAndModel() {
  let tagsData = null;
  try {
    const res = await httpGetJson(`${OLLAMA_URL}/api/tags`);
    if (res.status === 200) {
      tagsData = res.data;
      log("LLM", `Ollama already running at ${OLLAMA_URL}`);
    }
  } catch {
    // not running yet
  }

  const ollamaBin = findOllamaBinary();
  if (!tagsData) {
    if (!ollamaBin) {
      log(
        "LLM",
        "Ollama binary not found on this machine yet. Install from https://ollama.com/download to enable live local AI inference."
      );
      return;
    }
    log("LLM", "Starting Ollama server automatically...");
    const ollamaProc = spawn(ollamaBin, ["serve"], {
      stdio: "ignore",
      detached: false,
      windowsHide: true,
    });
    children.push(ollamaProc);
    tagsData = await waitForOllama();
    if (!tagsData) {
      log("LLM", "Ollama did not become ready in time; continuing with Platform Proxy & UI.");
      return;
    }
    log("LLM", `Ollama ready at ${OLLAMA_URL}`);
  }

  const models = Array.isArray(tagsData?.models) ? tagsData.models.map((m) => m.name) : [];
  const hasTarget = models.some((m) => m === TARGET_MODEL || m.startsWith(`${TARGET_MODEL}:`));

  if (!hasTarget && ollamaBin && fs.existsSync(MODELFILE_PATH)) {
    log("LLM", `Registering trained model '${TARGET_MODEL}' from llm-training/Modelfile...`);
    const created = spawnSync(ollamaBin, ["create", TARGET_MODEL, "-f", MODELFILE_PATH], {
      cwd: path.join(ROOT, "llm-training"),
      stdio: "inherit",
    });
    if (created.status === 0) {
      log("LLM", `Model '${TARGET_MODEL}' registered.`);
    }
  }

  const activeModel = hasTarget ? TARGET_MODEL : models[0];
  if (activeModel) {
    log("LLM", `Warming up model '${activeModel}' in memory...`);
    httpPostJson(`${OLLAMA_URL}/api/generate`, {
      model: activeModel,
      prompt: "",
      keep_alive: "15m",
    })
      .then(() => log("LLM", `Model '${activeModel}' warmed and ready.`))
      .catch(() => {});
  }
}

function startProxy() {
  log("Proxy", "Starting Platform AI Proxy on http://localhost:3001 ...");
  const proxyProc = spawn(process.execPath, [path.join(PROXY_DIR, "server.js")], {
    cwd: PROXY_DIR,
    stdio: "inherit",
  });
  children.push(proxyProc);
  proxyProc.on("exit", (code) => {
    if (code !== null && code !== 0) {
      log("Proxy", `Exited with code ${code}`);
    }
  });
}

function startClient() {
  log("Client", "Starting React Vite App on http://localhost:5173 ...");
  const viteBin = path.join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const clientProc = spawn(process.execPath, [viteBin, "--host"], {
    cwd: CLIENT_DIR,
    stdio: "inherit",
  });
  children.push(clientProc);
  clientProc.on("exit", (code) => {
    shutdown(code || 0);
  });
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  log("Platform", "Starting AI Training & Assessment Platform (LLM + AI Proxy + Web Client)...");
  await ensureOllamaAndModel();
  startProxy();
  startClient();
}

main();


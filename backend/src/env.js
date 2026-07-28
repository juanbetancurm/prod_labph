import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let loaded = false;

function parseEnvValue(rawValue) {
  let value = rawValue.trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
}

export function loadBackendEnv() {
  if (loaded) {
    return;
  }

  loaded = true;

  const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const envFile = path.join(backendRoot, ".env");

  if (!fs.existsSync(envFile)) {
    return;
  }

  const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = parseEnvValue(trimmed.slice(separatorIndex + 1));

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

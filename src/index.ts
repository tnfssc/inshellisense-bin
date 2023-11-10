import { execSync } from "node:child_process";
import * as path from "node:path";
import * as fsm from "node:fs/promises";
import * as fs from "node:fs";
import * as stream from "node:stream/promises";
import { platform } from "node:os";
import caxa from "caxa";
import extract from "extract-zip";

const Platform = platform();
if (Platform !== "win32" && Platform !== "darwin" && Platform !== "linux") throw new Error("Unsupported platform");
const DEFAULT_TEMP_DIR: Record<typeof Platform, string> = {
  win32: process.env.TEMP || "C:\\Windows\\Temp",
  darwin: process.env.TMPDIR || "/tmp",
  linux: process.env.TMPDIR || "/tmp",
};
const TEMP_DIR = DEFAULT_TEMP_DIR[Platform];
const DOWNLOAD_PATH = path.join(TEMP_DIR, "inshellisense.zip");
const EXTRACT_DIR = path.join(TEMP_DIR, "inshellisense");

const cleanup = async () =>
  await Promise.all([
    fsm.rm(EXTRACT_DIR, { recursive: true }).catch(() => {}),
    fsm.unlink(DOWNLOAD_PATH).catch(() => {}),
  ]);
await cleanup();

const DOWNLOAD_URL = "https://github.com/microsoft/inshellisense/archive/refs/heads/main.zip";
const body = (await fetch(DOWNLOAD_URL).then(res => res.body)) as NodeJS.ReadableStream | null;
if (!body) throw new Error("Failed to download inshellisense");
await stream.pipeline(body, fs.createWriteStream(DOWNLOAD_PATH));

await extract(DOWNLOAD_PATH, { dir: EXTRACT_DIR });

const PROJECT_DIR = path.join(EXTRACT_DIR, "inshellisense-main");
execSync("npm install", { cwd: PROJECT_DIR });
execSync("npm run build", { cwd: PROJECT_DIR });

const OUTPUT_FILENAME: Record<typeof Platform, string> = {
  darwin: "inshellisense-darwin",
  linux: "inshellisense-linux",
  win32: "inshellisense-windows.exe",
};
await fsm.mkdir(path.join(process.cwd(), "bin"), { recursive: true });
await caxa({
  input: PROJECT_DIR,
  output: path.join(process.cwd(), "bin", OUTPUT_FILENAME[Platform]),
  command: ["{{caxa}}/node_modules/.bin/node", "{{caxa}}/build/index.js"],
  exclude: [
    ".git",
    ".github",
    "docs",
    "src",
    ".eslintrc.cjs",
    ".gitignore",
    "package-lock.json",
    "package.json",
    "README.md",
    "tsconfig.json",
    ".prettierrc",
    "jest.config.cjs",
    "SECURITY.md",
    "LICENSE",
    "CODE_OF_CONDUCT.md",
    "SUPPORT.md",
  ],
});

await cleanup();

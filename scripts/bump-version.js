#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");
const APP_JSON_PATH = path.join(ROOT, "app.json");

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function bumpPatch(version) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    console.error(`Invalid semver: "${version}". Expected x.y.z`);
    process.exit(1);
  }
  parts[2] += 1;
  return parts.join(".");
}

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return null;
  }
}

// ── Read current version ────────────────────────────────────────────────────

const pkg = readJSON(PKG_PATH);
const oldVersion = pkg.version || "0.0.0";
const newVersion = bumpPatch(oldVersion);

// ── Update package.json ─────────────────────────────────────────────────────

pkg.version = newVersion;
writeJSON(PKG_PATH, pkg);
console.log(`package.json  ${oldVersion} → ${newVersion}`);

// ── Update app.json (expo.version) ──────────────────────────────────────────

if (fs.existsSync(APP_JSON_PATH)) {
  const appJson = readJSON(APP_JSON_PATH);
  if (appJson.expo) {
    const prev = appJson.expo.version || oldVersion;
    appJson.expo.version = newVersion;
    writeJSON(APP_JSON_PATH, appJson);
    console.log(`app.json      ${prev} → ${newVersion}`);
  }
}

// ── Auto-commit the version bump ────────────────────────────────────────────

const isGitRepo = git("git rev-parse --is-inside-work-tree");

if (isGitRepo === "true") {
  git(`git add "${PKG_PATH}" "${APP_JSON_PATH}"`);

  const staged = git("git diff --cached --name-only");
  if (staged) {
    const msg = `chore(mobile): bump version to ${newVersion}`;
    git(`git commit -m "${msg}"`);
    console.log(`Committed: "${msg}"`);
  } else {
    console.log("Nothing to commit (files unchanged).");
  }
} else {
  console.log("Not inside a git repository — skipping commit.");
}

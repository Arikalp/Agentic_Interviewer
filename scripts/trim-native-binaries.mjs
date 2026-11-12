/**
 * Trims onnxruntime-node's native binaries to the current platform/arch.
 *
 * The npm package ships native binaries for ALL platforms (darwin, linux x64+arm64,
 * win32 x64+arm64 — ~208 MB total). Vercel's serverless packaging kept pulling the
 * whole directory into the Lambda bundle (~400 MB, exceeding the 250 MB limit).
 *
 * Vercel serverless functions run on Linux x64, so every other platform's binaries
 * are dead weight. This script deletes them before `next build` runs on Vercel so
 * they can never be traced or packaged.
 *
 * Runs only on Linux (i.e. Vercel). Local Windows/macOS dev keeps its own platform
 * binaries untouched. Safe to re-run; idempotent.
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

if (process.platform !== 'linux') {
  console.log(`[trim-native] Skipping: not running on Linux (platform=${process.platform}).`);
  process.exit(0);
}

const binRoot = join(
  process.cwd(),
  'node_modules',
  'onnxruntime-node',
  'bin',
  'napi-v3',
);

if (!existsSync(binRoot)) {
  console.log('[trim-native] onnxruntime-node not installed, nothing to trim.');
  process.exit(0);
}

let freedBytes = 0;

for (const platformDir of readdirSync(binRoot, { withFileTypes: true })) {
  if (!platformDir.isDirectory()) continue;

  if (platformDir.name !== process.platform) {
    // Entire other-OS directory (darwin, win32, ...).
    freedBytes += removeDir(join(binRoot, platformDir.name));
    continue;
  }

  // Current OS: keep only the current architecture.
  for (const archDir of readdirSync(join(binRoot, platformDir.name), { withFileTypes: true })) {
    if (archDir.isDirectory() && archDir.name !== process.arch) {
      freedBytes += removeDir(join(binRoot, platformDir.name, archDir.name));
    }
  }
}

console.log(
  `[trim-native] Kept node_modules/onnxruntime-node/bin/napi-v3/${process.platform}/${process.arch}. ` +
    `Freed ${(freedBytes / 1048576).toFixed(1)} MB.`,
);

function removeDir(dir) {
  let bytes = 0;
  try {
    bytes = dirSize(dir);
    rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[trim-native] Could not remove ${dir}: ${error.message}`);
    return 0;
  }
  return bytes;
}

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(full);
    } else {
      try {
        total += statSync(full).size;
      } catch {
        // Unreadable entry — ignore.
      }
    }
  }
  return total;
}

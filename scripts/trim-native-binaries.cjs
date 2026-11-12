/**
 * Trims onnxruntime-node's native binaries to the current platform/arch.
 *
 * The npm package ships native binaries for ALL platforms (darwin, linux x64+arm64,
 * win32 x64+arm64 — ~208 MB total). Vercel's serverless packaging kept pulling the
 * whole directory into the Lambda bundle (~400 MB, exceeding the 250 MB limit).
 *
 * Vercel serverless functions run on Linux x64, so every other platform's binaries
 * are dead weight. This runs automatically during `next build` on Linux via
 * next.config.js (and can also be invoked from the CLI: `npm run trim:native`),
 * so the extra binaries can never be traced or packaged.
 *
 * No-op on non-Linux machines (local Windows/macOS dev keeps its own binaries).
 * Safe to re-run; idempotent.
 */
'use strict';

const { existsSync, readdirSync, rmSync, statSync } = require('node:fs');
const { join } = require('node:path');
const process = require('node:process');

function trimNativeBinaries() {
  if (process.platform !== 'linux') {
    console.log(`[trim-native] Skipping: not running on Linux (platform=${process.platform}).`);
    return 0;
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
    return 0;
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
        continue;
      }

      // onnxruntime-node's postinstall downloads ~330 MB of CUDA/TensorRT GPU
      // provider binaries into the Linux x64 folder (they are not bundled in
      // the npm package). This app only uses the CPU execution provider, so
      // they are pure dead weight — remove them.
      const archDirPath = join(binRoot, platformDir.name, archDir.name);
      for (const gpuFile of ['libonnxruntime_providers_cuda.so', 'libonnxruntime_providers_tensorrt.so']) {
        const gpuPath = join(archDirPath, gpuFile);
        if (existsSync(gpuPath)) {
          freedBytes += removeFile(gpuPath);
        }
      }
    }
  }

  console.log(
    `[trim-native] Kept node_modules/onnxruntime-node/bin/napi-v3/${process.platform}/${process.arch}. ` +
      `Freed ${(freedBytes / 1048576).toFixed(1)} MB.`,
  );
  return freedBytes;
}

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

function removeFile(file) {
  try {
    const bytes = statSync(file).size;
    rmSync(file, { force: true });
    return bytes;
  } catch (error) {
    console.warn(`[trim-native] Could not remove ${file}: ${error.message}`);
    return 0;
  }
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

module.exports = { trimNativeBinaries };

// CLI usage: `node scripts/trim-native-binaries.cjs`
if (require.main === module) {
  trimNativeBinaries();
}

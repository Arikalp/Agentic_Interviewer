/** @type {import('next').NextConfig} */

// On the build machine (Vercel runs Linux), strip the non-Linux native binaries
// from onnxruntime-node BEFORE tracing/packaging happens. The package ships
// ~208 MB of darwin/win32/arm64 binaries, and its postinstall downloads another
// ~330 MB of CUDA/TensorRT GPU libraries on Linux — all of which Vercel's
// packager kept pulling into the serverless bundle (~400 MB), exceeding the
// 250 MB limit. Running this here (instead of only via a build command)
// guarantees it always executes, no matter how Vercel invokes the build.
// VERCEL is set during builds AND runtime; VERCEL_REGION is only set at
// runtime, so this only trims during builds — never on a cold start.
if (process.env.VERCEL && !process.env.VERCEL_REGION && process.platform === 'linux') {
  try {
    require('./scripts/trim-native-binaries.cjs').trimNativeBinaries();
  } catch (error) {
    console.warn('[trim-native] Pre-build trim failed:', error.message);
  }
}

// Vercel's serverless build does not trace the native shared libraries of
// onnxruntime-node (libonnxruntime.so.1) or the Rust tokenizers binding,
// causing "cannot open shared object file" errors at runtime. Force-include
// the Linux native binaries plus the pre-downloaded bge-small ONNX model
// (local_cache is committed to git, so it is present at build time) for
// every route that reaches the embedder.
// Keys are URL route globs matched with picomatch (see Next.js docs).
const nativeModuleIncludes = [
  // Vercel serverless functions run on Linux x64; arm64 builds are never used.
  './node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**',
  './node_modules/@anush008/tokenizers-linux-x64-*/**',
  './local_cache/**',
];

// Never bundle macOS/Windows native binaries into server traces —
// serverless functions run on Linux x64 and every byte counts against
// Vercel's function size limit.
const nativeModuleExcludes = [
  './node_modules/onnxruntime-node/bin/napi-v3/darwin/**',
  './node_modules/onnxruntime-node/bin/napi-v3/win32/**',
  './node_modules/@anush008/tokenizers-darwin-*/**',
  './node_modules/@anush008/tokenizers-win32-*/**',
];

const nextConfig = {
  // fastembed uses native Node.js binaries (@anush008/tokenizers, onnxruntime-node)
  // that cannot be bundled by Turbopack/Webpack into ESM chunks.
  // Marking them as server-external tells Next.js to require() them at runtime.
  serverExternalPackages: [
    'fastembed',
    '@anush008/tokenizers',
    'onnxruntime-node',
  ],

  outputFileTracingIncludes: {
    '/api/resume/**': nativeModuleIncludes,
    '/api/interview/rag-question/**': nativeModuleIncludes,
  },

  outputFileTracingExcludes: {
    '/api/resume/**': nativeModuleExcludes,
    '/api/interview/rag-question/**': nativeModuleExcludes,
  },

  // Silence the "multiple lockfiles" workspace root warning
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;

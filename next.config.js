/** @type {import('next').NextConfig} */

// Vercel's serverless build does not trace the native shared libraries of
// onnxruntime-node (libonnxruntime.so.1) or the Rust tokenizers binding,
// causing "cannot open shared object file" errors at runtime. Force-include
// the Linux native binaries plus the pre-downloaded bge-small ONNX model
// (local_cache is committed to git, so it is present at build time) for
// every route that reaches the embedder.
const nativeModuleIncludes = [
  './node_modules/onnxruntime-node/bin/napi-v3/linux/**',
  './node_modules/@anush008/tokenizers-linux-*/**',
  './local_cache/**',
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

  // Keys cover both URL-path and source-path styles to work across builds.
  outputFileTracingIncludes: {
    // URL-path keys
    '/api/resume/**': nativeModuleIncludes,
    '/api/interview/rag-question/**': nativeModuleIncludes,
    // Source-path keys (fallback, ignored if unmatched)
    'app/api/resume/**': nativeModuleIncludes,
    'app/api/interview/rag-question/**': nativeModuleIncludes,
  },

  // Silence the "multiple lockfiles" workspace root warning
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;

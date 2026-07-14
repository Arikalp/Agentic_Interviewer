/** @type {import('next').NextConfig} */
const nextConfig = {
  // fastembed uses native Node.js binaries (@anush008/tokenizers, onnxruntime-node)
  // that cannot be bundled by Turbopack/Webpack into ESM chunks.
  // Marking them as server-external tells Next.js to require() them at runtime.
  serverExternalPackages: [
    'fastembed',
    '@anush008/tokenizers',
    'onnxruntime-node',
  ],

  // Silence the "multiple lockfiles" workspace root warning
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;

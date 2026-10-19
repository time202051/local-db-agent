// 把已编译的 dist（tsc 产物）打成一个单文件 dist/app.mjs：
// - 纯 JS 依赖全部内联 → 发布包不再需要 node_modules（除原生 msnodesqlv8）
// - msnodesqlv8 是原生模块，保持 external，需随包携带
// - ESM 输出 + createRequire banner：修复 CJS 依赖里的动态 require
import { build } from "esbuild";

await build({
  entryPoints: ["dist/index.js"],
  outfile: "dist/app.mjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external: ["msnodesqlv8"],
  banner: {
    js: "import{createRequire}from'module';const require=createRequire(import.meta.url);",
  },
  // warning only: keep build logs quiet (build-release.ps1 runs this via npm)
  logLevel: "warning",
});

console.log("[bundle] dist/app.mjs written");


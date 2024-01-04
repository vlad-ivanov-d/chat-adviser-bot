import { build } from "esbuild";
import copyStaticFiles from "esbuild-copy-static-files";
import { rimraf } from "rimraf";

await rimraf("dist/*", { glob: true });

await build({
  bundle: true,
  entryPoints: [{ in: "src/index.ts", out: "index" }],
  minifyIdentifiers: false,
  minifySyntax: true,
  minifyWhitespace: true,
  outdir: "dist",
  platform: "node",
  plugins: [
    copyStaticFiles({
      dest: "./dist/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node",
      src: "./node_modules/.prisma/client/libquery_engine-linux-musl-arm64-openssl-3.0.x.so.node",
    }),
    copyStaticFiles({
      dest: "./dist/libquery_engine-linux-musl-openssl-3.0.x.so.node",
      src: "./node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node",
    }),
    copyStaticFiles({ dest: "./dist/schema.prisma", src: "./prisma/schema.prisma" }),
  ],
  target: "esnext",
});

// eslint-disable-next-line no-console
console.log("⚡ Done"); // Put to console for debugging purposes

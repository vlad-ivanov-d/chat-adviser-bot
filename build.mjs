import copyPlugin from "@sprout2000/esbuild-copy-plugin";
import * as esbuild from "esbuild";
import { rimraf } from "rimraf";

await rimraf("dist/*", { glob: true });

await esbuild.build({
  bundle: true,
  entryPoints: [{ in: "src/index.ts", out: "node/index" }],
  minifyIdentifiers: false,
  minifySyntax: true,
  minifyWhitespace: true,
  outdir: "dist",
  platform: "node",
  plugins: [
    copyPlugin.copyPlugin({
      dest: "./dist/node/libquery_engine-debian-openssl-3.0.x.so.node",
      src: "./node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node",
    }),
    copyPlugin.copyPlugin({
      dest: "./dist/node/libquery_engine-linux-arm64-openssl-3.0.x.so.node",
      src: "./node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node",
    }),
    copyPlugin.copyPlugin({ dest: "./dist/prisma/", src: "./prisma/" }),
    copyPlugin.copyPlugin({ dest: "./dist/compose.yml", src: "./compose.yml" }),
    copyPlugin.copyPlugin({ dest: "./dist/Dockerfile", src: "./Dockerfile" }),
  ],
  target: "esnext",
});

// eslint-disable-next-line no-console
console.log("⚡ Done"); // Put to console for debugging purposes

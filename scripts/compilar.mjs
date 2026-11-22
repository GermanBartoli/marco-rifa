import { build } from "esbuild";
await build({
  entryPoints: ["src/servidor.ts"],
  outfile: "dist/worker.mjs",
  bundle: true,
  format: "esm",
  target: "es2022",
  loader: {
    ".sql": "text",
    ".css": "text",
    ".html": "text",
    ".webp": "binary",
  },
});

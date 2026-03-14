import { $ } from "bun";

const isWatch = process.argv.includes("--watch");

async function build() {
  console.log("Building extension...");

  // Clean and create dist directory
  await $`rm -rf dist`.quiet();
  await $`mkdir -p dist/icons`.quiet();

  // Bundle background script
  const backgroundResult = await Bun.build({
    entrypoints: ["./src/background/index.ts"],
    outdir: "./dist/background",
    target: "browser",
    minify: !isWatch,
    sourcemap: isWatch ? "inline" : undefined,
    naming: "background.js",
  });

  if (!backgroundResult.success) {
    console.error("Background build failed:", backgroundResult.logs);
    process.exit(1);
  }

  // Bundle content script
  const contentResult = await Bun.build({
    entrypoints: ["./src/content/index.ts"],
    outdir: "./dist/content",
    target: "browser",
    minify: !isWatch,
    sourcemap: isWatch ? "inline" : undefined,
    naming: "content.js",
  });

  if (!contentResult.success) {
    console.error("Content build failed:", contentResult.logs);
    process.exit(1);
  }

  // Move bundled files to dist root
  await $`mv dist/background/background.js dist/`.quiet();
  await $`mv dist/content/content.js dist/`.quiet();
  await $`rm -rf dist/background dist/content`.quiet();

  // Copy static files
  await $`cp manifest.json dist/`.quiet();
  await $`cp -r public/icons/* dist/icons/ 2>/dev/null || true`.quiet();

  console.log("Build complete! Load dist/ folder in Chrome");
}

if (isWatch) {
  console.log("Watching for changes...");
  // For watch mode, we'd need to set up file watching
  // For MVP, just run build once
}

build();
